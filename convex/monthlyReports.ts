import { internalMutation, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { getEffectiveTier } from "./subscriptions"
import { isPricingEnabled } from "./appSettings"
import { jakartaParts, periodOffset, periodOf } from "../lib/rent-date"

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const dayMs = 86_400_000

const periodBounds = (period: string) => {
  const [yearText, monthText] = period.split("-")
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const start = Date.UTC(year, month, 1)
  return { start, end: Date.UTC(year, month + 1, 1) - 1, label: `${monthNames[month]} ${year}` }
}

const previousPeriod = (period: string) => periodOffset(period, -1)

const latestCompletedPeriod = () => {
  return periodOffset(periodOf(Date.now()), -1)
}

export const getLatestCompletedPeriod = latestCompletedPeriod

const calculatePeriod = async (ctx: Pick<QueryCtx, "db">, propertyId: Id<"properties">, period: string) => {
  const bounds = periodBounds(period)
  const property = await ctx.db.get("properties", propertyId)
  if (!property) return null
  const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", propertyId)).take(500)
  const tenants = await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", propertyId)).take(500)
  const bookings = await ctx.db.query("bookings").withIndex("by_property_and_status", (q) => q.eq("propertyId", propertyId)).take(500)
  const occupiedRoomIds = new Set(tenants.filter((tenant) => tenant.startedAt <= bounds.end && tenant.status === "active" && !(tenant.move_out_date && tenant.move_out_date <= bounds.end)).map((tenant) => String(tenant.roomId)))
  const bookedRoomIds = new Set(bookings.filter((booking) => (booking.status === "pending" || booking.status === "locked") && booking.createdAt <= bounds.end && (!booking.expiredAt || booking.expiredAt > bounds.end)).map((booking) => String(booking.roomId)))
  const occupied = Math.min(occupiedRoomIds.size, rooms.length)
  const booked = Math.min([...bookedRoomIds].filter((roomId) => !occupiedRoomIds.has(roomId)).length, Math.max(rooms.length - occupied, 0))
  const vacant = Math.max(rooms.length - occupied - booked, 0)
  const payments = await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", propertyId).eq("status", "confirmed")).take(1000)
  const cash = payments.filter((payment) => payment.paidAt >= bounds.start && payment.paidAt < bounds.end).reduce((result: { monthlyRent: number; dp: number; settlement: number }, payment) => {
    const purpose = payment.purpose ?? (payment.paymentType === "dp" ? "dp" : "pelunasan")
    if (purpose === "dp") result.dp += payment.amount
    else if (purpose === "sewa_bulanan") result.monthlyRent += payment.amount
    else result.settlement += payment.amount
    return result
  }, { monthlyRent: 0, dp: 0, settlement: 0 })
  const allCharges = await ctx.db.query("rent_charges").withIndex("by_property_and_status", (q) => q.eq("propertyId", propertyId)).take(1000)
  const periodCharges = allCharges.filter((charge) => charge.period === period && charge.status !== "waived")
  const chargedTenantIds = new Set(periodCharges.map((charge) => String(charge.tenantId)))
  const fallbackExpectedRent = tenants
    .filter((tenant) => occupiedRoomIds.has(String(tenant.roomId)) && tenant.status === "active" && !chargedTenantIds.has(String(tenant._id)))
    .reduce((sum, tenant) => sum + (rooms.find((room) => room._id === tenant.roomId)?.monthlyRent ?? 0), 0)
  const expectedRent = periodCharges.reduce((sum, charge) => sum + charge.amount, 0) + fallbackExpectedRent

  const overdueCharges = allCharges.filter((charge) => charge.status === "unpaid")
  const overdue = overdueCharges.filter((charge) => charge.dueDate <= bounds.end).map((charge) => {
    const tenant = tenants.find((item) => item._id === charge.tenantId)
    const room = rooms.find((item) => item._id === charge.roomId)
    return tenant && room ? { name: tenant.name, roomNumber: room.roomNumber, daysLate: Math.max(1, Math.floor((bounds.end - charge.dueDate) / dayMs)), amount: charge.amount } : null
  }).filter((item: { name: string; roomNumber: string; daysLate: number; amount: number } | null): item is { name: string; roomNumber: string; daysLate: number; amount: number } => Boolean(item))
  const newTenants = tenants.filter((tenant) => tenant.startedAt >= bounds.start && tenant.startedAt < bounds.end).map((tenant) => ({ roomNumber: rooms.find((room) => room._id === tenant.roomId)?.roomNumber ?? "-", name: tenant.name, date: jakartaParts(tenant.startedAt).day }))
  const movedOut = tenants.filter((tenant) => tenant.move_out_date && tenant.move_out_date >= bounds.start && tenant.move_out_date < bounds.end).map((tenant) => ({ roomNumber: rooms.find((room) => room._id === tenant.roomId)?.roomNumber ?? "-", name: tenant.name, date: jakartaParts(tenant.move_out_date as number).day }))
  const vacating = tenants
    .filter((tenant) => tenant.status === "active" && (tenant.lifecycle_status === "akan_pindah" || tenant.leaseDecision === "not_continuing"))
    .map((tenant) => ({
      roomNumber: rooms.find((room) => room._id === tenant.roomId)?.roomNumber ?? "-",
      name: tenant.name,
      moveOutDate: tenant.move_out_date ?? tenant.leaseEndsAt ?? null,
    }))
  return { occupied, vacant, booked, total: rooms.length, occupancyRate: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0, expectedRent, cash, overdue, newTenants, movedOut, vacating }
}

export const getReportData = internalQuery({
  args: { ownerId: v.id("owners"), propertyId: v.id("properties"), period: v.string() },
  handler: async (ctx, args) => {
    const property = await ctx.db.get("properties", args.propertyId)
    if (!property || property.ownerId !== args.ownerId || !property.isActive) return null
    const current = await calculatePeriod(ctx, args.propertyId, args.period)
    const previous = await calculatePeriod(ctx, args.propertyId, previousPeriod(args.period))
    if (!current || !previous) return null
    return { property: { name: property.name, slug: property.slug, address: property.address }, period: args.period, label: periodBounds(args.period).label, current, previous }
  },
})

export const saveReport = internalMutation({
  args: { ownerId: v.id("owners"), propertyId: v.id("properties"), period: v.string(), storageId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("monthly_reports", { ...args, generatedAt: Date.now() })
  },
})

export const scheduleForEligibleOwners = internalMutation({
  args: {},
  handler: async (ctx) => {
    const period = latestCompletedPeriod()
    const pricingEnabled = await isPricingEnabled(ctx)
    let scheduled = 0
    if (!pricingEnabled) {
      const properties = await ctx.db.query("properties").take(500)
      for (const property of properties.filter((item) => item.isActive)) {
        await ctx.scheduler.runAfter(0, internal.monthlyReportsActions.generateAndDeliver, { ownerId: property.ownerId, propertyId: property._id, period })
        scheduled += 1
      }
      return { scheduled, period }
    }
    const subscriptions = await ctx.db.query("subscriptions").withIndex("by_status", (q) => q.eq("status", "active")).take(500)
    for (const subscription of subscriptions) {
      if (getEffectiveTier(subscription) !== "growth" && getEffectiveTier(subscription) !== "pro") continue
      const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", subscription.ownerId)).take(50)
      for (const property of properties.filter((item) => item.isActive)) {
        await ctx.scheduler.runAfter(0, internal.monthlyReportsActions.generateAndDeliver, { ownerId: subscription.ownerId, propertyId: property._id, period })
        scheduled += 1
      }
    }
    return { scheduled, period }
  },
})

export const getSimulationContext = internalQuery({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    let property = args.propertyId ? await ctx.db.get("properties", args.propertyId) : null
    if (!property) {
      property = await ctx.db.query("properties").filter((q) => q.eq(q.field("isActive"), true)).first()
    }
    if (!property) {
      property = await ctx.db.query("properties").first()
    }
    if (!property) return null
    const owner = await ctx.db.get("owners", property.ownerId)
    if (!owner) return null
    return {
      ownerId: owner._id,
      propertyId: property._id,
      propertyName: property.name,
      propertySlug: property.slug,
      defaultPeriod: latestCompletedPeriod(),
    }
  },
})
