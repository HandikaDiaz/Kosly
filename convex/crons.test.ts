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
  expect(first.processed).toBe(1)
  expect(second.processed).toBe(0)
})
