import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("public property output keeps pending properties public but hides verification badge", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "public-owner", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos Publik", address: "Jalan Publik", slug: "kos-publik", isActive: true, propertyVerificationStatus: "pending_review" })
    await ctx.db.insert("property_photos", { propertyId, storageId: await ctx.storage.store(new File(["photo"], "photo.jpg", { type: "image/jpeg" })), sortOrder: 0, createdAt: Date.now() })
  })
  const result = await t.query(api.properties.getPublicBySlug, { slug: "kos-publik" })
  expect(result?.isVerified).toBe(false)
  expect(result?.photos).toHaveLength(1)
})

test("public property output hides rooms with payments awaiting verification", async () => {
  const t = convexTest(schema, modules)
  const { propertyId, roomId, tenantId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "owner-with-pending-room", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos Pending", address: "Jalan Pending", slug: "kos-pending", isActive: true })
    const roomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "1", status: "available", monthlyRent: 1500000 })
    const tenantId = await ctx.db.insert("tenants", { propertyId, roomId, name: "Calon Tenant", phone: "08123456789", startedAt: Date.now(), dueDay: 1, status: "pending" })
    return { propertyId, roomId, tenantId }
  })
  await t.run(async (ctx) => {
    await ctx.db.insert("payments", { propertyId, tenantId, roomId, amount: 500000, paymentType: "dp", purpose: "dp", paidAt: Date.now(), dueDate: Date.now(), status: "pending_review" })
  })
  const result = await t.query(api.properties.getPublicBySlug, { slug: "kos-pending" })
  expect(result?.rooms).toHaveLength(0)
})
