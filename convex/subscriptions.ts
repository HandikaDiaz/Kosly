import { internalMutation, mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { requireOwner } from "./lib/auth"
import { getTierForRoomCount, getTierLimits, getTierPrice, tierRank, type BillingCycle, type SubscriptionTier } from "./lib/subscription_tiers"

const tierValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("pro"))
const cycleValidator = v.union(v.literal("monthly"), v.literal("annual"), v.literal("none"))

export const recalculateForOwner = mutation({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    if (owner._id !== args.ownerId) throw new Error("Akses subscription ditolak.")
    return await recalculateForOwnerInContext(ctx, args.ownerId)
  },
})

export const recalculateForOwnerInContext = async (ctx: MutationCtx, ownerId: Id<"owners">) => {
  const roomCount = await getRoomCountForOwner(ctx, ownerId)
  const recommendedTier = getTierForRoomCount(roomCount)
  let subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique()
  if (!subscription) {
    const subscriptionId = await ctx.db.insert("subscriptions", { ownerId, tier: "free", billingCycle: "none", priceAmount: 0, status: "active", roomCountAtLastCheck: roomCount })
    subscription = await ctx.db.get("subscriptions", subscriptionId)
  } else {
    await ctx.db.patch("subscriptions", subscription._id, { roomCountAtLastCheck: roomCount })
  }
  if (!subscription) throw new Error("Subscription gagal dibuat.")
  const activeTier = getEffectiveTier(subscription)
  return { roomCount, activeTier, recommendedTier, shouldNotify: tierRank[recommendedTier] > tierRank[activeTier] }
}

export const getEffectiveTier = (subscription: Doc<"subscriptions"> | null): SubscriptionTier => subscription?.status === "active" ? subscription.tier : "free"

const getSubscriptionForOwner = async (ctx: Pick<QueryCtx, "db">, ownerId: Id<"owners">) => {
  const subscriptions = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(10)
  return subscriptions.find((subscription) => subscription.status === "active") ?? subscriptions[0] ?? null
}

export const assertRoomCapacityForOwner = async (ctx: Pick<QueryCtx, "db">, ownerId: Id<"owners">, roomsToAdd = 1) => {
  const roomCount = await getRoomCountForOwner(ctx, ownerId)
  const subscription = await getSubscriptionForOwner(ctx, ownerId)
  const tier = getEffectiveTier(subscription)
  const limit = getTierLimits(tier).maxRooms
  if (limit !== null && roomCount + roomsToAdd > limit) {
    const nextTier = tier === "free" ? "Starter" : tier === "starter" ? "Growth" : "Pro"
    throw new Error("Tier " + tier[0].toUpperCase() + tier.slice(1) + " maksimal " + limit + " kamar. Saat ini sudah ada " + roomCount + " kamar. Upgrade ke " + nextTier + " untuk menambah kamar.")
  }
  return { tier, roomCount, limit }
}

export const assertPropertyCapacityForOwner = async (ctx: Pick<QueryCtx, "db">, ownerId: Id<"owners">, propertiesToAdd = 1) => {
  const propertyCount = (await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(50)).length
  const subscription = await getSubscriptionForOwner(ctx, ownerId)
  const tier = getEffectiveTier(subscription)
  const limit = getTierLimits(tier).maxProperties
  if (limit !== null && propertyCount + propertiesToAdd > limit) {
    const nextTier = tier === "free" ? "Starter" : tier === "starter" ? "Growth" : "Pro"
    throw new Error("Tier " + tier[0].toUpperCase() + tier.slice(1) + " maksimal " + limit + " properti. Upgrade ke " + nextTier + " untuk menambah properti.")
  }
  return { tier, propertyCount, limit }
}

