import type { MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { internal } from "../_generated/api"
import { registrationStatusText } from "./registrationLink"

export const syncApplicationFromBooking = async (ctx: MutationCtx, bookingId: Id<"bookings">, event?: "payment_rejected" | "booking_cancelled") => {
  const app = await ctx.db.query("rentalApplications").withIndex("by_booking", (q) => q.eq("bookingId", bookingId)).unique()
  if (!app) return null
  const booking = await ctx.db.get("bookings", bookingId)
  if (!booking) return null
  const now = Date.now()
  const next = event && booking.status === "pending"
    ? ((app.holdExpiresAt ?? 0) > now ? "accepted" : "hold_expired")
    : booking.status === "locked" ? "dp_confirmed" : booking.status === "paid_off" ? "converted" : booking.status === "expired" ? "booking_failed" : null
  if (!next || app.status === next) return app.status
  await ctx.db.patch(app._id, { status: next, ...(next === "accepted" ? { bookingId: undefined, tenantId: undefined } : {}), ...(next === "converted" || next === "booking_failed" || next === "hold_expired" ? { endedAt: now } : {}) })
  await ctx.scheduler.runAfter(0, internal.bots.queryDelivery.sendApplicationTenantNotice, { application: { channel: app.channel, replyChatId: app.replyChatId, applicantPhoneE164: app.applicantPhoneE164, anonymizedAt: app.anonymizedAt }, applicationId: app._id, kind: "tenant_application_update", params: { kode: app.code, status: next }, idempotencyKey: `status:${app._id}:${next}`, text: registrationStatusText(next) })
  return next
}
