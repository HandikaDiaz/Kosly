import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { normalizeIndonesianPhone } from "./lib/tenantIdentity"
import { getRoomHoldBlockers } from "./lib/roomHolds"

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
})

export const getPropertyForRegistration = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    if (!property || !property.isActive) return null
    const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
    const pendingPayments = await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "pending_review")).take(100)
    const activeBookings = await ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(100)
    const acceptedApplications = await ctx.db.query("rentalApplications").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "accepted")).take(100)
    const unavailableRoomIds = new Set([
      ...pendingPayments.map((payment) => String(payment.roomId)),
      ...activeBookings.filter((booking) => booking.status === "pending" || booking.status === "locked").map((booking) => String(booking.roomId)),
      ...acceptedApplications.filter((application) => (application.holdExpiresAt ?? 0) > Date.now()).map((application) => String(application.roomId)),
    ])
    return { name: property.name, slug: property.slug, rooms: rooms.filter((room) => room.status === "available" && !unavailableRoomIds.has(String(room._id))).map((room) => ({ _id: room._id, roomNumber: room.roomNumber, monthlyRent: room.monthlyRent, annualRent: room.annualRent, depositFee: room.depositFee, dpAmount: room.dpAmount })) }
  },
})

export const getRegistrationHint = query({
  args: { slug: v.string(), applicationCode: v.string() },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    const application = await ctx.db.query("rentalApplications").withIndex("by_code", (q) => q.eq("code", args.applicationCode.trim().toUpperCase())).unique()
    if (!property || !application || application.propertyId !== property._id || application.status !== "accepted" || (application.holdExpiresAt ?? 0) <= Date.now()) return { valid: false as const }
    const room = await ctx.db.get("rooms", application.roomId)
    if (!room || (await getRoomHoldBlockers(ctx, room._id, Date.now())).every((row: any) => row._id === application._id)) return { valid: true as const, roomId: room._id, roomLabel: room.roomNumber, kosName: property.name, moveInDate: application.moveInDate }
    return { valid: false as const }
  },
})

export const createSubmission = mutation({
  args: { slug: v.string(), roomId: v.id("rooms"), name: v.string(), phone: v.string(), startedAt: v.number(), dueDate: v.number(), amount: v.number(), paymentType: v.optional(v.union(v.literal("dp"), v.literal("full"))), deadlineAt: v.optional(v.number()), proofStorageId: v.id("_storage"), applicationCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    if (!property || !property.isActive) throw new Error("Link pendaftaran tidak ditemukan.")
    const owner = await ctx.db.get("owners", property.ownerId)
    if (owner?.identityVerificationStatus !== "verified") throw new Error("Pendaftaran belum tersedia. Pemilik properti belum menyelesaikan verifikasi identitas.")
    const room = await ctx.db.get("rooms", args.roomId)
    if (!room || room.propertyId !== property._id || room.status !== "available") throw new Error("Kamar sudah tidak tersedia.")
    const linkedApplication = args.applicationCode ? await ctx.db.query("rentalApplications").withIndex("by_code", (q) => q.eq("code", args.applicationCode!.trim().toUpperCase())).unique() : null
    if (args.applicationCode && (!linkedApplication || linkedApplication.propertyId !== property._id || linkedApplication.roomId !== room._id || linkedApplication.status !== "accepted" || (linkedApplication.holdExpiresAt ?? 0) <= Date.now())) throw new Error("Kamar sudah tidak tersedia.")
    const blockers = await getRoomHoldBlockers(ctx, room._id, Date.now())
    if (blockers.length && (!linkedApplication || !blockers.some((row: any) => row._id === linkedApplication._id))) throw new Error("Kamar sudah tidak tersedia.")
    const pendingPayments = await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "pending_review")).take(100)
    if (pendingPayments.some((payment) => payment.roomId === room._id)) throw new Error("Kamar sedang menunggu verifikasi pembayaran dan belum dapat dipilih.")
    const activeBookings = await ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(100)
    if (activeBookings.some((booking) => booking.roomId === room._id && (booking.status === "pending" || booking.status === "locked"))) throw new Error("Kamar sedang dipesan dan belum dapat dipilih.")
    const name = args.name.trim()
    const phone = args.phone.trim()
    if (!name || !/^\+?[0-9\s-]{9,18}$/.test(phone) || args.amount <= 0) throw new Error("Data pendaftaran belum valid.")
    const proof = await ctx.db.system.get("_storage", args.proofStorageId)
    if (!proof || !proof.contentType?.startsWith("image/")) throw new Error("Bukti pembayaran harus berupa gambar.")
    const normalizedPhone = normalizeIndonesianPhone(phone)
    if (linkedApplication && normalizedPhone !== linkedApplication.applicantPhoneE164) throw new Error("Kamar sudah tidak tersedia.")
    const tenantId = await ctx.db.insert("tenants", { propertyId: property._id, roomId: room._id, name, phone, ...(normalizedPhone ? { tenantPhoneNormalized: normalizedPhone } : {}), startedAt: args.startedAt, dueDay: new Date(args.dueDate).getDate(), status: "pending" })
    const paymentType = args.paymentType ?? "full"
    if (paymentType === "dp" && (!args.deadlineAt || args.deadlineAt <= Date.now())) throw new Error("Batas waktu booking DP wajib di masa depan.")
    const bookingId = paymentType === "dp" ? await ctx.db.insert("bookings", { propertyId: property._id, roomId: room._id, tenantId, depositAmount: args.amount, deadlineAt: args.deadlineAt as number, status: "pending", createdAt: Date.now() }) : undefined
    const dueDateObj = new Date(args.dueDate)
    const billingPeriod = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, "0")}`
    const paymentId = await ctx.db.insert("payments", { propertyId: property._id, tenantId, roomId: room._id, amount: args.amount, paymentType, purpose: paymentType === "dp" ? "dp" : "pelunasan", bookingId, paidAt: Date.now(), dueDate: args.dueDate, billingPeriod, status: "pending_review", proofStorageId: args.proofStorageId })
    await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId, type: "payment_uploaded", channel: "log_only", occurredOn: new Date().toISOString().slice(0, 10), status: "logged", payload: JSON.stringify({ paymentId, tenantName: name, roomNumber: room.roomNumber }) })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendPaymentUploaded, { paymentId })
    if (linkedApplication) await ctx.db.patch(linkedApplication._id, { status: "registration_submitted", bookingId, tenantId, registrationSubmittedAt: Date.now() })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendTenantPaymentPendingNotice, { paymentId })
    return { tenantId, paymentId, bookingId }
  },
})
