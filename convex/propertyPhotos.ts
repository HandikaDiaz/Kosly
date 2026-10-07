import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireIdentity, requirePropertyOwner } from "./lib/auth"

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const property = await ctx.db.get("properties", args.propertyId)
    if (!property || !property.isActive) return []
    const photos = await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(30)
    return await Promise.all(photos.sort((a, b) => a.sortOrder - b.sortOrder).map(async (photo) => ({ ...photo, url: await ctx.storage.getUrl(photo.storageId) })))
  },
})

export const listMine = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const photos = await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(30)
    return await Promise.all(photos.sort((a, b) => a.sortOrder - b.sortOrder).map(async (photo) => ({ ...photo, url: await ctx.storage.getUrl(photo.storageId) })))
  },
})
