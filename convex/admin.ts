import { mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { requireAdmin } from "./lib/auth"
import { createRoomForOwnerInContext } from "./rooms"
import { assertPropertyCapacityForOwner } from "./subscriptions"

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

export const approveSubscriptionForAdmin = async (ctx: MutationCtx, adminId: Id<"owners">, subscriptionId: Id<"subscriptions">) => {
    const subscription = await ctx.db.get("subscriptions", subscriptionId)
    if (!subscription || subscription.status !== "pending_payment") throw new Error("Subscription tidak sedang menunggu review.")
    const now = Date.now()
    const currentPeriodEnd = monthEnd(now, subscription.billingCycle === "annual" ? 12 : 1)
    await ctx.db.patch("subscriptions", subscription._id, { status: "active", currentPeriodEnd, reviewedByOwnerId: adminId, reviewedAt: now, rejectionReason: undefined })
    // Unlock any properties that were locked due to tier downgrade, up to the new tier's limit
    await ctx.scheduler.runAfter(0, internal.subscriptions.enforcePropertyTierLock, { ownerId: subscription.ownerId, newTier: subscription.tier })
    return { currentPeriodEnd }
}

export const approveSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => { const admin = await requireAdmin(ctx); return await approveSubscriptionForAdmin(ctx, admin._id, args.subscriptionId) },
})

export const rejectSubscriptionForAdmin = async (ctx: MutationCtx, adminId: Id<"owners">, subscriptionId: Id<"subscriptions">, reason: string) => {
    const trimmedReason = reason.trim()
    if (!trimmedReason) throw new Error("Alasan penolakan wajib diisi.")
    const subscription = await ctx.db.get("subscriptions", subscriptionId)
    if (!subscription || subscription.status !== "pending_payment") throw new Error("Subscription tidak sedang menunggu review.")
    await ctx.db.patch("subscriptions", subscription._id, { status: "canceled", reviewedByOwnerId: adminId, reviewedAt: Date.now(), rejectionReason: trimmedReason })
    return null
}

export const rejectSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions"), reason: v.string() },
  handler: async (ctx, args) => { const admin = await requireAdmin(ctx); return await rejectSubscriptionForAdmin(ctx, admin._id, args.subscriptionId, args.reason) },
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

const slugifyProperty = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export const listOwnersForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const owners = await ctx.db.query("owners").take(200)
    const properties = await ctx.db.query("properties").take(500)
    const rooms = await ctx.db.query("rooms").take(2000)

    const roomCountByProperty = new Map<string, number>()
    for (const room of rooms) {
      const key = String(room.propertyId)
      roomCountByProperty.set(key, (roomCountByProperty.get(key) ?? 0) + 1)
    }

    return owners
      .map((owner) => {
        const ownerProperties = properties
          .filter((p) => p.ownerId === owner._id)
          .map((p) => ({
            _id: p._id,
            name: p.name,
            address: p.address,
            slug: p.slug,
            roomCount: roomCountByProperty.get(String(p._id)) ?? 0,
          }))
        return {
          _id: owner._id,
          name: owner.name ?? "Tanpa Nama",
          email: owner.email ?? "-",
          role: owner.role ?? "owner",
          onboardingCompleted: owner.onboardingCompleted === true,
          properties: ownerProperties,
        }
      })
      .sort((a, b) => a.email.localeCompare(b.email))
  },
})

export const createPropertyForOwner = mutation({
  args: {
    ownerId: v.id("owners"),
    name: v.string(),
    address: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const owner = await ctx.db.get("owners", args.ownerId)
    if (!owner) throw new Error("Owner tidak ditemukan.")
    await assertPropertyCapacityForOwner(ctx, owner._id)

    const name = args.name.trim()
    const address = args.address.trim()
    if (!name || !address) throw new Error("Nama dan alamat kos wajib diisi.")

    let baseSlug = slugifyProperty(args.slug?.trim() || name) || "kos"
    let candidate = baseSlug
    let suffix = 2
    while (
      await ctx.db
        .query("properties")
        .withIndex("by_slug", (q) => q.eq("slug", candidate))
        .unique()
    ) {
      candidate = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const propertyId = await ctx.db.insert("properties", {
      ownerId: owner._id,
      name,
      address,
      slug: candidate,
      isActive: true,
    })

    if (!owner.onboardingCompleted) {
      await ctx.db.patch("owners", owner._id, { onboardingCompleted: true })
    }

    return { propertyId, slug: candidate }
  },
})

export const bulkCreateRoomsForOwner = mutation({
  args: {
    ownerId: v.id("owners"),
    propertyId: v.id("properties"),
    rooms: v.array(
      v.object({
        roomNumber: v.string(),
        monthlyRent: v.number(),
        floor: v.optional(v.string()),
        roomType: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    if (args.rooms.length === 0) throw new Error("Minimal 1 kamar harus diisi.")
    if (args.rooms.length > 100) throw new Error("Maksimal 100 kamar dalam sekali input.")

    const created: string[] = []
    const skipped: Array<{ roomNumber: string; reason: string }> = []

    for (const item of args.rooms) {
      const roomNumber = item.roomNumber.trim()
      if (!roomNumber) continue
      try {
        await createRoomForOwnerInContext(ctx, args.ownerId, {
          propertyId: args.propertyId,
          roomNumber,
          monthlyRent: item.monthlyRent,
          floor: item.floor?.trim() || undefined,
          roomType: item.roomType?.trim() || undefined,
        })
        created.push(roomNumber)
      } catch (err) {
        skipped.push({
          roomNumber,
          reason: err instanceof Error ? err.message : "Gagal menambahkan kamar.",
        })
      }
    }

    return { created, skipped }
  },
})
