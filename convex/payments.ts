import { internalMutation, mutation, query } from "./_generated/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { requirePropertyOwner, requireOwner } from "./lib/auth"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { confirmDepositForOwner, confirmSettlementForOwner } from "./bookings"
import { markCurrentPeriodPaid } from "./rentCharges"

export const confirmPaymentForOwner = async (ctx: MutationCtx, paymentId: Id<"payments">, ownerId: Id<"owners">) => {
  const payment = await ctx.db.get("payments", paymentId)
  if (!payment) throw new Error("Pembayaran tidak ditemukan.")
  if (payment.status !== "pending_review") throw new Error("Pembayaran ini sudah diputuskan.")
  const property = await ctx.db.get("properties", payment.propertyId)
  if (!property || property.ownerId !== ownerId) throw new Error("Akses pembayaran ditolak.")
  if (payment.bookingId && payment.paymentType === "dp") {
    await confirmDepositForOwner(ctx, payment.bookingId, payment._id, ownerId)
    return
  }
  if (payment.bookingId && payment.paymentType === "full") {
    await confirmSettlementForOwner(ctx, payment.bookingId, payment._id, ownerId)
    return
  }
  const room = await ctx.db.get("rooms", payment.roomId)
  const tenant = await ctx.db.get("tenants", payment.tenantId)
  if (!room || !tenant || room.propertyId !== payment.propertyId || tenant.roomId !== room._id) throw new Error("Data pembayaran tidak konsisten.")
  const now = Date.now()
  const date = new Date(payment.dueDate || payment.paidAt || now)
  const billingPeriod = payment.billingPeriod || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  if (tenant.status === "active") {
    await ctx.db.patch("payments", payment._id, { status: "confirmed", reviewerOwnerId: ownerId, reviewedAt: now, billingPeriod })
    await markCurrentPeriodPaid(ctx, tenant._id, payment._id, payment.amount, now, billingPeriod)
  } else {
    if (room.status !== "available") throw new Error("Kamar sudah tidak tersedia.")
    await ctx.db.patch("payments", payment._id, { status: "confirmed", reviewerOwnerId: ownerId, reviewedAt: now, billingPeriod })
    await ctx.db.patch("tenants", tenant._id, { status: "active" })
    await ctx.db.patch("rooms", room._id, { status: "occupied" })
    await markCurrentPeriodPaid(ctx, tenant._id, payment._id, payment.amount, now, billingPeriod)
  }
}

export const rejectPaymentForOwner = async (ctx: MutationCtx, paymentId: Id<"payments">, ownerId: Id<"owners">, reason: string) => {
  const payment = await ctx.db.get("payments", paymentId)
  if (!payment) throw new Error("Pembayaran tidak ditemukan.")
  if (payment.status !== "pending_review") throw new Error("Pembayaran ini sudah diputuskan.")
  const property = await ctx.db.get("properties", payment.propertyId)
  if (!property || property.ownerId !== ownerId) throw new Error("Akses pembayaran ditolak.")
  await ctx.db.patch("payments", payment._id, { status: "rejected", reviewerOwnerId: ownerId, reviewedAt: Date.now(), rejectionReason: reason.trim() || "Bukti belum dapat diverifikasi." })
}

export const listPendingForOwner = query({
  args: { propertyId: v.id("properties"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    return await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId)).filter((q) => q.eq(q.field("status"), "pending_review")).order("desc").paginate(args.paginationOpts)
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    const rows = (await Promise.all(properties.map((property) => ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(100)))).flat()
    return await Promise.all(rows.sort((a, b) => b.paidAt - a.paidAt).slice(0, 100).map(async (payment) => ({ payment, property: properties.find((property) => property._id === payment.propertyId) ?? null, tenant: await ctx.db.get("tenants", payment.tenantId), room: await ctx.db.get("rooms", payment.roomId), proofUrl: payment.proofStorageId ? await ctx.storage.getUrl(payment.proofStorageId) : null })))
  },
})

export const listForTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!tenant) return []
    await requirePropertyOwner(ctx, tenant.propertyId)
    return await ctx.db.query("payments").withIndex("by_tenant_and_paid_at", (q) => q.eq("tenantId", args.tenantId)).order("desc").take(100)
  },
})

export const getProofUrl = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("payments", args.paymentId)
    if (!payment) return null
    await requirePropertyOwner(ctx, payment.propertyId)
    return payment.proofStorageId ? await ctx.storage.getUrl(payment.proofStorageId) : null
  },
})

export const confirm = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("payments", args.paymentId)
    if (!payment) throw new Error("Pembayaran tidak ditemukan.")
    const { owner } = await requirePropertyOwner(ctx, payment.propertyId)
    await confirmPaymentForOwner(ctx, payment._id, owner._id)
    return null
  },
})

export const reject = mutation({
  args: { paymentId: v.id("payments"), reason: v.string() },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("payments", args.paymentId)
    if (!payment) throw new Error("Pembayaran tidak ditemukan.")
    const { owner } = await requirePropertyOwner(ctx, payment.propertyId)
    await rejectPaymentForOwner(ctx, payment._id, owner._id, args.reason)
    return null
  },
})
