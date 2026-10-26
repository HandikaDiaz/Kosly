import { query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { v } from "convex/values"
import { requireOwner } from "./lib/auth"

const tabBadges = v.object({ applicationsOpen: v.number(), reviewsUnreplied: v.number(), disputesOpen: v.number(), locationVerified: v.boolean(), isPublished: v.boolean(), photoCountPublic: v.number() })

const countDisputes = async (ctx: QueryCtx, propertyId: Id<"properties">) => {
  const tenants = await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", propertyId)).take(100)
  const disputes = (await Promise.all(tenants.map((tenant) => ctx.db.query("paymentDisputes").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(100)))).flat()
  return disputes.filter((item) => item.status === "open").length
}

export const getPropertyTabBadges = query({
  args: { propertyId: v.id("properties") },
  returns: tabBadges,
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const property = await ctx.db.get("properties", args.propertyId)
    if (!property || property.ownerId !== owner._id) throw new Error("Properti tidak ditemukan.")
    const [submitted, accepted, registration, dpConfirmed, reviews, disputes] = await Promise.all([
      ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId).eq("status", "submitted")).take(100),
      ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId).eq("status", "accepted")).take(100),
      ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId).eq("status", "registration_submitted")).take(100),
      ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId).eq("status", "dp_confirmed")).take(100),
      ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId).eq("status", "published")).take(100),
      countDisputes(ctx, args.propertyId),
    ])
    return { applicationsOpen: submitted.length + accepted.length + registration.length + dpConfirmed.length, reviewsUnreplied: reviews.filter((review) => !review.ownerReply).length, disputesOpen: disputes, locationVerified: property.locationVerificationStatus === "verified", isPublished: property.isPublished === true, photoCountPublic: property.publicPhotoIds?.length ?? 0 }
  },
})

export const listPropertiesWithStatus = query({
  args: {},
  returns: v.array(v.object({
    id: v.id("properties"),
    name: v.string(),
    address: v.string(),
    roomTotal: v.number(),
    roomOccupied: v.number(),
    roomAvailable: v.number(),
    isPublished: v.boolean(),
    locationVerified: v.boolean(),
    applicationsOpen: v.number(),
    reviewsUnreplied: v.number(),
    coverPhotoUrl: v.optional(v.union(v.string(), v.null())),
    slug: v.optional(v.string()),
    publicSlug: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lockedByTier: v.optional(v.boolean()),
  })),
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    return Promise.all(properties.map(async (property) => {
      const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
      const firstPhoto = await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", property._id)).first()
      const coverPhotoUrl = firstPhoto ? await ctx.storage.getUrl(firstPhoto.storageId) : null
      const [submitted, accepted, registration, dpConfirmed, reviews] = await Promise.all([
        ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "submitted")).take(100),
        ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "accepted")).take(100),
        ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "registration_submitted")).take(100),
        ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "dp_confirmed")).take(100),
        ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "published")).take(100),
      ])
      return {
        id: property._id,
        name: property.name,
        address: property.address,
        roomTotal: rooms.length,
        roomOccupied: rooms.filter((room) => room.status === "occupied").length,
        roomAvailable: rooms.filter((room) => room.status === "available").length,
        isPublished: property.isPublished === true,
        locationVerified: property.locationVerificationStatus === "verified",
        applicationsOpen: submitted.length + accepted.length + registration.length + dpConfirmed.length,
        reviewsUnreplied: reviews.filter((review) => !review.ownerReply).length,
        coverPhotoUrl: coverPhotoUrl ?? undefined,
        slug: property.slug,
        publicSlug: property.publicSlug,
        isActive: property.isActive ?? true,
        lockedByTier: property.lockedByTier === true,
      }
    }))
  },
})

export const getOverview = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    const propertyData = await Promise.all(properties.map(async (property) => {
      const [rooms, tenants, payments, bookings, charges] = await Promise.all([
        ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100),
        ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100),
        ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(100),
        ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).filter((q) => q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "locked"))).take(100),
        ctx.db.query("rent_charges").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(200),
      ])
      return { property, rooms, tenants, payments, bookings, charges }
    }))
    const allRooms = propertyData.flatMap((item) => item.rooms)
    const allPayments = propertyData.flatMap((item) => item.payments)
    const allTenants = propertyData.flatMap((item) => item.tenants)
    const allBookings = propertyData.flatMap((item) => item.bookings)
    const allCharges = propertyData.flatMap((item) => item.charges)
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(args.now)
      date.setMonth(date.getMonth() - (5 - index))
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    })
    const monthlyRevenue = monthKeys.map((period) => ({ period, amount: allPayments.filter((payment) => payment.status === "confirmed" && new Date(payment.paidAt).toISOString().slice(0, 7) === period).reduce((sum, payment) => sum + payment.amount, 0) }))
    const propertyStats = propertyData.map(({ property, rooms, tenants, payments, charges }) => ({ propertyId: property._id, propertyName: property.name, occupancyRate: rooms.length ? Math.round((rooms.filter((room) => room.status === "occupied").length / rooms.length) * 100) : 0, confirmedAmount: payments.filter((payment) => payment.status === "confirmed").reduce((sum, payment) => sum + payment.amount, 0), overdueCharges: charges.filter((charge) => charge.status === "unpaid" && charge.dueDate < args.now).length, activeTenants: tenants.filter((tenant) => tenant.status === "active").length }))
    const recentPayments = allPayments.sort((a, b) => b.paidAt - a.paidAt).slice(0, 10).map((payment) => {
      const property = propertyData.find((item) => item.property._id === payment.propertyId)?.property
      const tenant = allTenants.find((item) => item._id === payment.tenantId)
      const room = allRooms.find((item) => item._id === payment.roomId)
      return { ...payment, propertyName: property?.name ?? "Properti", tenantName: tenant?.name ?? "Tenant", roomNumber: room?.roomNumber ?? "-" }
    })
    return {
      owner,
      properties: properties.map((property) => ({ ...property, rooms: propertyData.find((item) => item.property._id === property._id)?.rooms ?? [] })),
      totals: {
        properties: properties.length,
        rooms: allRooms.length,
        availableRooms: allRooms.filter((room) => room.status === "available").length,
        bookedRooms: allRooms.filter((room) => room.status === "booked").length,
        occupiedRooms: allRooms.filter((room) => room.status === "occupied").length,
        pendingPayments: allPayments.filter((payment) => payment.status === "pending_review").length,
        overduePayments: allCharges.filter((charge) => charge.status === "unpaid" && charge.dueDate < args.now).length,
        activeTenants: allTenants.filter((tenant) => tenant.status === "active").length,
        activeBookings: allBookings.length,
        confirmedAmount: allPayments.filter((payment) => payment.status === "confirmed").reduce((sum, payment) => sum + payment.amount, 0),
      },
      analytics: { monthlyRevenue, propertyStats },
      recentPayments,
    }
  },
})
