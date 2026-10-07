import { mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { v } from "convex/values"
import { requireOwner } from "./lib/auth"
import { getTierForRoomCount, getTierPrice, tierRank, type BillingCycle, type SubscriptionTier } from "./lib/subscription-tiers"

const tierValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("pro"))
const cycleValidator = v.union(v.literal("monthly"), v.literal("annual"), v.literal("none"))

export const recalculateForOwner = mutation({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => recalculateForOwnerInContext(ctx, args.ownerId),
})

export const recalculateForOwnerInContext = async (ctx: MutationCtx, ownerId: Id<"owners">) => {
  const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(50)
  let roomCount = 0
  for (const property of properties) roomCount += (await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(500)).length
  const recommendedTier = getTierForRoomCount(roomCount)
  let subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique()
  if (!subscription) {
    const subscriptionId = await ctx.db.insert("subscriptions", { ownerId, tier: "free", billingCycle: "none", priceAmount: 0, status: "active", roomCountAtLastCheck: roomCount })
    subscription = await ctx.db.get("subscriptions", subscriptionId)
  } else {
    await ctx.db.patch("subscriptions", subscription._id, { roomCountAtLastCheck: roomCount })
  }
  if (!subscription) throw new Error("Subscription gagal dibuat.")
  return { roomCount, activeTier: subscription.tier, recommendedTier, shouldNotify: tierRank[recommendedTier] > tierRank[subscription.tier] }
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).unique()
    const roomCount = subscription?.roomCountAtLastCheck ?? 0
    const activeTier = subscription?.tier ?? "free"
    const recommendedTier = getTierForRoomCount(roomCount)
    return { subscription, roomCount, activeTier, recommendedTier, upgradeRequired: tierRank[recommendedTier] > tierRank[activeTier] }
  },
})

export const submitPayment = mutation({
  args: { tier: tierValidator, billingCycle: cycleValidator, proofStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    if (args.tier === "free" || args.billingCycle === "none") throw new Error("Pilih tier berbayar dan siklus tagihan.")
    const proof = await ctx.db.system.get("_storage", args.proofStorageId)
    if (!proof || (proof.contentType && !proof.contentType.startsWith("image/"))) throw new Error("Bukti transfer harus berupa gambar.")
    const priceAmount = getTierPrice(args.tier as SubscriptionTier, args.billingCycle as BillingCycle)
    const existing = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).unique()
    const payload = { tier: args.tier, billingCycle: args.billingCycle, priceAmount, status: "pending_payment" as const, proofStorageId: args.proofStorageId, rejectionReason: undefined }
    if (existing) await ctx.db.patch("subscriptions", existing._id, payload)
    else await ctx.db.insert("subscriptions", { ownerId: owner._id, roomCountAtLastCheck: 0, ...payload })
    return null
  },
})
