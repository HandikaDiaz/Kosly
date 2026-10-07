import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOwner } from "./lib/auth"

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
const periodOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

export const listMine = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    const rows = (await Promise.all(properties.map(async (property) => {
      const tenants = await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
      return await Promise.all(tenants.filter((tenant) => tenant.status === "active").map(async (tenant) => {
        const [room, charges] = await Promise.all([
          ctx.db.get("rooms", tenant.roomId),
          ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenant._id)).take(24),
        ])
        const currentPeriod = periodOf(new Date(args.now))
        const currentCharge = charges.find((charge) => charge.period === currentPeriod)
        const unpaidCharge = charges.filter((charge) => charge.status === "unpaid").sort((a, b) => a.dueDate - b.dueDate)[0]
        const nextMonth = new Date(args.now)
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
        const nextMonthLastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
        const nextPeriodDueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(tenant.dueDay, nextMonthLastDay), 23, 59, 59, 999).getTime()
        const nextDueDate = unpaidCharge?.dueDate ?? (currentCharge?.status === "paid" ? nextPeriodDueDate : currentCharge?.dueDate ?? nextPeriodDueDate)
        return { tenant, property, room, currentCharge: currentCharge ?? null, nextDueDate, unpaidCount: charges.filter((charge) => charge.status === "unpaid").length }
      }))
    }))).flat()
    return rows.sort((a, b) => a.nextDueDate - b.nextDueDate)
  },
})

export const getTenantForPayment = query({
  args: { slug: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    if (!property || !property.isActive) return null
    const normalizedPhone = args.phone.replace(/[^0-9]/g, "")
    const tenants = await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
    const tenant = tenants.find((item) => item.phone.replace(/[^0-9]/g, "") === normalizedPhone && item.status === "active")
    if (!tenant) return null
    const room = await ctx.db.get("rooms", tenant.roomId)
    if (!room) return null
    const charges = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenant._id)).take(24)
    const unpaidCharge = charges.filter((charge) => charge.status === "unpaid").sort((a, b) => a.dueDate - b.dueDate)[0]
    return { tenantId: tenant._id, name: tenant.name, roomNumber: room.roomNumber, monthlyRent: room.monthlyRent, dueDate: unpaidCharge?.dueDate ?? Date.now() + 30 * 24 * 60 * 60 * 1000, period: unpaidCharge?.period ?? periodOf(new Date(Date.now())) }
  },
})

export const submitRentPayment = mutation({
  args: { slug: v.string(), tenantId: v.id("tenants"), amount: v.number(), dueDate: v.number(), billingPeriod: v.string(), proofStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    if (!property || !property.isActive) throw new Error("Link properti tidak ditemukan.")
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant || tenant.propertyId !== property._id || tenant.status !== "active") throw new Error("Data tenant tidak valid.")
    const proof = await ctx.db.system.get("_storage", args.proofStorageId)
    if (!proof || !proof.contentType?.startsWith("image/")) throw new Error("Bukti pembayaran harus berupa gambar.")
    if (!Number.isFinite(args.amount) || args.amount <= 0) throw new Error("Nominal pembayaran belum valid.")
    const paymentId = await ctx.db.insert("payments", { propertyId: property._id, tenantId: tenant._id, roomId: tenant.roomId, amount: args.amount, paymentType: "full", paidAt: Date.now(), dueDate: args.dueDate, billingPeriod: args.billingPeriod, status: "pending_review", proofStorageId: args.proofStorageId })
    await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "payment_uploaded", channel: "log_only", occurredOn: new Date().toISOString().slice(0, 10), status: "logged", payload: JSON.stringify({ paymentId, tenantName: tenant.name }) })
    return { paymentId }
  },
})
