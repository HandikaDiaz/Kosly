import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requirePropertyOwner, requireOwner } from "./lib/auth"

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    return await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
  },
})

export const create = mutation({
  args: { name: v.string(), address: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const name = args.name.trim()
    const address = args.address.trim()
    const slug = normalizeSlug(args.slug || args.name)
    if (!name || !address || !slug) throw new Error("Nama, alamat, dan link properti wajib diisi.")
    const existingSlug = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()
    if (existingSlug) throw new Error("Link properti sudah digunakan.")
    return await ctx.db.insert("properties", { ownerId: owner._id, name, address, slug, isActive: true })
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
    const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
    const facilities = await ctx.db.query("property_facilities").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
    const propertyPhotos = await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(30)
    const availableRooms = rooms.filter((room) => room.status === "available")
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
    return { name: property.name, slug: property.slug, address: property.address, isVerified: property.propertyVerificationStatus === "verified", photos: await Promise.all(propertyPhotos.sort((a, b) => a.sortOrder - b.sortOrder).map(async (photo) => ({ _id: photo._id, caption: photo.caption, url: await ctx.storage.getUrl(photo.storageId) }))), facilities: facilities.filter((facility) => facility.isActive).map(({ _id, category, name, description }) => ({ _id, category, name, description })), rooms: publicRooms }
  },
})
