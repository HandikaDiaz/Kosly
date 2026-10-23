import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = (import.meta as ImportMeta & { glob: (pattern: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts")
const DAY = 86_400_000

const seedEligible = async (t: ReturnType<typeof convexTest>, identity = "review-owner") => t.run(async (ctx) => {
  const ownerId = await ctx.db.insert("owners", { tokenIdentifier: identity, role: "owner" })
  const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos Ulasan", address: "Rahasia", slug: `${identity}-slug`, isActive: true })
  const roomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "A1", status: "occupied", monthlyRent: 1_000_000 })
  const tenancyId = await ctx.db.insert("tenants", { propertyId, roomId, name: "Nama Rahasia", phone: "08123456789", startedAt: Date.now() - 46 * DAY, dueDay: 1, status: "inactive", lifecycle_status: "moved_out", move_out_date: Date.now() - DAY })
  await ctx.db.insert("payments", { propertyId, tenantId: tenancyId, roomId, amount: 1_000_000, paidAt: Date.now() - 30 * DAY, dueDate: Date.now() - 30 * DAY, status: "confirmed", purpose: "sewa_bulanan" })
  return { propertyId, tenancyId }
})

test("invitation stores only hash and context exposes only two public fields", async () => {
  const t = convexTest(schema, modules)
  const setup = await seedEligible(t)
  const created = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  expect(created.token).toHaveLength(64)
  const stored = await t.run(async (ctx) => ctx.db.query("reviewInvitations").take(1))
  expect(stored[0]).not.toHaveProperty("token")
  expect(stored[0]?.tokenHash).not.toBe(created.token)
  const context = await t.query(api.reviews.getInvitationContext, { token: created.token })
  expect(context).toEqual({ propertyName: "Kos Ulasan", stayLabel: "Penghuni, 45 hari" })
  expect(context).not.toHaveProperty("tenancyId")
})

test("submit is one-time, validates rating, and flags the fifth burst review", async () => {
  const t = convexTest(schema, modules)
  const setup = await seedEligible(t)
  const created = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  await expect(t.mutation(api.reviews.submitReview, { token: created.token, rating: 6 })).rejects.toThrow()
  await expect(t.mutation(api.reviews.submitReview, { token: created.token, rating: 5, text: "  Bagus\n\n sekali " })).resolves.toEqual({ ok: true })
  await expect(t.mutation(api.reviews.submitReview, { token: created.token, rating: 5 })).rejects.toThrow("Link ulasan tidak valid")
  const stored = await t.run(async (ctx) => ctx.db.query("reviews").take(10))
  expect(stored[0]).toMatchObject({ rating: 5, text: "Bagus\n\nsekali", flaggedForAudit: false })

  for (let index = 0; index < 4; index += 1) {
    const extraTenancyId = await t.run(async (ctx) => {
      const roomId = await ctx.db.insert("rooms", { propertyId: setup.propertyId, roomNumber: `B${index}`, status: "occupied", monthlyRent: 1_000_000 })
      const tenancyId = await ctx.db.insert("tenants", { propertyId: setup.propertyId, roomId, name: `Rahasia ${index}`, phone: `0812345678${index}`, startedAt: Date.now() - 46 * DAY, dueDay: 1, status: "inactive", lifecycle_status: "moved_out", move_out_date: Date.now() - DAY })
      await ctx.db.insert("payments", { propertyId: setup.propertyId, tenantId: tenancyId, roomId, amount: 1_000_000, paidAt: Date.now() - 30 * DAY, dueDate: Date.now() - 30 * DAY, status: "confirmed", purpose: "sewa_bulanan" })
      return tenancyId
    })
    const invite = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: extraTenancyId })
    await t.mutation(api.reviews.submitReview, { token: invite.token, rating: 4 })
  }
  const burst = await t.run(async (ctx) => ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", setup.propertyId).eq("status", "published")).take(10))
  expect(burst).toHaveLength(5)
  expect(burst.at(-1)?.flaggedForAudit).toBe(true)
})

