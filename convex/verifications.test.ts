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
