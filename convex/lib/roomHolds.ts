import type { Id } from "../_generated/dataModel"

type DbCtx = { db: { query: (table: "rentalApplications") => any; get: (id: any) => Promise<any> } }

/** Unified room blockers used by public registration and bot/application flows. */
export const getRoomHoldBlockers = async (ctx: DbCtx, roomId: Id<"rooms">, now: number) => {
  const rows = await ctx.db.query("rentalApplications").withIndex("by_room_and_status", (q: any) => q.eq("roomId", roomId).eq("status", "accepted")).take(50)
  const accepted = rows.filter((row: any) => (row.holdExpiresAt ?? 0) > now)
  const submitted = await ctx.db.query("rentalApplications").withIndex("by_room_and_status", (q: any) => q.eq("roomId", roomId).eq("status", "registration_submitted")).take(50)
  const pending = []
  for (const row of submitted) {
    const booking = row.bookingId ? await ctx.db.get(row.bookingId) : null
    if (booking?.status === "pending") pending.push({ ...row, bookingStatus: booking.status })
  }
  return [...accepted, ...pending]
}
