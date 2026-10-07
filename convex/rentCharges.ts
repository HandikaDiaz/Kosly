import { internalMutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { requireOwner } from "./lib/auth"
import { dueDateForPeriod, periodOf } from "../lib/rent-date"

export const ensureChargesForPeriod = async (ctx: MutationCtx, now: number) => {
  const date = new Date(now)
  const period = periodOf(date)
  const tenants = await ctx.db.query("tenants").withIndex("by_status_and_due_day", (q) => q.eq("status", "active")).take(500)
  let created = 0
  for (const tenant of tenants) {
    const existing = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenant._id).eq("period", period)).unique()
    if (existing) continue
    const room = await ctx.db.get("rooms", tenant.roomId)
    if (!room) continue
    await ctx.db.insert("rent_charges", { propertyId: tenant.propertyId, tenantId: tenant._id, roomId: room._id, period, amount: room.monthlyRent, dueDate: dueDateForPeriod(period, tenant.dueDay), status: "unpaid", createdAt: now })
    created += 1
  }
  return { created }
}

export const markCurrentPeriodPaid = async (ctx: MutationCtx, tenantId: Id<"tenants">, paymentId: Id<"payments">, amount: number, now: number, preferredPeriod?: string) => {
  const tenant = await ctx.db.get("tenants", tenantId)
  if (!tenant) return
  const room = await ctx.db.get("rooms", tenant.roomId)
  if (!room) return
  const date = new Date(now)
  const targetPeriod = preferredPeriod || periodOf(date)
  const existing = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenantId).eq("period", targetPeriod)).unique()
  if (existing) {
    await ctx.db.patch("rent_charges", existing._id, { status: "paid", paymentId, paidAt: now, amount })
    return
  }
  const oldestUnpaid = (await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenantId)).collect()).find((c) => c.status === "unpaid")
  if (oldestUnpaid) {
    await ctx.db.patch("rent_charges", oldestUnpaid._id, { status: "paid", paymentId, paidAt: now, amount })
    return
  }
  await ctx.db.insert("rent_charges", { propertyId: tenant.propertyId, tenantId: tenant._id, roomId: room._id, period: targetPeriod, amount, dueDate: dueDateForPeriod(targetPeriod, tenant.dueDay), status: "paid", paymentId, createdAt: now, paidAt: now })
}

export const ensureCurrentPeriod = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => ensureChargesForPeriod(ctx, args.now),
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(50)
    return (await Promise.all(properties.map((property) => ctx.db.query("rent_charges").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).take(200)))).flat()
  },
})