test("owner list and reply are authorized without exposing tenancy identity", async () => {
  const t = convexTest(schema, modules)
  const setup = await seedEligible(t)
  const created = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  await t.mutation(api.reviews.submitReview, { token: created.token, rating: 4, text: "Nyaman" })
  const reviews = await t.withIdentity({ tokenIdentifier: "review-owner" }).query(api.reviews.ownerListReviews, { propertyId: setup.propertyId })
  expect(reviews[0]).toMatchObject({ rating: 4, text: "Nyaman", stayLabel: "Penghuni, 45 hari", alreadyReported: false })
  expect(reviews[0]).not.toHaveProperty("tenancyId")
  const reviewId = await t.run(async (ctx) => (await ctx.db.query("reviews").take(1))[0]._id)
  await t.withIdentity({ tokenIdentifier: "review-owner" }).mutation(api.reviews.ownerReplyToReview, { reviewId, text: "Terima kasih" })
  await expect(t.withIdentity({ tokenIdentifier: "review-owner" }).mutation(api.reviews.ownerReplyToReview, { reviewId, text: "Kedua" })).rejects.toThrow("sudah tersedia")
  await expect(t.withIdentity({ tokenIdentifier: "other" }).query(api.reviews.ownerListReviews, { propertyId: setup.propertyId })).rejects.toThrow()
})

test("reviewStats stays consistent across submit, moderation, and recompute", async () => {
  const t = convexTest(schema, modules)
  const setup = await seedEligible(t, "stats-owner")
  const created = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  await t.mutation(api.reviews.submitReview, { token: created.token, rating: 4 })
  const reviewId = await t.run(async (ctx) => (await ctx.db.query("reviews").take(1))[0]._id)
  expect(await t.run(async (ctx) => ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", setup.propertyId)).unique())).toMatchObject({ count: 1, sum: 4 })
  await t.mutation(internal.reviews.moderateReview, { reviewId, decision: "hidden" })
  expect(await t.run(async (ctx) => ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", setup.propertyId)).unique())).toMatchObject({ count: 0, sum: 0 })
  await t.mutation(internal.reviews.moderateReview, { reviewId, decision: "published" })
  await t.run(async (ctx) => {
    const stats = await ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", setup.propertyId)).unique()
    if (stats) await ctx.db.patch("reviewStats", stats._id, { count: 99, sum: 1 })
  })
  await t.mutation(internal.reviews.recomputeReviewStats, { propertyId: setup.propertyId })
  expect(await t.run(async (ctx) => ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", setup.propertyId)).unique())).toMatchObject({ count: 1, sum: 4 })
})

test("public review query only exposes published allow-list and respects publication", async () => {
  const t = convexTest(schema, modules)
  const setup = await seedEligible(t, "public-review-owner")
  await t.run(async (ctx) => ctx.db.patch("properties", setup.propertyId, { publicSlug: "kos-ulasan", isPublished: true }))
  const created = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  await t.mutation(api.reviews.submitReview, { token: created.token, rating: 5, text: "Nyaman" })
  const publicResult = await t.query(api.reviews.listPublishedReviews, { slug: "kos-ulasan", limit: 20 })
  expect(publicResult?.reviews[0]).toEqual({ rating: 5, text: "Nyaman", stayLabel: "Penghuni, 45 hari", monthYear: expect.any(String) })
  expect(publicResult?.reviews[0]).not.toHaveProperty("tenancyId")
  expect(publicResult?.reviews[0]).not.toHaveProperty("invitationId")
  expect(publicResult?.reviews[0]).not.toHaveProperty("status")
  expect((await t.query(api.properties.getPublishedKosBySlug, { slug: "kos-ulasan" }))).toMatchObject({ reviewCount: 1, ratingAverage: null })
  const reviewId = await t.run(async (ctx) => (await ctx.db.query("reviews").take(1))[0]._id)
  await t.mutation(internal.reviews.moderateReview, { reviewId, decision: "hidden" })
  expect((await t.query(api.reviews.listPublishedReviews, { slug: "kos-ulasan" }))?.reviews).toEqual([])
  await t.run(async (ctx) => ctx.db.patch("properties", setup.propertyId, { isPublished: false }))
  expect(await t.query(api.reviews.listPublishedReviews, { slug: "kos-ulasan" })).toBeNull()
})

test("invalid, expired, and revoked tokens return null context", async () => {
  const t = convexTest(schema, modules)
  expect(await t.query(api.reviews.getInvitationContext, { token: "missing" })).toBeNull()
  const setup = await seedEligible(t)
  const created = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  const invitation = await t.run(async (ctx) => (await ctx.db.query("reviewInvitations").take(1))[0])
  await t.mutation(internal.reviews.revokeReviewInvitation, { invitationId: invitation._id })
  expect(await t.query(api.reviews.getInvitationContext, { token: created.token })).toBeNull()

  const expiredSetup = await seedEligible(t, "expired-owner")
  const expired = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: expiredSetup.tenancyId })
  const expiredInvitation = await t.run(async (ctx) => (await ctx.db.query("reviewInvitations").withIndex("by_tenancy", (q) => q.eq("tenancyId", expiredSetup.tenancyId)).take(1))[0])
  await t.run(async (ctx) => ctx.db.patch("reviewInvitations", expiredInvitation._id, { expiresAt: 0 }))
  expect(await t.query(api.reviews.getInvitationContext, { token: expired.token })).toBeNull()
})

test("invitation rejects short stays, missing payments, duplicate review, and daily cap", async () => {
  const t = convexTest(schema, modules)
  const setup = await seedEligible(t, "rules-owner")
  const shortTenancyId = await t.run(async (ctx) => {
    const roomId = await ctx.db.insert("rooms", { propertyId: setup.propertyId, roomNumber: "SHORT", status: "occupied", monthlyRent: 1_000_000 })
    const tenancyId = await ctx.db.insert("tenants", { propertyId: setup.propertyId, roomId, name: "short", phone: "0800000000", startedAt: Date.now() - 10 * DAY, dueDay: 1, status: "inactive", lifecycle_status: "moved_out", move_out_date: Date.now() - DAY })
    await ctx.db.insert("payments", { propertyId: setup.propertyId, tenantId: tenancyId, roomId, amount: 1, paidAt: Date.now(), dueDate: Date.now(), status: "confirmed", purpose: "sewa_bulanan" })
    return tenancyId
  })
  await expect(t.mutation(internal.reviews.createReviewInvitation, { tenancyId: shortTenancyId })).rejects.toThrow()
  const first = await t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })
  await t.mutation(api.reviews.submitReview, { token: first.token, rating: 5 })
  await expect(t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.tenancyId })).rejects.toThrow()
})

