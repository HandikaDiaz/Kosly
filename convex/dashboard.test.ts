import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("property badges are owner-scoped and contain only counts", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "dashboard-owner", role: "owner" })
    const otherOwnerId = await ctx.db.insert("owners", { tokenIdentifier: "other-owner", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos A", address: "Alamat", slug: "kos-a", isActive: true, isPublished: true, locationVerificationStatus: "verified", publicPhotoIds: [] })
    const otherPropertyId = await ctx.db.insert("properties", { ownerId: otherOwnerId, name: "Kos B", address: "Alamat B", slug: "kos-b", isActive: true })
    const roomId = await ctx.db.insert("rooms", { propertyId, roomNumber: "1", monthlyRent: 100, status: "available" })
    const tenantId = await ctx.db.insert("tenants", { propertyId, roomId, name: "PII Tenant", phone: "+628123456789", startedAt: Date.now(), dueDay: 1, status: "active" })
    await ctx.db.insert("rentalApplications", { propertyId, roomId, code: "PJ-TEST01", channel: "whatsapp", senderKeyHash: "hash", moveInDate: "2026-10-01", durationMonths: 6, status: "submitted", createdAt: Date.now(), consentVersion: "v2", consentAt: Date.now() })
    await ctx.db.insert("reviews", { propertyId, tenancyId: tenantId, invitationId: await ctx.db.insert("reviewInvitations", { propertyId, tenancyId: tenantId, tokenHash: "hash-review", createdAt: Date.now(), expiresAt: Date.now() + 1000 }), rating: 5, createdAt: Date.now(), stayDays: 30, status: "published", flaggedForAudit: false })
    return { propertyId, otherPropertyId }
  })
  const owner = t.withIdentity({ tokenIdentifier: "dashboard-owner" })
  const badges = await owner.query(api.dashboard.getPropertyTabBadges, { propertyId: setup.propertyId })
  expect(badges).toMatchObject({ applicationsOpen: 1, reviewsUnreplied: 1, locationVerified: true, isPublished: true })
  expect(badges).not.toHaveProperty("tenantName")
  await expect(t.withIdentity({ tokenIdentifier: "other-owner" }).query(api.dashboard.getPropertyTabBadges, { propertyId: setup.propertyId })).rejects.toThrow()
  const list = await owner.query(api.dashboard.listPropertiesWithStatus, {})
  expect(list).toHaveLength(1)
  expect(list[0]).toMatchObject({ id: setup.propertyId, roomTotal: 1, roomAvailable: 1 })
  expect(list[0]).not.toHaveProperty("tenantName")
  await expect(owner.query(api.dashboard.getPropertyTabBadges, { propertyId: setup.otherPropertyId })).rejects.toThrow()
})
