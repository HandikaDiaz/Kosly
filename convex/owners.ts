import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOwner } from "./lib/auth"

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export const ensureCurrentOwner = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const existing = await ctx.db.query("owners").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique()
    if (existing) return existing
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: identity.tokenIdentifier, name: identity.name, email: identity.email, role: "owner", identityVerificationStatus: "not_submitted", onboardingCompleted: false, createdAt: Date.now() })
    const owner = await ctx.db.get("owners", ownerId)
    if (!owner) throw new Error("Profil pemilik gagal dibuat.")
    return owner
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => requireOwner(ctx),
})

export const getSetupState = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(1)
    return { owner, onboardingCompleted: Boolean(owner.onboardingCompleted || properties.length > 0) }
  },
})

export const completeOnboarding = mutation({
  args: {
    ownerName: v.string(),
    propertyName: v.string(),
    address: v.string(),
    slug: v.string(),
    propertyPhotoStorageIds: v.array(v.id("_storage")),
    facilities: v.optional(v.array(v.object({ category: v.union(v.literal("shared"), v.literal("services"), v.literal("parking"), v.literal("security"), v.literal("sports"), v.literal("other")), name: v.string(), description: v.optional(v.string()) }))),
    rooms: v.optional(v.array(v.object({ roomNumber: v.string(), monthlyRent: v.number(), annualRent: v.optional(v.number()), floor: v.optional(v.string()), roomType: v.optional(v.string()), sizeSqm: v.optional(v.number()), maxOccupants: v.optional(v.number()), genderCategory: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("mixed"))), bathroomType: v.optional(v.union(v.literal("private"), v.literal("shared"), v.literal("none"))), bathroomFacilities: v.optional(v.array(v.string())), furnitureElectronics: v.optional(v.array(v.string())), bedSize: v.optional(v.string()), depositFee: v.optional(v.number()), electricityStatus: v.optional(v.union(v.literal("included"), v.literal("metered"), v.literal("excluded"))), additionalFees: v.optional(v.string()), description: v.optional(v.string()) }))),
  },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const ownerName = args.ownerName.trim()
    const propertyName = args.propertyName.trim()
    const address = args.address.trim()
    const slug = normalizeSlug(args.slug || propertyName)
    const rooms = (args.rooms ?? []).map((room) => ({ ...room, roomNumber: room.roomNumber.trim(), floor: room.floor?.trim() || undefined, roomType: room.roomType?.trim() || undefined, bedSize: room.bedSize?.trim() || undefined, description: room.description?.trim() || undefined, additionalFees: room.additionalFees?.trim() || undefined, bathroomFacilities: room.bathroomFacilities?.map((item) => item.trim()).filter(Boolean), furnitureElectronics: room.furnitureElectronics?.map((item) => item.trim()).filter(Boolean) }))
    
    if (!ownerName || !propertyName || !address || !slug) throw new Error("Lengkapi data pemilik, properti, dan link properti.")
    if (args.propertyPhotoStorageIds.length < 3) throw new Error("Minimal 3 foto kos wajib diunggah.")
    if (new Set(args.propertyPhotoStorageIds).size < 3) throw new Error("Minimal 3 foto kos yang berbeda wajib diunggah.")
    for (const storageId of args.propertyPhotoStorageIds) {
      const file = await ctx.db.system.get("_storage", storageId)
      if (!file || (file.contentType && !file.contentType.startsWith("image/"))) throw new Error("Semua foto kos harus berupa gambar yang valid.")
    }
    if (rooms.length > 0 && rooms.some((room) => !room.roomNumber || room.monthlyRent <= 0)) throw new Error("Nomor kamar dan harga sewa wajib valid.")
    if (new Set(rooms.map((room) => room.roomNumber)).size !== rooms.length) throw new Error("Nomor kamar tidak boleh duplikat.")
    
    const existingProperty = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()
    if (existingProperty) throw new Error("Link properti sudah digunakan.")
    
    const existingOwnerProperties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(1)
    if (existingOwnerProperties.length > 0) throw new Error("Onboarding owner sudah pernah diselesaikan.")
    
    const propertyId = await ctx.db.insert("properties", { ownerId: owner._id, name: propertyName, address, slug, isActive: true, propertyVerificationStatus: "not_submitted" })
    for (const [sortOrder, storageId] of args.propertyPhotoStorageIds.entries()) await ctx.db.insert("property_photos", { propertyId, storageId, sortOrder, createdAt: Date.now() })
    for (const room of rooms) await ctx.db.insert("rooms", { propertyId, ...room, status: "available" })
    for (const facility of args.facilities ?? []) { const name = facility.name.trim(); if (name) await ctx.db.insert("property_facilities", { propertyId, category: facility.category, name, description: facility.description?.trim() || undefined, isActive: true, createdAt: Date.now() }) }
    await ctx.db.patch("owners", owner._id, { name: ownerName, onboardingCompleted: true })
    return { propertyId, slug }
  },
})

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const name = args.name.trim()
    if (!name) throw new Error("Nama tidak boleh kosong.")
    await ctx.db.patch("owners", owner._id, { name })
    return null
  },
})
