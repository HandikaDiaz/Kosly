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