export const getRoomCountForOwner = async (ctx: Pick<QueryCtx, "db">, ownerId: Id<"owners">) => {
  const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(50)
  let roomCount = 0
  for (const property of properties) {
    roomCount += (await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(500)).length
  }
  return roomCount
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const subscription = await getSubscriptionForOwner(ctx, owner._id)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    let roomCount = 0
    for (const property of properties) {
      roomCount += (await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(500)).length
    }
    const activeTier = getEffectiveTier(subscription)
    const recommendedTier = getTierForRoomCount(roomCount)
    const roomLimit = getTierLimits(activeTier).maxRooms
    const propertyLimit = getTierLimits(activeTier).maxProperties
    return { subscription, roomCount, propertyCount: properties.length, activeTier, recommendedTier, roomLimit, propertyLimit, roomLimitReached: roomLimit !== null && roomCount >= roomLimit, propertyLimitReached: propertyLimit !== null && properties.length >= propertyLimit, upgradeRequired: tierRank[recommendedTier] > tierRank[activeTier] }
  },
})

export const submitPaymentForOwner = async (ctx: MutationCtx, ownerId: Id<"owners">, args: { tier: Exclude<SubscriptionTier, "free">; billingCycle: Exclude<BillingCycle, "none">; proofStorageId: Id<"_storage"> }) => {
    const proof = await ctx.db.system.get("_storage", args.proofStorageId)
    if (!proof || (proof.contentType && !proof.contentType.startsWith("image/"))) throw new Error("Bukti transfer harus berupa gambar.")
    const priceAmount = getTierPrice(args.tier, args.billingCycle)
    const existing = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique()
    const payload = { tier: args.tier, billingCycle: args.billingCycle, priceAmount, status: "pending_payment" as const, proofStorageId: args.proofStorageId, rejectionReason: undefined }
    if (existing) await ctx.db.patch("subscriptions", existing._id, payload)
    else await ctx.db.insert("subscriptions", { ownerId, roomCountAtLastCheck: 0, ...payload })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendAdminQueueNotice, { text: "📥 <b>Pembayaran langganan baru</b> menunggu review. Gunakan /pending untuk melihat ID antrean." })
    return null
}

export const submitPayment = mutation({
  args: { tier: tierValidator, billingCycle: cycleValidator, proofStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    if (args.tier === "free" || args.billingCycle === "none") throw new Error("Pilih tier berbayar dan siklus tagihan.")
    return await submitPaymentForOwner(ctx, owner._id, { tier: args.tier, billingCycle: args.billingCycle, proofStorageId: args.proofStorageId })
  },
})

export const submitPaymentFromBot = internalMutation({
  args: { ownerId: v.id("owners"), sessionId: v.id("bot_sessions"), tier: v.union(v.literal("starter"), v.literal("growth"), v.literal("pro")), billingCycle: v.union(v.literal("monthly"), v.literal("annual")), proofStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await submitPaymentForOwner(ctx, args.ownerId, args)
    await ctx.db.patch("bot_sessions", args.sessionId, { status: "completed" })
    return null
  },
})

/**
 * Internal: Enforce property lock/unlock based on the effective tier limit.
 *
 * On downgrade → lock excess properties (keep the N newest based on _creationTime desc).
 * On upgrade   → unlock any properties previously locked by tier up to the new limit.
 *
 * "lockedByTier" is a system flag — independent of owner-controlled "isActive".
 */
export const enforcePropertyTierLock = internalMutation({
  args: { ownerId: v.id("owners"), newTier: tierValidator },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .take(50)

    const limit = getTierLimits(args.newTier).maxProperties
    // Sort newest first (descending _creationTime) — newest N are kept accessible
    const sorted = [...properties].sort((a, b) => b._creationTime - a._creationTime)

    let locked = 0
    let unlocked = 0

    for (let i = 0; i < sorted.length; i++) {
      const property = sorted[i]
      const shouldLock = limit !== null && i >= limit
      const currentlyLocked = property.lockedByTier === true

      if (shouldLock && !currentlyLocked) {
        await ctx.db.patch("properties", property._id, { lockedByTier: true })
        locked++
      } else if (!shouldLock && currentlyLocked) {
        await ctx.db.patch("properties", property._id, { lockedByTier: false })
        unlocked++
      }
    }

    return { locked, unlocked }
  },
})
