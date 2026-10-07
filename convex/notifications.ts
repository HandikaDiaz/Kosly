import { internalMutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

export const log = internalMutation({
  args: { ownerId: v.id("owners"), propertyId: v.optional(v.id("properties")), tenantId: v.optional(v.id("tenants")), type: v.union(v.literal("payment_uploaded"), v.literal("reminder_due"), v.literal("reminder_overdue"), v.literal("dp_expired")), occurredOn: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const existing = args.tenantId ? (await ctx.db.query("notification_log").withIndex("by_tenant_and_type_and_date", (q) => q.eq("tenantId", args.tenantId)).take(100)).find((item) => item.type === args.type && item.occurredOn === args.occurredOn) : null
    if (existing) return { status: "skipped" as const, id: existing._id }
    const id = await ctx.db.insert("notification_log", { ...args, channel: "log_only", status: "logged", payload: args.payload })
    return { status: "logged" as const, id }
  },
})

export const getPaymentReview = internalQuery({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("payments", args.paymentId)
    if (!payment) return null
    const property = await ctx.db.get("properties", payment.propertyId)
    const room = await ctx.db.get("rooms", payment.roomId)
    const tenant = await ctx.db.get("tenants", payment.tenantId)
    if (!property || !room || !tenant) return null
    const links = await ctx.db.query("bot_links").withIndex("by_owner_and_channel", (q) => q.eq("ownerId", property.ownerId)).take(10)
    return { paymentId: payment._id, propertyName: property.name, roomNumber: room.roomNumber, tenantName: tenant.name, amount: payment.amount, ownerId: property.ownerId, proofUrl: payment.proofStorageId ? await ctx.storage.getUrl(payment.proofStorageId) : null, links }
  },
})

export const getOwnerBotLinks = internalQuery({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => ctx.db.query("bot_links").withIndex("by_owner_and_channel", (q) => q.eq("ownerId", args.ownerId)).take(10),
})

export const recordDelivery = internalMutation({
  args: { paymentId: v.id("payments"), ownerId: v.id("owners"), channel: v.union(v.literal("telegram"), v.literal("whatsapp")), status: v.union(v.literal("logged"), v.literal("failed")), externalMessageId: v.optional(v.string()), errorMessage: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("payments", args.paymentId)
    if (!payment) return null
    await ctx.db.insert("notification_log", { ownerId: args.ownerId, propertyId: payment.propertyId, tenantId: payment.tenantId, type: "payment_uploaded", channel: args.channel, occurredOn: new Date().toISOString().slice(0, 10), status: args.status, payload: JSON.stringify({ paymentId: String(args.paymentId) }), externalMessageId: args.externalMessageId, errorMessage: args.errorMessage })
    return null
  },
})

export type PaymentReviewId = Id<"payments">
