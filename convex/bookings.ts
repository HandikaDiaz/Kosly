import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { requireOwner, requirePropertyOwner } from "./lib/auth"
import { markCurrentPeriodPaid } from "./rentCharges"

export type BookingStatus = "pending" | "locked" | "paid_off" | "expired"
export type BookingAction = "confirm_deposit" | "settle" | "expire"

export const getBookingTransition = (status: BookingStatus, action: BookingAction, now: number, deadlineAt: number) => {
  if (action === "confirm_deposit" && status === "pending" && now <= deadlineAt) return "locked" as const
  if (action === "settle" && status === "locked") return "paid_off" as const
  if (action === "expire" && status === "locked" && now > deadlineAt) return "expired" as const
  return "invalid" as const
}

const getBooking = async (ctx: MutationCtx, bookingId: Id<"bookings">) => {
  const booking = await ctx.db.get("bookings", bookingId)
  if (!booking) throw new Error("Booking tidak ditemukan.")
  return booking
}

const assertBookingGraph = async (ctx: MutationCtx, bookingId: Id<"bookings">) => {
  const booking = await getBooking(ctx, bookingId)
  const property = await ctx.db.get("properties", booking.propertyId)
  const room = await ctx.db.get("rooms", booking.roomId)
  const tenant = await ctx.db.get("tenants", booking.tenantId)
  if (!property || !room || !tenant || room.propertyId !== property._id || tenant.roomId !== room._id || tenant.propertyId !== property._id) throw new Error("Data booking tidak konsisten.")
  return { booking, property, room, tenant }
}

export const createPending = mutation({
  args: { propertyId: v.id("properties"), roomId: v.id("rooms"), tenantId: v.id("tenants"), depositAmount: v.number(), deadlineAt: v.number() },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    if (args.depositAmount <= 0 || args.deadlineAt <= Date.now()) throw new Error("Nominal DP dan batas waktu booking belum valid.")
    const room = await ctx.db.get("rooms", args.roomId)
    const tenant = await ctx.db.get("tenants", args.tenantId)
    if (!room || room.propertyId !== args.propertyId || room.status !== "available") throw new Error("Kamar tidak tersedia.")
    if (!tenant || tenant.propertyId !== args.propertyId || tenant.roomId !== args.roomId) throw new Error("Tenant booking tidak valid.")
    const pending = await ctx.db.query("bookings").withIndex("by_room_and_status", (q) => q.eq("roomId", args.roomId)).take(20)
    if (pending.some((item) => item.status === "pending" || item.status === "locked")) throw new Error("Kamar sedang memiliki booking aktif.")
    return await ctx.db.insert("bookings", { propertyId: args.propertyId, roomId: args.roomId, tenantId: args.tenantId, depositAmount: args.depositAmount, deadlineAt: args.deadlineAt, status: "pending", createdAt: Date.now() })
  },
})

export const listActiveForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const pending = await ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId)).filter((q) => q.eq(q.field("status"), "pending")).take(100)
    const locked = await ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId)).filter((q) => q.eq(q.field("status"), "locked")).take(100)
    return [...pending, ...locked]
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    const bookings = (await Promise.all(properties.map((property) => ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(100)))).flat()
    return await Promise.all(bookings.map(async (booking) => ({ booking, property: properties.find((property) => property._id === booking.propertyId) ?? null, room: await ctx.db.get("rooms", booking.roomId), tenant: await ctx.db.get("tenants", booking.tenantId) })))
  },
})

export const getMine = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const booking = await ctx.db.get("bookings", args.bookingId)
    if (!booking) return null
    const property = await ctx.db.get("properties", booking.propertyId)
    return property?.ownerId === owner._id ? booking : null
  },
})

