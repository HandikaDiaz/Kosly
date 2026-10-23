import type { MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { internal } from "../_generated/api"

export const syncApplicationFromBooking = async (ctx: MutationCtx, bookingId: Id<"bookings">) => {
  const app = await ctx.db.query("rentalApplications").withIndex("by_booking", (q) => q.eq("bookingId", bookingId)).unique()
  if (!app) return null
  const booking = await ctx.db.get("bookings", bookingId)
  if (!booking) return null
  const next = booking.status === "locked" ? "dp_confirmed" : booking.status === "paid_off" ? "converted" : booking.status === "expired" ? "booking_failed" : null
  if (!next || app.status === next) return app.status
  await ctx.db.patch(app._id, { status: next, ...(next === "converted" || next === "booking_failed" ? { endedAt: Date.now() } : {}) })
  await ctx.scheduler.runAfter(0, internal.bots.queryDelivery.sendApplicationTenantNotice, { application: { channel: app.channel, replyChatId: app.replyChatId, applicantPhoneE164: app.applicantPhoneE164, anonymizedAt: app.anonymizedAt }, applicationId: app._id, kind: "tenant_application_update", params: { kode: app.code }, text: `Status pengajuan ${app.code}: ${next}.` })
  return next
}