test("confirmed DP alone is not review-eligible, but confirmed rent is", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "payment-kind-owner", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos Pembayaran", address: "Rahasia", slug: "payment-kind-slug", isActive: true })
    const dpRoomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "DP", status: "occupied", monthlyRent: 1_000_000 })
    const dpTenancyId = await ctx.db.insert("tenants", { propertyId, roomId: dpRoomId, name: "DP", phone: "0800000001", startedAt: Date.now() - 46 * DAY, dueDay: 1, status: "inactive", lifecycle_status: "moved_out", move_out_date: Date.now() - DAY })
    await ctx.db.insert("payments", { propertyId, tenantId: dpTenancyId, roomId: dpRoomId, amount: 1_000_000, paidAt: Date.now() - 30 * DAY, dueDate: Date.now() - 30 * DAY, status: "confirmed", paymentType: "dp", purpose: "dp" })
    const rentRoomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "RENT", status: "occupied", monthlyRent: 1_000_000 })
    const rentTenancyId = await ctx.db.insert("tenants", { propertyId, roomId: rentRoomId, name: "Rent", phone: "0800000002", startedAt: Date.now() - 46 * DAY, dueDay: 1, status: "inactive", lifecycle_status: "moved_out", move_out_date: Date.now() - DAY })
    await ctx.db.insert("payments", { propertyId, tenantId: rentTenancyId, roomId: rentRoomId, amount: 1_000_000, paidAt: Date.now() - 30 * DAY, dueDate: Date.now() - 30 * DAY, status: "confirmed", paymentType: "full", purpose: "sewa_bulanan" })
    return { dpTenancyId, rentTenancyId }
  })
  await expect(t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.dpTenancyId })).rejects.toThrow()
  await expect(t.mutation(internal.reviews.createReviewInvitation, { tenancyId: setup.rentTenancyId })).resolves.toMatchObject({ token: expect.any(String) })
})
