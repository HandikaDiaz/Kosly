import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { requirePropertyOwner, requireOwner } from "./lib/auth"
import { dueDateForPeriod, periodOf } from "../lib/rent-date"
import { REVIEW_INVITE_DELAY_AFTER_MOVEOUT_HOURS } from "./lib/reviewRules"

export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    return await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100)
  },
})

export const getMine = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant) return null
    await requirePropertyOwner(ctx, tenant.propertyId)
    const room = await ctx.db.get("rooms", tenant.roomId)
    const charges = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenant._id)).collect()
    const now = Date.now()
    const today = new Date(now)
    const currentPeriod = periodOf(today)
    const currentCharge = charges.find((c) => c.period === currentPeriod)
    const isCurrentPeriodPaid = currentCharge?.status === "paid"
    const unpaidCharges = charges.filter((c) => c.status === "unpaid")

    let realDueDate: number
    if (unpaidCharges.length > 0) {
      unpaidCharges.sort((a, b) => a.dueDate - b.dueDate)
      realDueDate = unpaidCharges[0].dueDate
    } else {
      const targetDate = new Date(today)
      if (isCurrentPeriodPaid) targetDate.setMonth(targetDate.getMonth() + 1)
      realDueDate = dueDateForPeriod(periodOf(targetDate), tenant.dueDay)
    }

    return {
      ...tenant,
      room,
      currentPeriod,
      isCurrentPeriodPaid,
      realDueDate,
      unpaidChargesCount: unpaidCharges.length,
    }
  },
})

export const updateLeaseDecision = mutation({
  args: { tenantId: v.id("tenants"), decision: v.union(v.literal("undecided"), v.literal("continue"), v.literal("not_continuing")), leaseEndsAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant) throw new Error("Tenant tidak ditemukan.")
    await requirePropertyOwner(ctx, tenant.propertyId)
    const room = await ctx.db.get("rooms", tenant.roomId)
    if (!room) throw new Error("Kamar tenant tidak ditemukan.")
    if (args.decision === "not_continuing") {
      await ctx.db.patch("tenants", tenant._id, { status: "inactive", leaseDecision: args.decision, leaseEndsAt: args.leaseEndsAt })
      if (room.status === "occupied") await ctx.db.patch("rooms", room._id, { status: "available" })
    } else {
      await ctx.db.patch("tenants", tenant._id, { status: args.decision === "continue" ? "active" : tenant.status, leaseDecision: args.decision, leaseEndsAt: args.leaseEndsAt })
    }
    return null
  },
})

/**
 * Owner-only: set lifecycle_status to "akan_pindah" with move_out_date.
 * Billing continues normally until move_out_date is reached by the cron.
 */
export const setLifecycleStatus = mutation({
  args: {
    tenantId: v.id("tenants"),
    lifecycle_status: v.union(v.literal("akan_pindah"), v.literal("active")),
    move_out_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant) throw new Error("Tenant tidak ditemukan.")
    await requirePropertyOwner(ctx, tenant.propertyId)

    if (args.lifecycle_status === "akan_pindah") {
      if (!args.move_out_date) throw new Error("Tanggal pindah wajib diisi.")
      await ctx.db.patch("tenants", tenant._id, {
        lifecycle_status: "akan_pindah",
        move_out_date: args.move_out_date,
      })
    } else {
      // Revert back to active (e.g. owner cancels the notice)
      await ctx.db.patch("tenants", tenant._id, {
        lifecycle_status: "active",
        move_out_date: undefined,
      })
    }
    return null
  },
})

/**
 * Owner action after overdue flag:
 * "Tandai Kosong" — same effect as reaching move_out_date
 * "Masih Tunggu"  — clears nothing, just acknowledges. Reminders keep running.
 */
