import { cronJobs } from "convex/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, mutation } from "./_generated/server"
import { ensureChargesForPeriod } from "./rentCharges"
import { requireOwner } from "./lib/auth"
import { dueDateForPeriod, periodOf } from "../lib/rent-date"

export const runDailyReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date()
    const todayDate = today.toISOString().slice(0, 10)
    await ensureChargesForPeriod(ctx, today.getTime())

    // Only active, BULANAN tenants get monthly reminder — skip tahunan
    const tenants = await ctx.db.query("tenants").withIndex("by_status_and_due_day", (q) => q.eq("status", "active")).take(500)
    let logged = 0

    for (const tenant of tenants) {
      // Skip tahunan tenants — they have a separate reminder (not implemented yet per spec)
      if (tenant.payment_type === "tahunan") continue

      const room = await ctx.db.get("rooms", tenant.roomId)
      const property = await ctx.db.get("properties", tenant.propertyId)
      if (!property || !room) continue

      const period = periodOf(today)
      const charge = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenant._id).eq("period", period)).unique()
      if (charge?.status === "paid") continue

      const due = new Date(dueDateForPeriod(period, tenant.dueDay))
      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

      let type: "reminder_due" | "reminder_today" | "reminder_overdue" | null = null
      let messageText = ""

      if (diffDays === 3 || diffDays === 7) {
        type = "reminder_due"
        messageText = `🔔 Pengingat Sewa (H-${diffDays})\n${property.name} · Kamar ${room.roomNumber}\nPenyewa: ${tenant.name}\nJatuh tempo sewa ${period}: ${due.toLocaleDateString("id-ID")}\nNominal: Rp ${room.monthlyRent.toLocaleString("id-ID")}`
      } else if (diffDays === 0) {
        type = "reminder_today"
        messageText = `⏰ Tagihan Sewa Jatuh Tempo Hari Ini\n${property.name} · Kamar ${room.roomNumber}\nPenyewa: ${tenant.name}\nTagihan sewa periode ${period} jatuh tempo hari ini (${due.toLocaleDateString("id-ID")}).\nNominal: Rp ${room.monthlyRent.toLocaleString("id-ID")}`
      } else if (diffDays < 0) {
        type = "reminder_overdue"
        messageText = `⚠️ Peringatan Sewa Menunggak (Overdue ${Math.abs(diffDays)} Hari)\n${property.name} · Kamar ${room.roomNumber}\nPenyewa: ${tenant.name}\nJatuh tempo tanggal ${due.toLocaleDateString("id-ID")} belum dibayar.\nNominal: Rp ${room.monthlyRent.toLocaleString("id-ID")}`
      }

      if (!type) continue

      const existing = (await ctx.db.query("notification_log").withIndex("by_tenant_and_type_and_date", (q) => q.eq("tenantId", tenant._id)).take(100)).find((item) => item.type === type && item.occurredOn === todayDate)
      if (existing) continue

      await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type, occurredOn: todayDate, channel: "telegram", status: "logged", payload: JSON.stringify({ tenantName: tenant.name, dueDay: tenant.dueDay, period }) })
      await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: property.ownerId, text: messageText })
      logged += 1
    }
    return { logged }
  },
})

export const processSubscriptionPeriods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const subscriptions = await ctx.db.query("subscriptions").withIndex("by_status", (q) => q.eq("status", "active")).take(100)
    let processed = 0
    for (const subscription of subscriptions) {
      if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd >= now) continue
      await ctx.db.patch("subscriptions", subscription._id, { status: "past_due" })
      const occurredOn = new Date(subscription.currentPeriodEnd).toISOString().slice(0, 10)
      const existing = (await ctx.db.query("notification_log").withIndex("by_owner_and_type", (q) => q.eq("ownerId", subscription.ownerId)).take(100)).find((item) => item.type === "subscription_past_due" && item.occurredOn === occurredOn)
      if (!existing) {
        await ctx.db.insert("notification_log", { ownerId: subscription.ownerId, type: "subscription_past_due", channel: "log_only", occurredOn, status: "logged", payload: JSON.stringify({ subscriptionId: subscription._id }) })
        await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: subscription.ownerId, text: "Subscription Anda sudah melewati masa aktif. Silakan hubungi admin untuk memperpanjang langganan." })
        processed += 1
      }
    }
    return { processed }
  },
})

