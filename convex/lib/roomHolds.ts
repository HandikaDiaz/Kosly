import type { Id } from "../_generated/dataModel"
import type { QueryCtx, MutationCtx } from "../_generated/server"
import { parseRegistrationCode } from "./registrationLink"

type DbCtx = QueryCtx | MutationCtx

export type RoomHoldBlocker = {
  kind: "room" | "booking" | "application"
  roomId: Id<"rooms">
  applicationId?: Id<"rentalApplications">
  applicationCode?: string
  applicationStatus?: "accepted" | "registration_submitted"
  bookingId?: Id<"bookings">
  bookingStatus?: "pending" | "locked"
}

/** The single source of truth for every room blocker. */
export const getRoomHoldBlockers = async (ctx: DbCtx, roomId: Id<"rooms">, now: number): Promise<RoomHoldBlocker[]> => {
  const blockers: RoomHoldBlocker[] = []
  const room = await ctx.db.get("rooms", roomId)
  if (!room) return [{ kind: "room", roomId }]
  if (room.isActive === false || room.status !== "available") blockers.push({ kind: "room", roomId })

  const bookings = await ctx.db.query("bookings").withIndex("by_room_and_status", (q) => q.eq("roomId", roomId)).take(50)
  for (const booking of bookings) {
    if (booking.status === "pending" || booking.status === "locked") {
      blockers.push({ kind: "booking", roomId, bookingId: booking._id, bookingStatus: booking.status })
    }
  }

  const accepted = await ctx.db.query("rentalApplications").withIndex("by_room_and_status", (q) => q.eq("roomId", roomId).eq("status", "accepted")).take(50)
  for (const application of accepted) {
    if ((application.holdExpiresAt ?? 0) > now) {
      blockers.push({ kind: "application", roomId, applicationId: application._id, applicationCode: application.code, applicationStatus: "accepted" })
    }
  }

  const submitted = await ctx.db.query("rentalApplications").withIndex("by_room_and_status", (q) => q.eq("roomId", roomId).eq("status", "registration_submitted")).take(50)
  for (const application of submitted) {
    if (!application.bookingId) continue
    const booking = await ctx.db.get("bookings", application.bookingId)
    if (booking?.status === "pending") {
      blockers.push({ kind: "application", roomId, applicationId: application._id, applicationCode: application.code, applicationStatus: "registration_submitted", bookingId: booking._id, bookingStatus: "pending" })
    }
  }
  return blockers
}

export const assertRoomBookable = async (ctx: DbCtx, roomId: Id<"rooms">, now: number, options?: { applicationCode?: string }) => {
  const blockers = await getRoomHoldBlockers(ctx, roomId, now)
  const normalizedCode = options?.applicationCode ? parseRegistrationCode(options.applicationCode) : null
  const allowedApplication = normalizedCode
    ? blockers.find((blocker) => blocker.kind === "application" && blocker.applicationStatus === "accepted" && blocker.applicationCode === normalizedCode)
    : undefined
  const remaining = allowedApplication
    ? blockers.filter((blocker) => blocker !== allowedApplication)
    : blockers
  if (remaining.length > 0 || (options?.applicationCode && !allowedApplication)) throw new Error("Kamar ini sedang tidak tersedia.")
  return allowedApplication
}