export const handleOverdueFlag = mutation({
  args: {
    tenantId: v.id("tenants"),
    action: v.union(v.literal("tandai_kosong"), v.literal("masih_tunggu")),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant) throw new Error("Tenant tidak ditemukan.")
    await requirePropertyOwner(ctx, tenant.propertyId)

    if (args.action === "tandai_kosong") {
      const room = await ctx.db.get("rooms", tenant.roomId)
      const now = Date.now()
      await ctx.db.patch("tenants", tenant._id, {
        status: "inactive",
        lifecycle_status: "moved_out",
        deposit_refund_status: "pending",
        deposit_refund_reminded_at: now,
      })
      try {
        await ctx.scheduler.runAfter(REVIEW_INVITE_DELAY_AFTER_MOVEOUT_HOURS * 60 * 60 * 1000, internal.reviewDelivery.sendReviewInvitation, { tenancyId: tenant._id, reason: "moveout" })
      } catch {
        // Scheduling the optional review invitation must not block move-out.
      }
      if (room && room.status === "occupied") {
        await ctx.db.patch("rooms", room._id, { status: "available" })
      }
      const property = await ctx.db.get("properties", tenant.propertyId)
      if (property && room && (room.depositFee ?? 0) > 0) {
        await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "deposit_refund_reminder", channel: "log_only", occurredOn: new Date(now).toISOString().slice(0, 10), status: "logged", payload: JSON.stringify({ tenantName: tenant.name, roomNumber: room.roomNumber, depositAmount: room.depositFee }) })
        await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: property.ownerId, text: `Kamar ${room.roomNumber} sudah kosong. Jangan lupa proses pengembalian deposit Rp${(room.depositFee ?? 0).toLocaleString("id-ID")} ke ${tenant.name}.` })
      }
    }
    // "masih_tunggu" → no state change, just return
    return null
  },
})

/**
 * Internal cron: process move_out_date arrivals and 5-day overdue flag.
 * Called daily by crons.ts.
 */