export const confirmDepositForOwner = async (ctx: MutationCtx, bookingId: Id<"bookings">, paymentId: Id<"payments">, ownerId: Id<"owners">) => {
  const { booking, property, room, tenant } = await assertBookingGraph(ctx, bookingId)
  if (property.ownerId !== ownerId) throw new Error("Akses booking ditolak.")
  const payment = await ctx.db.get("payments", paymentId)
  if (!payment || payment.bookingId !== bookingId || payment.status !== "pending_review") throw new Error("Pembayaran DP tidak cocok dengan booking.")
  if (getBookingTransition(booking.status, "confirm_deposit", Date.now(), booking.deadlineAt) !== "locked") throw new Error("Batas waktu booking sudah lewat atau booking sudah diproses.")
  if (room.status !== "available") throw new Error("Kamar sudah tidak tersedia.")
  const now = Date.now()
  await ctx.db.patch("payments", payment._id, { status: "confirmed", reviewerOwnerId: ownerId, reviewedAt: now })
  // Record dp_confirmed_at so tenant can choose settlement_deadline
  await ctx.db.patch("bookings", booking._id, { status: "locked", confirmedAt: now, dp_confirmed_at: now })
  await ctx.db.patch("rooms", room._id, { status: "booked" })
  return { tenantId: tenant._id, propertyId: property._id }
}

export const confirmSettlementForOwner = async (ctx: MutationCtx, bookingId: Id<"bookings">, paymentId: Id<"payments">, ownerId: Id<"owners">) => {
  const { booking, property, room, tenant } = await assertBookingGraph(ctx, bookingId)
  if (property.ownerId !== ownerId) throw new Error("Akses booking ditolak.")
  const payment = await ctx.db.get("payments", paymentId)
  if (!payment || payment.bookingId !== bookingId || payment.status !== "pending_review") throw new Error("Pembayaran pelunasan tidak cocok dengan booking.")
  if (getBookingTransition(booking.status, "settle", Date.now(), booking.deadlineAt) !== "paid_off") throw new Error("Booking belum terkunci.")
  await ctx.db.patch("payments", payment._id, { status: "confirmed", reviewerOwnerId: ownerId, reviewedAt: Date.now() })
  await ctx.db.patch("bookings", booking._id, { status: "paid_off" })
  await ctx.db.patch("rooms", room._id, { status: "occupied" })
  await ctx.db.patch("tenants", tenant._id, { status: "active", lifecycle_status: "active" })
  await markCurrentPeriodPaid(ctx, tenant._id, payment._id, payment.amount, Date.now())
  return { tenantId: tenant._id, propertyId: property._id }
}

export const confirmDeposit = mutation({
  args: { bookingId: v.id("bookings"), paymentId: v.id("payments") },
    handler: async (ctx, args) => { const owner = await requireOwner(ctx); return await confirmDepositForOwner(ctx, args.bookingId, args.paymentId, owner._id) },
})

export const confirmSettlement = mutation({
  args: { bookingId: v.id("bookings"), paymentId: v.id("payments") },
    handler: async (ctx, args) => { const owner = await requireOwner(ctx); return await confirmSettlementForOwner(ctx, args.bookingId, args.paymentId, owner._id) },
})

/**
 * Tenant-facing: choose the settlement date after DP is confirmed by owner.
 * settlement_deadline must be within dp_confirmed_at + room.dp_max_days.
 * Called from the public booking page (slug-keyed, phone-verified).
 */
export const setSettlementDeadline = mutation({
  args: { bookingId: v.id("bookings"), slug: v.string(), phone: v.string(), settlementDeadline: v.number() },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get("bookings", args.bookingId)
    if (!booking || booking.status !== "locked") throw new Error("Booking tidak dalam status terkunci.")
    if (!booking.dp_confirmed_at) throw new Error("DP belum dikonfirmasi pemilik.")

    // Verify caller is the tenant (slug + phone)
    const normalizeSlug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const property = await ctx.db.get("properties", booking.propertyId)
    if (!property || normalizeSlug(property.slug) !== normalizeSlug(args.slug)) throw new Error("Properti tidak ditemukan.")
    const tenant = await ctx.db.get("tenants", booking.tenantId)
    if (!tenant || tenant.phone.replace(/[^0-9]/g, "") !== args.phone.replace(/[^0-9]/g, "")) throw new Error("Data tenant tidak cocok.")

    // Enforce dp_max_days ceiling
    const room = await ctx.db.get("rooms", booking.roomId)
    const maxDays = room?.dp_max_days ?? 30
    const maxDeadline = booking.dp_confirmed_at + maxDays * 24 * 60 * 60 * 1000
    const now = Date.now()
    if (args.settlementDeadline <= now) throw new Error("Tanggal pelunasan harus di masa depan.")
    if (args.settlementDeadline > maxDeadline) throw new Error(`Tanggal pelunasan maksimal ${maxDays} hari setelah DP dikonfirmasi.`)

    await ctx.db.patch("bookings", booking._id, { settlement_deadline: args.settlementDeadline })
    return { settlement_deadline: args.settlementDeadline }
  },
})

