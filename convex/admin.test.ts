import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("admin approves pending monthly subscription with a period end", async () => {
  const t = convexTest(schema, modules)
  const subscriptionId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "billing-owner", role: "owner" })
    await ctx.db.insert("owners", { tokenIdentifier: "billing-admin", role: "admin" })
    return await ctx.db.insert("subscriptions", { ownerId, tier: "starter", billingCycle: "monthly", priceAmount: 59000, status: "pending_payment", roomCountAtLastCheck: 6 })
  })
  const result = await t.withIdentity({ tokenIdentifier: "billing-admin" }).mutation(api.admin.approveSubscription, { subscriptionId })
  const subscription = await t.run(async (ctx) => ctx.db.get("subscriptions", subscriptionId))
  expect(subscription?.status).toBe("active")
  expect(result.currentPeriodEnd).toBeGreaterThan(Date.now())
})

test("owner cannot approve a subscription", async () => {
  const t = convexTest(schema, modules)
  const data = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "billing-owner-2", role: "owner" })
    const subscriptionId = await ctx.db.insert("subscriptions", { ownerId, tier: "starter", billingCycle: "monthly", priceAmount: 59000, status: "pending_payment", roomCountAtLastCheck: 6 })
    return { subscriptionId }
  })
  await expect(t.withIdentity({ tokenIdentifier: "billing-owner-2" }).mutation(api.admin.approveSubscription, data)).rejects.toThrow("Akses admin ditolak.")
})
