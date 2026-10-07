import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requirePropertyOwner } from "./lib/auth"

const mediaKind = v.union(v.literal("photo"), v.literal("video"))

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
})

export const listForRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId)
    if (!room) throw new Error("Kamar tidak ditemukan.")
    await requirePropertyOwner(ctx, room.propertyId)
    const media = await ctx.db.query("room_media").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).take(50)
    return await Promise.all(media.map(async (item) => ({ ...item, url: await ctx.storage.getUrl(item.storageId) })))
  },
})

export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100)
    return await Promise.all(rooms.map(async (room) => ({ roomId: room._id, media: await Promise.all((await ctx.db.query("room_media").withIndex("by_room", (q) => q.eq("roomId", room._id)).take(50)).map(async (item) => ({ ...item, url: await ctx.storage.getUrl(item.storageId) }))) })))
  },
})

export const attach = mutation({
  args: { roomId: v.id("rooms"), storageId: v.id("_storage"), kind: mediaKind, sortOrder: v.number(), caption: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId)
    if (!room) throw new Error("Kamar tidak ditemukan.")
    await requirePropertyOwner(ctx, room.propertyId)
    const file = await ctx.db.system.get("_storage", args.storageId)
    if (!file) throw new Error("File media tidak ditemukan.")
    const isValidType = args.kind === "photo" ? file.contentType?.startsWith("image/") : file.contentType?.startsWith("video/")
    if (!isValidType) throw new Error(args.kind === "photo" ? "Media harus berupa foto." : "Media harus berupa video.")
    return await ctx.db.insert("room_media", { roomId: args.roomId, storageId: args.storageId, kind: args.kind, sortOrder: Math.max(0, Math.floor(args.sortOrder)), caption: args.caption?.trim() || undefined, createdAt: Date.now() })
  },
})

export const remove = mutation({
  args: { mediaId: v.id("room_media") },
  handler: async (ctx, args) => {
    const media = await ctx.db.get("room_media", args.mediaId)
    if (!media) throw new Error("Media tidak ditemukan.")
    const room = await ctx.db.get("rooms", media.roomId)
    if (!room) throw new Error("Kamar tidak ditemukan.")
    await requirePropertyOwner(ctx, room.propertyId)
    await ctx.storage.delete(media.storageId)
    await ctx.db.delete("room_media", media._id)
    return null
  },
})
