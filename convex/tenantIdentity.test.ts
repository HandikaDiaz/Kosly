import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("verification requires notice acceptance and never exposes code hash", async () => {
  const t = convexTest(schema, modules)
  await expect(t.mutation(api.tenantIdentity.startVerification, { noticeAccepted: false })).rejects.toThrow()
  const challenge = await t.mutation(api.tenantIdentity.startVerification, { noticeAccepted: true })
  expect(challenge.code).toMatch(/^BK-[A-Z2-9]{8}$/)
  expect(challenge).not.toHaveProperty("codeHash")
  expect(await t.query(api.tenantIdentity.getChallengeStatus, { challengeId: challenge.challengeId, pollSecret: "wrong" })).toBeNull()
})

test("WhatsApp code verification links only normalized tenant phone after explicit confirmation", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await t.run(async (ctx) => ctx.db.insert("properties", { ownerId: await ctx.db.insert("owners", { tokenIdentifier: "test-owner", name: "Owner", email: "owner@example.com", role: "owner" }), name: "Kos Uji", slug: "kos-uji", address: "Alamat", isActive: true, isPublished: true }))
  const roomId = await t.run(async (ctx) => ctx.db.insert("rooms", { propertyId, roomNumber: "A1", monthlyRent: 1, status: "available" }))
  await t.run(async (ctx) => ctx.db.insert("tenants", { propertyId, roomId, name: "Rahasia", phone: "+628123456789", tenantPhoneNormalized: "+628123456789", startedAt: Date.now(), dueDay: 1, status: "active" }))
  const challenge = await t.mutation(api.tenantIdentity.startVerification, { noticeAccepted: true })
  const received = await t.mutation(internal.tenantIdentity.receiveVerificationCode, { channel: "whatsapp", rawText: challenge.code, senderKey: "628123456789", senderPhone: "628123456789" })
  expect(received.handled).toBe(true)
  const confirmed = await t.mutation(internal.tenantIdentity.receiveVerificationCode, { channel: "whatsapp", rawText: "YA", senderKey: "628123456789", senderPhone: "628123456789" })
  expect("text" in confirmed ? confirmed.text : "").toContain("Nomor terhubung")
  const status = await t.query(api.tenantIdentity.getChallengeStatus, { challengeId: challenge.challengeId, pollSecret: challenge.pollSecret })
  expect(status?.status).toBe("verified")
})

test("Telegram code verification handles two-step flow (code then contact share then YA confirmation)", async () => {
  const t = convexTest(schema, modules)
  const challenge = await t.mutation(api.tenantIdentity.startVerification, { noticeAccepted: true })

  // 1. User sends /start verify_BK-...
  const codeStep = await t.mutation(internal.tenantIdentity.receiveVerificationCode, {
    channel: "telegram",
    rawText: `/start verify_${challenge.code}`,
    senderKey: "987654321",
    fromUserId: "987654321",
  })
  expect(codeStep.handled).toBe(true)
  expect("requestContact" in codeStep && codeStep.requestContact).toBe(true)

  // 2. User shares contact
  const contactStep = await t.mutation(internal.tenantIdentity.receiveVerificationCode, {
    channel: "telegram",
    rawText: "",
    senderKey: "987654321",
    fromUserId: "987654321",
    contactUserId: "987654321",
    contactPhone: "+6281299887766",
  })
  expect(contactStep.handled).toBe(true)
  expect("requestConfirm" in contactStep && contactStep.requestConfirm).toBe(true)
  expect("text" in contactStep ? contactStep.text : "").toContain("Konfirmasi Keamanan")

  // 3. User sends YA
  const confirmStep = await t.mutation(internal.tenantIdentity.receiveVerificationCode, {
    channel: "telegram",
    rawText: "YA",
    senderKey: "987654321",
    fromUserId: "987654321",
  })
  expect(confirmStep.handled).toBe(true)
  expect("text" in confirmStep ? confirmStep.text : "").toContain("Nomor terhubung")
  expect("clearKeyboard" in confirmStep && confirmStep.clearKeyboard).toBe(true)

  const status = await t.query(api.tenantIdentity.getChallengeStatus, { challengeId: challenge.challengeId, pollSecret: challenge.pollSecret })
  expect(status?.status).toBe("verified")
})