export const expire = internalMutation({
  args: { bookingId: v.id("bookings"), now: v.number() },
  handler: async (ctx, args) => {
    const { booking, room } = await assertBookingGraph(ctx, args.bookingId)
    if (getBookingTransition(booking.status, "expire", args.now, booking.deadlineAt) !== "expired") return false
    await ctx.db.patch("bookings", booking._id, { status: "expired", expiredAt: args.now })
    if (room.status === "booked") await ctx.db.patch("rooms", room._id, { status: "available" })
    return true
  },
})

export const expireLocked = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const candidates = await ctx.db.query("bookings").withIndex("by_status_and_deadline", (q) => q.eq("status", "locked")).take(500)
    let expired = 0
    for (const booking of candidates) {
      if (booking.deadlineAt >= now) continue
      const graph = await assertBookingGraph(ctx, booking._id)
      if (getBookingTransition(graph.booking.status, "expire", now, graph.booking.deadlineAt) !== "expired") continue
      await ctx.db.patch("bookings", graph.booking._id, { status: "expired", expiredAt: now })
      if (graph.room.status === "booked") await ctx.db.patch("rooms", graph.room._id, { status: "available" })
      const changed = true
      if (changed) {
        const property = await ctx.db.get("properties", booking.propertyId)
        if (property) {
          await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: booking.tenantId, type: "dp_expired", channel: "log_only", occurredOn: new Date(now).toISOString().slice(0, 10), status: "logged", payload: JSON.stringify({ bookingId: booking._id }) })
        }
        expired += 1
      }
    }
    return { expired }
  },
})

/**
 * Check locked bookings with a settlement_deadline set:
 * H-1: reminder to tenant (logged)
 * H+1 or later: expire the booking, notify owner
 */
export const processSettlementDeadlines = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const todayDate = new Date(now).toISOString().slice(0, 10)
    const locked = await ctx.db.query("bookings").withIndex("by_status_and_deadline", (q) => q.eq("status", "locked")).take(500)
    let reminded = 0
    let expired = 0

    for (const booking of locked) {
      if (!booking.settlement_deadline) continue
      const property = await ctx.db.get("properties", booking.propertyId)
      const tenant = await ctx.db.get("tenants", booking.tenantId)
      const room = await ctx.db.get("rooms", booking.roomId)
      if (!property || !tenant || !room) continue

      const msToDeadline = booking.settlement_deadline - now
      const daysToDeadline = Math.ceil(msToDeadline / (24 * 60 * 60 * 1000))

      // H-1 reminder
      if (daysToDeadline === 1) {
        const alreadySent = (await ctx.db.query("notification_log").withIndex("by_tenant_and_type_and_date", (q) => q.eq("tenantId", tenant._id)).take(50)).some((n) => n.type === "settlement_reminder" && n.occurredOn === todayDate)
        if (!alreadySent) {
          const deadlineStr = new Date(booking.settlement_deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "settlement_reminder", channel: "log_only", occurredOn: todayDate, status: "logged", payload: JSON.stringify({ bookingId: booking._id, daysLeft: 1, deadline: deadlineStr }) })
          reminded++
        }
      }

      // H+1 or later: settlement_deadline has clearly passed, expire booking
      if (daysToDeadline < -1) {
        await ctx.db.patch("bookings", booking._id, { status: "expired", expiredAt: now })
        if (room.status === "booked") await ctx.db.patch("rooms", room._id, { status: "available" })
        await ctx.db.insert("notification_log", { ownerId: property.ownerId, propertyId: property._id, tenantId: tenant._id, type: "settlement_expired", channel: "log_only", occurredOn: todayDate, status: "logged", payload: JSON.stringify({ bookingId: booking._id }) })
        expired++
      }
    }
    return { reminded, expired }
  },
})
