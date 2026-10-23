import { internalMutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { hashToken } from "./lib/reviewRules"

export const getWindow = internalQuery({
  args: { phoneHash: v.string() },
  handler: async (ctx, args) => (await ctx.db.query("waWindows").withIndex("by_phone_hash", (q) => q.eq("phoneHash", args.phoneHash)).unique())?.lastInboundAt,
})

export const hasDeliveryAttempt = internalQuery({
  args: { kind: v.string(), idempotencyKey: v.string() },
  handler: async (ctx, args) => Boolean(await ctx.db.query("waDeliveryLog").withIndex("by_kind_and_idempotency", (q) => q.eq("kind", args.kind).eq("idempotencyKey", args.idempotencyKey)).take(1)),
})

export const recordInbound = internalMutation({
  args: { phone: v.string(), at: v.number() },
  handler: async (ctx, args) => {
    const phoneHash = await hashToken(args.phone)
    const existing = await ctx.db.query("waWindows").withIndex("by_phone_hash", (q) => q.eq("phoneHash", phoneHash)).unique()
    if (existing) await ctx.db.patch("waWindows", existing._id, { lastInboundAt: args.at })
    else await ctx.db.insert("waWindows", { phoneHash, lastInboundAt: args.at })
    return null
  },
})

export const recordDelivery = internalMutation({
  args: {
    kind: v.string(), phoneHash: v.string(), at: v.number(), mode: v.union(v.literal("text"), v.literal("template"), v.literal("skipped")), ok: v.boolean(), errorCode: v.optional(v.string()), idempotencyKey: v.string(), externalMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("waDeliveryLog").withIndex("by_kind_and_idempotency", (q) => q.eq("kind", args.kind).eq("idempotencyKey", args.idempotencyKey)).take(1)
    if (existing.length > 0) return null
    await ctx.db.insert("waDeliveryLog", args)
    return null
  },
})

export const incrementStats = internalMutation({
  args: { date: v.string(), kind: v.string(), mode: v.union(v.literal("text"), v.literal("template")) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("waDailyStats").withIndex("by_date", (q) => q.eq("date", args.date)).unique()
    if (!existing) {
      await ctx.db.insert("waDailyStats", { date: args.date, templateCount: args.mode === "template" ? 1 : 0, byKind: args.mode === "template" ? { [args.kind]: 1 } : {}, textCount: args.mode === "text" ? 1 : 0 })
      return null
    }
    const byKind = { ...existing.byKind }
    if (args.mode === "template") byKind[args.kind] = (byKind[args.kind] ?? 0) + 1
    await ctx.db.patch("waDailyStats", existing._id, { templateCount: existing.templateCount + (args.mode === "template" ? 1 : 0), byKind, textCount: existing.textCount + (args.mode === "text" ? 1 : 0) })
    return null
  },
})

export const recordStatus = internalMutation({
  args: { externalMessageId: v.string(), ok: v.boolean(), errorCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("waDeliveryLog").withIndex("by_external_message_id", (q) => q.eq("externalMessageId", args.externalMessageId)).unique()
    if (row) await ctx.db.patch("waDeliveryLog", row._id, { ok: args.ok, errorCode: args.errorCode })
    return null
  },
})

export const cleanupWindows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    let deleted = 0
    for (const row of await ctx.db.query("waWindows").take(500)) if (row.lastInboundAt < cutoff) { await ctx.db.delete("waWindows", row._id); deleted += 1 }
    return { deleted }
  },
})