export const simulateReminder = mutation({
  args: {
    tenantId: v.optional(v.id("tenants")),
    scenario: v.union(v.literal("due_soon"), v.literal("due_today"), v.literal("overdue")),
  },
  handler: async (ctx, args) => {
    let owner = null
    try {
      owner = await requireOwner(ctx)
    } catch {
      const activeLink = (await ctx.db.query("bot_links").take(10)).find((l) => l.status === "active")
      if (activeLink) owner = await ctx.db.get("owners", activeLink.ownerId)
      if (!owner) owner = await ctx.db.query("owners").first()
    }
    if (!owner) throw new Error("Tidak ditemukan akun owner di database.")

    let tenant = args.tenantId ? await ctx.db.get("tenants", args.tenantId) : null
    if (!tenant) {
      const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(10)
      for (const p of properties) {
        const found = (await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", p._id)).take(10)).find((t) => t.status === "active")
        if (found) { tenant = found; break }
      }
    }
    if (!tenant) throw new Error("Tidak ada tenant aktif untuk disimulasikan.")

    const room = await ctx.db.get("rooms", tenant.roomId)
    const property = await ctx.db.get("properties", tenant.propertyId)
    if (!property || !room) throw new Error("Data properti atau kamar tenant tidak lengkap.")

    const today = new Date()
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

    let text = ""
    let type: "reminder_due" | "reminder_today" | "reminder_overdue" = "reminder_due"

    if (args.scenario === "due_soon") {
      type = "reminder_due"
      text = `[SIMULASI] 🔔 Pengingat Sewa (H-3)\n${property.name} · Kamar ${room.roomNumber}\nPenyewa: ${tenant.name}\nSewa periode ${period} akan jatuh tempo 3 hari lagi (Tgl ${tenant.dueDay}).\nNominal: Rp ${room.monthlyRent.toLocaleString("id-ID")}`
    } else if (args.scenario === "due_today") {
      type = "reminder_today"
      text = `[SIMULASI] ⏰ Tagihan Sewa Jatuh Tempo Hari Ini\n${property.name} · Kamar ${room.roomNumber}\nPenyewa: ${tenant.name}\nTagihan sewa periode ${period} jatuh tempo hari ini.\nStatus: Menunggu Pembayaran\nNominal: Rp ${room.monthlyRent.toLocaleString("id-ID")}`
    } else {
      type = "reminder_overdue"
      text = `[SIMULASI] ⚠️ Peringatan Sewa Menunggak (Overdue 2 Hari)\n${property.name} · Kamar ${room.roomNumber}\nPenyewa: ${tenant.name}\nJatuh tempo sewa tgl 30 September belum dibayar (Terlambat 2 hari).\nStatus: Menunggak\nNominal: Rp ${room.monthlyRent.toLocaleString("id-ID")}`
    }

    await ctx.db.insert("notification_log", {
      ownerId: owner._id,
      propertyId: property._id,
      tenantId: tenant._id,
      type,
      occurredOn: new Date().toISOString().slice(0, 10),
      channel: "telegram",
      status: "logged",
      payload: JSON.stringify({ scenario: args.scenario, tenantName: tenant.name }),
    })

    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: owner._id, text })
    return { success: true, scenario: args.scenario, tenant: tenant.name, property: property.name, room: room.roomNumber }
  },
})

const crons = cronJobs()
crons.interval("daily payment reminders", { hours: 24 }, internal.crons.runDailyReminders, {})
crons.interval("daily subscription periods", { hours: 24 }, internal.crons.processSubscriptionPeriods, {})
crons.interval("expire locked DP bookings", { hours: 24 }, internal.bookings.expireLocked, {})
crons.interval("process settlement deadlines", { hours: 24 }, internal.bookings.processSettlementDeadlines, {})
crons.interval("process tenant lifecycle", { hours: 24 }, internal.tenants.processLifecycle, {})
export default crons
