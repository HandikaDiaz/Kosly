import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import { hashToken } from "./lib/reviewRules"
import { SHARE_CONSENT_VERSION } from "./lib/raporRules"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("consent is explicit, server-hashed, withdrawable, and preview works without consent", async () => {
  const t = convexTest(schema, modules)
  const token = "tenant-session-token"
  const setup = await t.run(async (ctx) => {
    const identityId = await ctx.db.insert("tenantIdentities", { phoneE164: "+628123456789", verifiedVia: "whatsapp", createdAt: Date.now(), lastVerifiedAt: Date.now(), noticeAcceptedAt: Date.now(), noticeVersion: "2026-10-v1", status: "active" })
    await ctx.db.insert("tenantSessions", { identityId, tokenHash: await hashToken(token), createdAt: Date.now(), expiresAt: Date.now() + 86_400_000 })
    return identityId
  })
  const text = await t.query(api.tenantRapor.getShareConsentText, {})
  const preview = await t.query(api.tenantRapor.previewMyRapor, { sessionToken: token })
  expect(preview.available).toBe(false)
  const granted = await t.mutation(api.tenantRapor.grantShareConsent, { sessionToken: token, textVersion: SHARE_CONSENT_VERSION })
  expect(granted.active).toBe(true)
  await expect(t.run(async (ctx) => ctx.runQuery(internal.tenantRapor.computeRaporForShare, { identityId: setup }))).resolves.toEqual({ available: false })
  const consent = await t.run(async (ctx) => ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", setup).eq("purpose", "share_rapor")).unique())
  expect(consent?.textSha256).toBe(await hashToken(`${text.title}\n${text.paragraphs.join("\n")}`))
  expect(await t.mutation(api.tenantRapor.withdrawShareConsent, { sessionToken: token })).toEqual({ active: false })
  await expect(t.run(async (ctx) => ctx.runQuery(internal.tenantRapor.computeRaporForShare, { identityId: setup }))).rejects.toThrow("Rapor tidak tersedia")
  await expect(t.mutation(api.tenantRapor.grantShareConsent, { sessionToken: token, textVersion: "wrong" })).rejects.toThrow()
})

test("payment records omit nominal and owner identity, and owner agreement excludes period", async () => {
  const t = convexTest(schema, modules)
  const token = "tenant-session-token-2"
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "owner-rapor", name: "Pemilik Rahasia", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos Uji", address: "Alamat", slug: "kos-uji", isActive: true })
    const roomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "A1", status: "occupied", monthlyRent: 1 })
    const tenancyId = await ctx.db.insert("tenants", { propertyId, roomId, name: "Penyewa", phone: "08123456789", startedAt: Date.now() - 90 * 86_400_000, dueDay: 1, status: "active" })
    const paymentId = await ctx.db.insert("payments", { propertyId, tenantId: tenancyId, roomId, amount: 1234567, paidAt: Date.now() - 20 * 86_400_000, dueDate: Date.now() - 21 * 86_400_000, billingPeriod: "2026-09", status: "confirmed", purpose: "sewa_bulanan" })
    const chargeId = await ctx.db.insert("rent_charges", { propertyId, tenantId: tenancyId, roomId, period: "2026-09", amount: 1234567, dueDate: Date.now() - 21 * 86_400_000, status: "paid", paymentId, paidAt: Date.now() - 20 * 86_400_000, createdAt: Date.now() - 30 * 86_400_000 })
    const identityId = await ctx.db.insert("tenantIdentities", { phoneE164: "+628123456789", verifiedVia: "whatsapp", createdAt: Date.now(), lastVerifiedAt: Date.now(), noticeAcceptedAt: Date.now(), noticeVersion: "2026-10-v1", status: "active" })
    await ctx.db.insert("tenantSessions", { identityId, tokenHash: await hashToken(token), createdAt: Date.now(), expiresAt: Date.now() + 86_400_000 })
    await ctx.db.insert("tenancyIdentityLinks", { identityId, tenancyId, status: "confirmed", createdAt: Date.now() })
    return { ownerId, propertyId, chargeId }
  })
  const records = await t.query(api.tenantRapor.listMyPaymentRecords, { sessionToken: token })
  expect(records[0]).not.toHaveProperty("amount")
  expect(records[0]).not.toHaveProperty("ownerName")
  const dispute = await t.mutation(api.tenantRapor.createPaymentDispute, { sessionToken: token, periodId: String(setup.chargeId), reason: "sudah_bayar" })
  await t.withIdentity({ tokenIdentifier: "owner-rapor" }).mutation(api.tenantRapor.ownerRespondToDispute, { disputeId: dispute.disputeId, decision: "agree" })
  const ownerRows = await t.withIdentity({ tokenIdentifier: "owner-rapor" }).query(api.tenantRapor.ownerListDisputes, { propertyId: setup.propertyId })
  expect(ownerRows[0]).not.toHaveProperty("phoneE164")
})
