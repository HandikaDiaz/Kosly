import { internalMutation } from "../_generated/server"
import type { MutationCtx } from "../_generated/server"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import { createRoomForOwnerInContext } from "../rooms"
import { attachRoomMediaForOwnerInContext } from "../roomMedia"

export type RoomWizardData = {
  propertyId?: Id<"properties">
  roomNumber?: string
  monthlyRent?: number
}

export const finalizeAddRoomInContext = async (
  ctx: MutationCtx,
  stateId: Id<"bot_conversation_state">,
  ownerId: Id<"owners">,
  data: RoomWizardData,
  storageId?: Id<"_storage">,
) => {
  if (!data.propertyId || !data.roomNumber || !data.monthlyRent) throw new Error("Data kamar belum lengkap.")
  const roomId = await createRoomForOwnerInContext(ctx, ownerId, {
    propertyId: data.propertyId,
    roomNumber: data.roomNumber,
    monthlyRent: data.monthlyRent,
  })
  if (storageId) await attachRoomMediaForOwnerInContext(ctx, ownerId, { roomId, storageId, kind: "photo", sortOrder: 0 })
  await ctx.db.patch("bot_conversation_state", stateId, { status: "completed" })
  return { roomId, propertyId: data.propertyId, roomNumber: data.roomNumber, monthlyRent: data.monthlyRent }
}

export const finalizeAddRoom = internalMutation({
  args: {
    stateId: v.id("bot_conversation_state"),
    ownerId: v.id("owners"),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    propertyId: v.id("properties"),
    roomNumber: v.string(),
    monthlyRent: v.number(),
  }),
  handler: async (ctx, args) => {
    const state = await ctx.db.get("bot_conversation_state", args.stateId)
    if (!state || state.status !== "active") throw new Error("Sesi tambah kamar sudah berakhir.")
    return await finalizeAddRoomInContext(ctx, args.stateId, args.ownerId, state.collectedData, args.storageId)
  },
})
