import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin } from "./lib/auth"

const monthEnd = (timestamp: number, months: number) => {
  const date = new Date(timestamp)
  date.setMonth(date.getMonth() + months)
  return date.getTime()
}

export const getBillingOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const subscriptions = await ctx.db.query("subscriptions").take(100)
    const owners = await ctx.db.query("owners").take(100)
    const ownerById = new Map(owners.map((owner) => [owner._id, owner]))
    const pending = await Promise.all(subscriptions.filter((item) => item.status === "pending_payment").map(async (subscription) => ({ subscription, owner: ownerById.get(subscription.ownerId) ?? null, proofUrl: subscription.proofStorageId ? await ctx.storage.getUrl(subscription.proofStorageId) : null })))
    const pastDue = subscriptions.filter((item) => item.status === "past_due").map((subscription) => ({ subscription, owner: ownerById.get(subscription.ownerId) ?? null }))
    const subscribedOwnerIds = new Set(subscriptions.map((subscription) => subscription.ownerId))
    const tierCounts = subscriptions.reduce<Record<string, number>>((counts, subscription) => { counts[subscription.tier] = (counts[subscription.tier] ?? 0) + 1; return counts }, {})
    tierCounts.free = (tierCounts.free ?? 0) + owners.filter((owner) => !subscribedOwnerIds.has(owner._id)).length
    const monthlyRevenue = subscriptions.filter((item) => item.status === "active" && item.tier !== "free").reduce((total, item) => total + (item.billingCycle === "annual" ? item.priceAmount / 12 : item.priceAmount), 0)
    return { pending, pastDue, tierCounts, monthlyRevenue }
  },
})

export const approveSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const subscription = await ctx.db.get("subscriptions", args.subscriptionId)
    if (!subscription || subscription.status !== "pending_payment") throw new Error("Subscription tidak sedang menunggu review.")
    const now = Date.now()
    const currentPeriodEnd = monthEnd(now, subscription.billingCycle === "annual" ? 12 : 1)
    await ctx.db.patch("subscriptions", subscription._id, { status: "active", currentPeriodEnd, reviewedByOwnerId: admin._id, reviewedAt: now, rejectionReason: undefined })
    return { currentPeriodEnd }
  },
})

export const rejectSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions"), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const reason = args.reason.trim()
    if (!reason) throw new Error("Alasan penolakan wajib diisi.")
    const subscription = await ctx.db.get("subscriptions", args.subscriptionId)
    if (!subscription || subscription.status !== "pending_payment") throw new Error("Subscription tidak sedang menunggu review.")
    await ctx.db.patch("subscriptions", subscription._id, { status: "canceled", reviewedByOwnerId: admin._id, reviewedAt: Date.now(), rejectionReason: reason })
    return null
  },
})

export const getVerificationOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const owners = await ctx.db.query("owners").take(100)
    const properties = await ctx.db.query("properties").take(100)
    return { identity: owners.filter((owner) => owner.identityVerificationStatus === "pending_review"), properties: properties.filter((property) => property.propertyVerificationStatus === "pending_review") }
  },
})

export const getReportsOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).take(100)
  },
})
