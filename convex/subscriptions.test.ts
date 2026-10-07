import { expect, test } from "vitest"
import { getTierForRoomCount, getTierPrice } from "./lib/subscription-tiers"
import { convexTest } from "convex-test"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("maps exact room boundaries to the expected tier", () => {
  expect(getTierForRoomCount(0)).toBe("free")
  expect(getTierForRoomCount(5)).toBe("free")
  expect(getTierForRoomCount(6)).toBe("starter")
  expect(getTierForRoomCount(20)).toBe("starter")
  expect(getTierForRoomCount(21)).toBe("growth")
  expect(getTierForRoomCount(40)).toBe("growth")
  expect(getTierForRoomCount(41)).toBe("pro")
})

test("uses historical tier prices by billing cycle", () => {
  expect(getTierPrice("free", "none")).toBe(0)
  expect(getTierPrice("starter", "monthly")).toBe(59000)
  expect(getTierPrice("growth", "annual")).toBe(1090000)
  expect(getTierPrice("pro", "monthly")).toBe(199000)
})

test("counts rooms across all owner properties without auto-upgrading", async () => {
  const t = convexTest(schema, modules)
  const result = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "tier-owner", role: "owner" })
    const firstPropertyId = await ctx.db.insert("properties", { ownerId, name: "A", address: "A", slug: "a", isActive: true })
    const secondPropertyId = await ctx.db.insert("properties", { ownerId, name: "B", address: "B", slug: "b", isActive: true })
    for (let index = 0; index < 10; index += 1) await ctx.db.insert("rooms", { propertyId: firstPropertyId, roomNumber: `A-${index}`, status: "available", monthlyRent: 1000 })
    for (let index = 0; index < 11; index += 1) await ctx.db.insert("rooms", { propertyId: secondPropertyId, roomNumber: `B-${index}`, status: "available", monthlyRent: 1000 })
    const subscriptionId = await ctx.db.insert("subscriptions", { ownerId, tier: "starter", billingCycle: "monthly", priceAmount: 59000, status: "active", roomCountAtLastCheck: 0 })
    return { ownerId, subscriptionId }
  })

  const recalculated = await t.withIdentity({ tokenIdentifier: "tier-owner" }).mutation(api.subscriptions.recalculateForOwner, { ownerId: result.ownerId })
  expect(recalculated.roomCount).toBe(21)
  expect(recalculated.recommendedTier).toBe("growth")
  expect(recalculated.activeTier).toBe("starter")
  const subscription = await t.run(async (ctx) => ctx.db.get("subscriptions", result.subscriptionId))
  expect(subscription?.tier).toBe("starter")
  expect(subscription?.roomCountAtLastCheck).toBe(21)
})

test("owner cannot recalculate another owner's subscription", async () => {
  const t = convexTest(schema, modules)
  const targetOwnerId = await t.run(async (ctx) => ctx.db.insert("owners", { tokenIdentifier: "target-owner", role: "owner" }))
  await expect(t.withIdentity({ tokenIdentifier: "caller-owner" }).mutation(api.owners.ensureCurrentOwner, {})).resolves.toBeTruthy()
  await expect(t.withIdentity({ tokenIdentifier: "caller-owner" }).mutation(api.subscriptions.recalculateForOwner, { ownerId: targetOwnerId })).rejects.toThrow("Akses subscription ditolak.")
})
