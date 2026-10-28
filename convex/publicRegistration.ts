import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { normalizeIndonesianPhone } from "./lib/tenantIdentity"
import { assertRoomBookable, getRoomHoldBlockers } from "./lib/roomHolds"
import { MAX_HINT_LOOKUPS_PER_HOUR_GLOBAL, MAX_LINK_ATTEMPTS_PER_APPLICATION, parseRegistrationCode } from "./lib/registrationLink"
import { dueDayFromTimestamp, jakartaDateKey, periodOf, startOfDayJakarta } from "../lib/rent-date"

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
    const now = Date.now()
    const availableRooms = []
    for (const room of rooms) if ((await getRoomHoldBlockers(ctx, room._id, now)).length === 0) availableRooms.push(room)
    return { name: property.name, slug: property.slug, rooms: availableRooms.map((room) => ({ _id: room._id, roomNumber: room.roomNumber, monthlyRent: room.monthlyRent, annualRent: room.annualRent, depositFee: room.depositFee, dpAmount: room.dpAmount })) }
  },
})

export const getRegistrationHint = query({
  args: { registrationSlug: v.optional(v.string()), slug: v.optional(v.string()), applicationCode: v.string() },
  handler: async (ctx, args) => {
    const counter = await ctx.db.query("linkLookupCounters").withIndex("by_window_start", (q) => q.eq("windowStart", Math.floor(Date.now() / 3_600_000) * 3_600_000)).unique()
    if (counter && counter.count >= MAX_HINT_LOOKUPS_PER_HOUR_GLOBAL) return { valid: false as const }
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.registrationSlug ?? args.slug ?? ""))).unique()
    const code = parseRegistrationCode(args.applicationCode)
    const application = code ? await ctx.db.query("rentalApplications").withIndex("by_code", (q) => q.eq("code", code)).unique() : null
    if (!property || !application || application.propertyId !== property._id || application.status !== "accepted" || (application.holdExpiresAt ?? 0) <= Date.now()) return { valid: false as const }
    const room = await ctx.db.get("rooms", application.roomId)
    if (!room) return { valid: false as const }
    if ((await getRoomHoldBlockers(ctx, room._id, Date.now())).every((row) => row.applicationId === application._id)) return { valid: true as const, roomId: room._id, roomLabel: room.roomNumber, kosName: property.name, moveInDate: application.moveInDate }
    return { valid: false as const }
  },
})

export const recordRegistrationHintLookup = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const windowStart = Math.floor(Date.now() / 3_600_000) * 3_600_000
    const current = await ctx.db.query("linkLookupCounters").withIndex("by_window_start", (q) => q.eq("windowStart", windowStart)).unique()
    if (current && current.count >= MAX_HINT_LOOKUPS_PER_HOUR_GLOBAL) return false
    if (current) await ctx.db.patch("linkLookupCounters", current._id, { count: current.count + 1 })
    else await ctx.db.insert("linkLookupCounters", { windowStart, count: 1 })
    return true
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
    if (!room || room.propertyId !== property._id) throw new Error("Kamar ini sedang tidak tersedia.")
    const code = args.applicationCode ? parseRegistrationCode(args.applicationCode) : null
    const linkedApplication = code ? await ctx.db.query("rentalApplications").withIndex("by_code", (q) => q.eq("code", code)).unique() : null
    const linkMatches = Boolean(linkedApplication && linkedApplication.propertyId === property._id && linkedApplication.roomId === room._id && linkedApplication.status === "accepted" && (linkedApplication.holdExpiresAt ?? 0) > Date.now() && (linkedApplication.linkAttempts ?? 0) < MAX_LINK_ATTEMPTS_PER_APPLICATION)
    if (args.applicationCode && !linkMatches) {
      if (linkedApplication) {
        const attempts = Math.min(MAX_LINK_ATTEMPTS_PER_APPLICATION, (linkedApplication.linkAttempts ?? 0) + 1)
        await ctx.db.patch("rentalApplications", linkedApplication._id, { linkAttempts: attempts })
        if (attempts >= MAX_LINK_ATTEMPTS_PER_APPLICATION) {
          const owner = await ctx.db.get("owners", linkedApplication.propertyId === property._id ? property.ownerId : property.ownerId)
          if (owner) await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: owner._id, text: `Tautan pendaftaran ${linkedApplication.code} mencapai batas percobaan dan perlu diperiksa.` })
        }
      }
      throw new Error("Kamar ini sedang tidak tersedia.")
    }
    await assertRoomBookable(ctx, room._id, Date.now(), linkMatches ? { applicationCode: linkedApplication?.code } : undefined)
    const name = args.name.trim()
    const phone = args.phone.trim()
    if (!name || !/^\+?[0-9\s-]{9,18}$/.test(phone) || args.amount <= 0) throw new Error("Data pendaftaran belum valid.")
    const proof = await ctx.db.system.get("_storage", args.proofStorageId)
    if (!proof || !proof.contentType?.startsWith("image/")) throw new Error("Bukti pembayaran harus berupa gambar.")
    const normalizedPhone = normalizeIndonesianPhone(phone)
    if (linkedApplication && normalizedPhone !== linkedApplication.applicantPhoneE164) {
      const attempts = (linkedApplication.linkAttempts ?? 0) + 1
      await ctx.db.patch("rentalApplications", linkedApplication._id, { linkAttempts: Math.min(MAX_LINK_ATTEMPTS_PER_APPLICATION, attempts) })
      throw new Error("Kamar ini sedang tidak tersedia.")
    }
    const tenantId = await ctx.db.insert("tenants", { propertyId: property._id, roomId: room._id, name, phone, ...(normalizedPhone ? { tenantPhoneNormalized: normalizedPhone } : {}), startedAt: startOfDayJakarta(args.startedAt), dueDay: dueDayFromTimestamp(args.dueDate), status: "pending", dataOrigin: "registration" })
    const paymentType = args.paymentType ?? "full"
    if (paymentType === "dp" && (!args.deadlineAt || args.deadlineAt <= Date.now())) throw new Error("Batas waktu booking DP wajib di masa depan.")
    const bookingId = paymentType === "dp" ? await ctx.db.insert("bookings", { propertyId: property._id, roomId: room._id, tenantId, depositAmount: args.amount, deadlineAt: args.deadlineAt as number, status: "pending", createdAt: Date.now() }) : undefined
    const billingPeriod = periodOf(args.dueDate)
    const paymentId = await ctx.db.insert("payments", { propertyId: property._id, tenantId, roomId: room._id, amount: args.amount, paymentType, purpose: paymentType === "dp" ? "dp" : "pelunasan", bookingId, paidAt: Date.now(), dueDate: args.dueDate, billingPeriod, status: "pending_review", proofStorageId: args.proofStorageId, origin: "registration" })
    await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId, type: "payment_uploaded", channel: "log_only", occurredOn: jakartaDateKey(Date.now()), status: "logged", payload: JSON.stringify({ paymentId, tenantName: name, roomNumber: room.roomNumber }) })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendPaymentUploaded, { paymentId })
    if (linkedApplication) await ctx.db.patch(linkedApplication._id, { status: "registration_submitted", bookingId, tenantId, registrationSubmittedAt: Date.now() })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendTenantPaymentPendingNotice, { paymentId })
    return { tenantId, paymentId, bookingId }
  },
})
