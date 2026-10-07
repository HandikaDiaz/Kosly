import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requirePropertyOwner } from "./lib/auth"
import { recalculateForOwnerInContext } from "./subscriptions"

export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    return await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100)
  },
})

export const create = mutation({
  args: {
    propertyId: v.id("properties"), roomNumber: v.string(), monthlyRent: v.number(), floor: v.optional(v.string()), roomType: v.optional(v.string()), sizeSqm: v.optional(v.number()), maxOccupants: v.optional(v.number()), genderCategory: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("mixed"))), bathroomType: v.optional(v.union(v.literal("private"), v.literal("shared"), v.literal("none"))), bathroomFacilities: v.optional(v.array(v.string())), furnitureElectronics: v.optional(v.array(v.string())), bedSize: v.optional(v.string()), annualRent: v.optional(v.number()), depositFee: v.optional(v.number()), dpAmount: v.optional(v.number()), dp_max_days: v.optional(v.number()), electricityStatus: v.optional(v.union(v.literal("included"), v.literal("metered"), v.literal("excluded"))), additionalFees: v.optional(v.string()), description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const roomNumber = args.roomNumber.trim()
    if (!roomNumber || args.monthlyRent <= 0) throw new Error("Nomor kamar dan harga sewa wajib valid.")
    const duplicate = (await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100)).find((room) => room.roomNumber === roomNumber)
    if (duplicate) throw new Error("Nomor kamar sudah ada.")
    const roomId = await ctx.db.insert("rooms", { propertyId: args.propertyId, roomNumber, monthlyRent: args.monthlyRent, status: "available", ...roomDetails(args) })
    await recalculateForOwnerInContext(ctx, (await requirePropertyOwner(ctx, args.propertyId)).owner._id)
    return roomId
  },
})

export const update = mutation({
  args: {
    roomId: v.id("rooms"), roomNumber: v.string(), monthlyRent: v.number(), status: v.optional(v.union(v.literal("available"), v.literal("booked"), v.literal("occupied"))), floor: v.optional(v.string()), roomType: v.optional(v.string()), sizeSqm: v.optional(v.number()), maxOccupants: v.optional(v.number()), genderCategory: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("mixed"))), bathroomType: v.optional(v.union(v.literal("private"), v.literal("shared"), v.literal("none"))), bathroomFacilities: v.optional(v.array(v.string())), furnitureElectronics: v.optional(v.array(v.string())), bedSize: v.optional(v.string()), annualRent: v.optional(v.number()), depositFee: v.optional(v.number()), dpAmount: v.optional(v.number()), dp_max_days: v.optional(v.number()), electricityStatus: v.optional(v.union(v.literal("included"), v.literal("metered"), v.literal("excluded"))), additionalFees: v.optional(v.string()), description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId)
    if (!room) throw new Error("Kamar tidak ditemukan.")
    await requirePropertyOwner(ctx, room.propertyId)
    if (!args.roomNumber.trim() || args.monthlyRent <= 0) throw new Error("Data kamar belum valid.")
    await ctx.db.patch("rooms", room._id, {
      roomNumber: args.roomNumber.trim(),
      monthlyRent: args.monthlyRent,
      status: args.status ?? room.status,
      ...roomDetails(args)
    })
    return null
  },
})

export const remove = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId)
    if (!room) throw new Error("Kamar tidak ditemukan.")
    await requirePropertyOwner(ctx, room.propertyId)
    const media = await ctx.db.query("room_media").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).take(50)
    for (const item of media) {
      await ctx.storage.delete(item.storageId)
      await ctx.db.delete("room_media", item._id)
    }
    await ctx.db.delete("rooms", room._id)
    const { owner } = await requirePropertyOwner(ctx, room.propertyId)
    await recalculateForOwnerInContext(ctx, owner._id)
    return null
  },
})

const roomDetails = (args: {
  floor?: string; roomType?: string; sizeSqm?: number; maxOccupants?: number; genderCategory?: "male" | "female" | "mixed"; bathroomType?: "private" | "shared" | "none"; bathroomFacilities?: string[]; furnitureElectronics?: string[]; bedSize?: string; annualRent?: number; depositFee?: number; dpAmount?: number; dp_max_days?: number; electricityStatus?: "included" | "metered" | "excluded"; additionalFees?: string; description?: string
}) => ({
  floor: args.floor?.trim() || undefined,
  roomType: args.roomType?.trim() || undefined,
  sizeSqm: args.sizeSqm && args.sizeSqm > 0 ? args.sizeSqm : undefined,
  maxOccupants: args.maxOccupants && args.maxOccupants > 0 ? Math.floor(args.maxOccupants) : undefined,
  genderCategory: args.genderCategory,
  bathroomType: args.bathroomType,
  bathroomFacilities: args.bathroomFacilities?.map((item) => item.trim()).filter(Boolean),
  furnitureElectronics: args.furnitureElectronics?.map((item) => item.trim()).filter(Boolean),
  bedSize: args.bedSize?.trim() || undefined,
  annualRent: args.annualRent && args.annualRent > 0 ? args.annualRent : undefined,
  depositFee: args.depositFee && args.depositFee >= 0 ? args.depositFee : undefined,
  dpAmount: args.dpAmount && args.dpAmount >= 0 ? args.dpAmount : undefined,
  dp_max_days: args.dp_max_days && args.dp_max_days > 0 ? Math.floor(args.dp_max_days) : undefined,
  electricityStatus: args.electricityStatus,
  additionalFees: args.additionalFees?.trim() || undefined,
  description: args.description?.trim() || undefined,
})
