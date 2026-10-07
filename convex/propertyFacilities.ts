import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requirePropertyOwner } from "./lib/auth"

const category = v.union(v.literal("shared"), v.literal("services"), v.literal("parking"), v.literal("security"), v.literal("sports"), v.literal("other"))

export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    return await ctx.db.query("property_facilities").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100)
  },
})

export const create = mutation({
  args: { propertyId: v.id("properties"), category, name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const name = args.name.trim()
    if (!name) throw new Error("Nama fasilitas wajib diisi.")
    return await ctx.db.insert("property_facilities", { propertyId: args.propertyId, category: args.category, name, description: args.description?.trim() || undefined, isActive: true, createdAt: Date.now() })
  },
})

export const setActive = mutation({
  args: { facilityId: v.id("property_facilities"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const facility = await ctx.db.get("property_facilities", args.facilityId)
    if (!facility) throw new Error("Fasilitas tidak ditemukan.")
    await requirePropertyOwner(ctx, facility.propertyId)
    await ctx.db.patch("property_facilities", facility._id, { isActive: args.isActive })
    return null
  },
})

export const update = mutation({
  args: { facilityId: v.id("property_facilities"), category, name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const facility = await ctx.db.get("property_facilities", args.facilityId)
    if (!facility) throw new Error("Fasilitas tidak ditemukan.")
    await requirePropertyOwner(ctx, facility.propertyId)
    const name = args.name.trim()
    if (!name) throw new Error("Nama fasilitas wajib diisi.")
    await ctx.db.patch("property_facilities", facility._id, { category: args.category, name, description: args.description?.trim() || undefined })
    return null
  },
})

export const remove = mutation({
  args: { facilityId: v.id("property_facilities") },
  handler: async (ctx, args) => {
    const facility = await ctx.db.get("property_facilities", args.facilityId)
    if (!facility) throw new Error("Fasilitas tidak ditemukan.")
    await requirePropertyOwner(ctx, facility.propertyId)
    await ctx.db.delete("property_facilities", facility._id)
    return null
  },
})
