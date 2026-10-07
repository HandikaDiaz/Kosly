import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

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
    return { name: property.name, slug: property.slug, rooms: rooms.filter((room) => room.status === "available").map((room) => ({ _id: room._id, roomNumber: room.roomNumber, monthlyRent: room.monthlyRent })) }
  },
})

export const createSubmission = mutation({
  args: { slug: v.string(), roomId: v.id("rooms"), name: v.string(), phone: v.string(), startedAt: v.number(), dueDate: v.number(), amount: v.number(), paymentType: v.optional(v.union(v.literal("dp"), v.literal("full"))), deadlineAt: v.optional(v.number()), proofStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).unique()
    if (!property || !property.isActive) throw new Error("Link pendaftaran tidak ditemukan.")
    const room = await ctx.db.get("rooms", args.roomId)
    if (!room || room.propertyId !== property._id || room.status !== "available") throw new Error("Kamar sudah tidak tersedia.")
    const name = args.name.trim()
    const phone = args.phone.trim()
    if (!name || !/^\+?[0-9\s-]{9,18}$/.test(phone) || args.amount <= 0) throw new Error("Data pendaftaran belum valid.")
    const proof = await ctx.db.system.get("_storage", args.proofStorageId)
    if (!proof || !proof.contentType?.startsWith("image/")) throw new Error("Bukti pembayaran harus berupa gambar.")
    const tenantId = await ctx.db.insert("tenants", { propertyId: property._id, roomId: room._id, name, phone, startedAt: args.startedAt, dueDay: new Date(args.dueDate).getDate(), status: "pending" })
    const paymentType = args.paymentType ?? "full"
    if (paymentType === "dp" && (!args.deadlineAt || args.deadlineAt <= Date.now())) throw new Error("Batas waktu booking DP wajib di masa depan.")
    const bookingId = paymentType === "dp" ? await ctx.db.insert("bookings", { propertyId: property._id, roomId: room._id, tenantId, depositAmount: args.amount, deadlineAt: args.deadlineAt as number, status: "pending", createdAt: Date.now() }) : undefined
    const dueDateObj = new Date(args.dueDate)
    const billingPeriod = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, "0")}`
    const paymentId = await ctx.db.insert("payments", { propertyId: property._id, tenantId, roomId: room._id, amount: args.amount, paymentType, bookingId, paidAt: Date.now(), dueDate: args.dueDate, billingPeriod, status: "pending_review", proofStorageId: args.proofStorageId })
    await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId, type: "payment_uploaded", channel: "log_only", occurredOn: new Date().toISOString().slice(0, 10), status: "logged", payload: JSON.stringify({ paymentId, tenantName: name, roomNumber: room.roomNumber }) })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendPaymentUploaded, { paymentId })
    return { tenantId, paymentId, bookingId }
  },
})
