import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("subscription period processing marks expired subscriptions past due once", async () => {
  const t = convexTest(schema, modules)
  const subscriptionId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "cron-owner", role: "owner" })
    return await ctx.db.insert("subscriptions", { ownerId, tier: "starter", billingCycle: "monthly", priceAmount: 59000, status: "active", currentPeriodEnd: Date.now() - 86400000, roomCountAtLastCheck: 6 })
  })
  const first = await t.mutation(internal.crons.processSubscriptionPeriods, {})
  const second = await t.mutation(internal.crons.processSubscriptionPeriods, {})
  const subscription = await t.run(async (ctx) => ctx.db.get("subscriptions", subscriptionId))
  expect(subscription?.status).toBe("past_due")
  expect(first.markedPastDue).toBe(1)
  expect(second.markedPastDue).toBe(0)
})

test("reminder simulation is internal and cannot cross owner boundaries", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerA = await ctx.db.insert("owners", { tokenIdentifier: "cron-owner-a", role: "owner" })
    const ownerB = await ctx.db.insert("owners", { tokenIdentifier: "cron-owner-b", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId: ownerA, name: "Kos A", address: "Alamat A", slug: "kos-a", isActive: true })
    const roomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "A1", monthlyRent: 1_000_000, status: "occupied" })
    const tenantId = await ctx.db.insert("tenants", { propertyId, roomId, name: "Tenant A", phone: "08123456789", startedAt: Date.now(), dueDay: 1, status: "active" })
    return { ownerA, ownerB, tenantId }
  })

  await expect(t.mutation(internal.crons.simulateReminder, { ownerId: setup.ownerB, tenantId: setup.tenantId, scenario: "due_today" })).rejects.toThrow("Data properti atau kamar tenant tidak lengkap.")
})