export const processLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const today = new Date(now)
    const todayDate = today.toISOString().slice(0, 10)
    let movedOut = 0
    let flagged = 0

    // ── Jalur A: Auto move_out on date arrival ──────────────────────────────
    const akan_pindah = await ctx.db.query("tenants").withIndex("by_lifecycle_and_move_out", (q) => q.eq("lifecycle_status", "akan_pindah")).take(200)
    for (const tenant of akan_pindah) {
      if (!tenant.move_out_date || tenant.move_out_date > now) continue
      const room = await ctx.db.get("rooms", tenant.roomId)
      const property = await ctx.db.get("properties", tenant.propertyId)
      await ctx.db.patch("tenants", tenant._id, { status: "inactive", lifecycle_status: "moved_out", deposit_refund_status: "pending", deposit_refund_reminded_at: now })
      try {
        await ctx.scheduler.runAfter(REVIEW_INVITE_DELAY_AFTER_MOVEOUT_HOURS * 60 * 60 * 1000, internal.reviewDelivery.sendReviewInvitation, { tenancyId: tenant._id, reason: "moveout" })
      } catch {
        // Scheduling the optional review invitation must not block move-out.
      }
      if (room && room.status === "occupied") await ctx.db.patch("rooms", room._id, { status: "available" })
      if (property) {
        await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "move_out_auto", channel: "log_only", occurredOn: todayDate, status: "logged", payload: JSON.stringify({ tenantName: tenant.name }) })
        if (room && (room.depositFee ?? 0) > 0) {
          const text = `Kamar ${room.roomNumber} sudah kosong. Jangan lupa proses pengembalian deposit Rp${(room.depositFee ?? 0).toLocaleString("id-ID")} ke ${tenant.name}.`
          await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "deposit_refund_reminder", channel: "telegram", occurredOn: todayDate, status: "logged", payload: JSON.stringify({ tenantName: tenant.name, roomNumber: room.roomNumber, depositAmount: room.depositFee }) })
          await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: property.ownerId, text })
        }
      }
      movedOut++
    }

    const pendingRefunds = await ctx.db.query("tenants").withIndex("by_lifecycle_and_refund_status", (q) => q.eq("lifecycle_status", "moved_out").eq("deposit_refund_status", "pending")).take(500)
    for (const tenant of pendingRefunds) {
      if (!tenant.deposit_refund_reminded_at || now - tenant.deposit_refund_reminded_at < 7 * 24 * 60 * 60 * 1000) continue
      const previousFollowup = (await ctx.db.query("notification_log").withIndex("by_tenant_and_type_and_date", (q) => q.eq("tenantId", tenant._id)).take(100)).some((item) => item.type === "deposit_refund_followup")
      if (previousFollowup) continue
      const room = await ctx.db.get("rooms", tenant.roomId)
      const property = await ctx.db.get("properties", tenant.propertyId)
      if (!room || !property || (room.depositFee ?? 0) <= 0) continue
      const text = `Pengingat refund deposit: Kamar ${room.roomNumber} sudah kosong lebih dari 7 hari. Proses pengembalian deposit Rp${(room.depositFee ?? 0).toLocaleString("id-ID")} ke ${tenant.name}.`
      await ctx.db.patch("tenants", tenant._id, { deposit_refund_reminded_at: now })
      await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "deposit_refund_followup", channel: "telegram", occurredOn: todayDate, status: "logged", payload: JSON.stringify({ tenantName: tenant.name, roomNumber: room.roomNumber, depositAmount: room.depositFee }) })
      await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: property.ownerId, text })
    }

    // ── Jalur B: Overdue 5-day flag (bulanan only) ──────────────────────────
    const active = await ctx.db.query("tenants").withIndex("by_status_and_due_day", (q) => q.eq("status", "active")).take(500)
    for (const tenant of active) {
      // Skip tahunan tenants
      if (tenant.payment_type === "tahunan") continue
      // Skip tenants already on "akan_pindah" (they have a notice)
      if (tenant.lifecycle_status === "akan_pindah") continue
      // Skip already flagged today
      if (tenant.flagged_overdue_at) {
        const flaggedDate = new Date(tenant.flagged_overdue_at).toISOString().slice(0, 10)
        if (flaggedDate === todayDate) continue
      }

      const period = periodOf(today)
      const charge = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenant._id).eq("period", period)).unique()

      // Check if due_date passed more than 5 days ago AND no confirmed payment this period
      if (!charge || charge.status === "paid") continue
      const overdueDays = Math.floor((now - charge.dueDate) / (24 * 60 * 60 * 1000))
      if (overdueDays < 5) continue

      // Already flagged (not re-flag every day once flagged)
      if (tenant.flagged_overdue_at) continue

      const property = await ctx.db.get("properties", tenant.propertyId)
      const room = await ctx.db.get("rooms", tenant.roomId)
      if (!property || !room) continue

      await ctx.db.patch("tenants", tenant._id, { flagged_overdue_at: now })
      await ctx.db.insert("notification_log", {
        ownerId: property.ownerId,
        propertyId: property._id,
        tenantId: tenant._id,
        type: "overdue_flag",
        channel: "log_only",
        occurredOn: todayDate,
        status: "logged",
        payload: JSON.stringify({ tenantName: tenant.name, roomNumber: room.roomNumber, overdueDays }),
      })
      flagged++
    }

    return { movedOut, flagged }
  },
})

export const setDepositRefundStatus = mutation({
  args: { tenantId: v.id("tenants"), status: v.union(v.literal("refunded"), v.literal("forfeited")) },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant) throw new Error("Tenant tidak ditemukan.")
    await requirePropertyOwner(ctx, tenant.propertyId)
    if (tenant.lifecycle_status !== "moved_out") throw new Error("Status refund hanya dapat diubah setelah tenant pindah.")
    await ctx.db.patch("tenants", tenant._id, { deposit_refund_status: args.status })
    return null
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    const tenants = (await Promise.all(properties.map((property) => ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)))).flat()
    return await Promise.all(tenants.map(async (tenant) => ({ tenant, property: properties.find((property) => property._id === tenant.propertyId) ?? null, room: await ctx.db.get("rooms", tenant.roomId) })))
  },
})
