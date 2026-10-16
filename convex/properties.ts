import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requirePropertyOwner, requireOwner } from "./lib/auth"
import { assertPropertyCapacityForOwner } from "./subscriptions"

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    return await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
  },
})

export const create = mutation({
  args: { name: v.string(), address: v.string(), slug: v.string(), propertyPhotoStorageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    await assertPropertyCapacityForOwner(ctx, owner._id)
    const name = args.name.trim()
    const address = args.address.trim()
    const slug = normalizeSlug(args.slug || args.name)
    if (!name || !address || !slug) throw new Error("Nama, alamat, dan link properti wajib diisi.")
    if (args.propertyPhotoStorageIds.length < 3) throw new Error("Minimal 3 foto properti wajib diunggah.")
    const existingSlug = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()
    if (existingSlug) throw new Error("Link properti sudah digunakan.")
    const propertyId = await ctx.db.insert("properties", { ownerId: owner._id, name, address, slug, isActive: true })
    for (const [sortOrder, storageId] of args.propertyPhotoStorageIds.entries()) {
      await ctx.db.insert("property_photos", { propertyId, storageId, sortOrder, createdAt: Date.now() })
    }
    return propertyId
  },
})

export const update = mutation({
  args: { propertyId: v.id("properties"), name: v.string(), address: v.string(), slug: v.string(), propertyPhotoStorageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const name = args.name.trim()
    const address = args.address.trim()
    const slug = normalizeSlug(args.slug || args.name)
    if (!name || !address || !slug) throw new Error("Nama, alamat, dan link properti wajib diisi.")
    if (args.propertyPhotoStorageIds.length < 3) throw new Error("Minimal 3 foto properti wajib tersedia.")
    const existingSlug = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()
    if (existingSlug && existingSlug._id !== args.propertyId) throw new Error("Link properti sudah digunakan.")
    await ctx.db.patch("properties", args.propertyId, { name, address, slug })
    const photos = await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100)
    for (const photo of photos) await ctx.db.delete("property_photos", photo._id)
    for (const [sortOrder, storageId] of args.propertyPhotoStorageIds.entries()) {
      await ctx.db.insert("property_photos", { propertyId: args.propertyId, storageId, sortOrder, createdAt: Date.now() })
    }
    return args.propertyId
  },
})

export const getMine = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => (await requirePropertyOwner(ctx, args.propertyId)).property,
})

export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    if (!property || !property.isActive) return null
    const owner = await ctx.db.get("owners", property.ownerId)
    const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
    const pendingPayments = await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "pending_review")).take(100)
    const activeBookings = await ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(100)
    const unavailableRoomIds = new Set([
      ...pendingPayments.map((payment) => String(payment.roomId)),
      ...activeBookings.filter((booking) => booking.status === "pending" || booking.status === "locked").map((booking) => String(booking.roomId)),
    ])
    const facilities = await ctx.db.query("property_facilities").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
    const propertyPhotos = await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(30)
    const availableRooms = rooms.filter((room) => room.status === "available" && !unavailableRoomIds.has(String(room._id)))
    const publicRooms = await Promise.all(availableRooms.map(async (room) => {
      const media = await ctx.db.query("room_media").withIndex("by_room", (q) => q.eq("roomId", room._id)).take(20)
      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        monthlyRent: room.monthlyRent,
        floor: room.floor,
        roomType: room.roomType,
        sizeSqm: room.sizeSqm,
        maxOccupants: room.maxOccupants,
        genderCategory: room.genderCategory,
        bathroomType: room.bathroomType,
        bathroomFacilities: room.bathroomFacilities,
        furnitureElectronics: room.furnitureElectronics,
        bedSize: room.bedSize,
        annualRent: room.annualRent,
        depositFee: room.depositFee,
        dpAmount: room.dpAmount,
        electricityStatus: room.electricityStatus,
        additionalFees: room.additionalFees,
        description: room.description,
        media: await Promise.all(media.map(async (item) => ({ kind: item.kind, caption: item.caption, url: await ctx.storage.getUrl(item.storageId) }))),
      }
    }))
    return { name: property.name, slug: property.slug, address: property.address, isVerified: property.propertyVerificationStatus === "verified", ownerIdentityVerified: owner?.identityVerificationStatus === "verified", photos: await Promise.all(propertyPhotos.sort((a, b) => a.sortOrder - b.sortOrder).map(async (photo) => ({ _id: photo._id, caption: photo.caption, url: await ctx.storage.getUrl(photo.storageId) }))), facilities: facilities.filter((facility) => facility.isActive).map(({ _id, category, name, description }) => ({ _id, category, name, description })), rooms: publicRooms }
  },
})
