import { expect, test } from "vitest"
import { convexTest } from "convex-test"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("schema exposes the stage one operational tables", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await t.run(async (ctx) => ctx.db.insert("owners", { tokenIdentifier: "test-owner", name: "Pemilik Test", email: "test@example.com", onboardingCompleted: false, createdAt: Date.now() }))
  const propertyId = await t.run(async (ctx) => ctx.db.insert("properties", { ownerId, name: "Kost Test", address: "Jl. Test 1", slug: "kost-test", isActive: true }))
  const roomId = await t.run(async (ctx) => ctx.db.insert("rooms", { propertyId, roomNumber: "01", status: "available", monthlyRent: 1500000 }))
  expect(ownerId).toBeTruthy()
  expect(propertyId).toBeTruthy()
  expect(roomId).toBeTruthy()
})
