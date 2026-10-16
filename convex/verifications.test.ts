import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("owner cannot approve identity review", async () => {
  const t = convexTest(schema, modules)
  const owner = await t.run(async (ctx) => ctx.db.insert("owners", { tokenIdentifier: "identity-owner", role: "owner", identityVerificationStatus: "pending_review" }))
  await expect(t.withIdentity({ tokenIdentifier: "identity-owner" }).mutation(api.verifications.reviewIdentity, { ownerId: owner, decision: "approved" })).rejects.toThrow("Akses admin ditolak.")
})

test("admin can approve pending identity once", async () => {
  const t = convexTest(schema, modules)
  const owner = await t.run(async (ctx) => ctx.db.insert("owners", { tokenIdentifier: "identity-owner-2", role: "owner", identityVerificationStatus: "pending_review" }))
  await t.run(async (ctx) => { await ctx.db.insert("owners", { tokenIdentifier: "identity-admin", role: "admin" }) })
  const admin = t.withIdentity({ tokenIdentifier: "identity-admin" })
  await admin.mutation(api.verifications.reviewIdentity, { ownerId: owner, decision: "approved" })
  await expect(admin.mutation(api.verifications.reviewIdentity, { ownerId: owner, decision: "approved" })).rejects.toThrow("sudah diputuskan")
})

test("identity rejection persists the admin reason", async () => {
  const t = convexTest(schema, modules)
  const owner = await t.run(async (ctx) => ctx.db.insert("owners", { tokenIdentifier: "identity-owner-3", role: "owner", identityVerificationStatus: "pending_review" }))
  await t.run(async (ctx) => { await ctx.db.insert("owners", { tokenIdentifier: "identity-admin-2", role: "admin" }) })
  await t.withIdentity({ tokenIdentifier: "identity-admin-2" }).mutation(api.verifications.reviewIdentity, { ownerId: owner, decision: "rejected", reason: "Foto tidak jelas" })
  const reviewed = await t.run(async (ctx) => ctx.db.get("owners", owner))
  expect(reviewed?.identityVerificationRejectionReason).toBe("Foto tidak jelas")
})

test("pending identity returns storage ids instead of bearer urls", async () => {
  const t = convexTest(schema, modules)
  const storageIds = await t.run(async (ctx) => ({
    ktpStorageId: await ctx.storage.store(new Blob(["ktp"], { type: "image/jpeg" })),
    selfieStorageId: await ctx.storage.store(new Blob(["selfie"], { type: "image/jpeg" })),
  }))
  await t.run(async (ctx) => {
    await ctx.db.insert("owners", {
      tokenIdentifier: "identity-owner-storage",
      role: "owner",
      identityVerificationStatus: "pending_review",
      ktpStorageId: storageIds.ktpStorageId,
      selfieStorageId: storageIds.selfieStorageId,
    })
    await ctx.db.insert("owners", { tokenIdentifier: "identity-admin-storage", role: "admin" })
  })

  const result = await t.withIdentity({ tokenIdentifier: "identity-admin-storage" }).query(api.verifications.listPendingIdentity)

  expect(result).toEqual([
    expect.objectContaining({
      owner: expect.objectContaining({ tokenIdentifier: "identity-owner-storage" }),
      ktpStorageId: storageIds.ktpStorageId,
      selfieStorageId: storageIds.selfieStorageId,
    }),
  ])
  expect(result[0]).not.toHaveProperty("ktpUrl")
  expect(result[0]).not.toHaveProperty("selfieUrl")
})

test("identity review schedules image deletion without changing the decision record", async () => {
  const t = convexTest(schema, modules)
  const owner = await t.run(async (ctx) => ctx.db.insert("owners", { tokenIdentifier: "identity-owner-retention", role: "owner", identityVerificationStatus: "pending_review" }))
  await t.run(async (ctx) => { await ctx.db.insert("owners", { tokenIdentifier: "identity-admin-retention", role: "admin" }) })
  await t.withIdentity({ tokenIdentifier: "identity-admin-retention" }).mutation(api.verifications.reviewIdentity, { ownerId: owner, decision: "approved" })
  const reviewed = await t.run(async (ctx) => ctx.db.get("owners", owner))
  expect(reviewed?.identityVerificationStatus).toBe("verified")
  expect(reviewed?.identityVerificationReviewedAt).toBeTypeOf("number")
  expect(reviewed?.identityVerificationFilesDeleteAfter).toBe(reviewed!.identityVerificationReviewedAt! + 90 * 24 * 60 * 60 * 1000)
})
