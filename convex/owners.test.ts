import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("onboarding rejects fewer than three property photos", async () => {
  const t = convexTest(schema, modules)
  const owner = t.withIdentity({ tokenIdentifier: "photo-owner" })
  await owner.mutation(api.owners.ensureCurrentOwner, {})
  const photoId = await t.run(async (ctx) => ctx.storage.store(new File(["photo"], "photo.jpg", { type: "image/jpeg" })))

  await expect(owner.mutation(api.owners.completeOnboarding, {
    ownerName: "Owner",
    propertyName: "Kos Test",
    address: "Jalan Test",
    slug: "kos-test",
    rooms: [],
    propertyPhotoStorageIds: [photoId, photoId],
  })).rejects.toThrow("Minimal 3 foto kos wajib diunggah.")
})

test("onboarding stores three valid property photos", async () => {
  const t = convexTest(schema, modules)
  const owner = t.withIdentity({ tokenIdentifier: "photo-owner-2" })
  await owner.mutation(api.owners.ensureCurrentOwner, {})
  const photoIds = await Promise.all([1, 2, 3].map(() => t.run(async (ctx) => ctx.storage.store(new File(["photo"], "photo.jpg", { type: "image/jpeg" })))))

  const result = await owner.mutation(api.owners.completeOnboarding, {
    ownerName: "Owner",
    propertyName: "Kos Test",
    address: "Jalan Test",
    slug: "kos-test-2",
    rooms: [],
    propertyPhotoStorageIds: photoIds,
  })
  const photos = await t.run(async (ctx) => ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", result.propertyId)).take(10))
  expect(photos).toHaveLength(3)
})
