import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("public property output keeps pending properties public but hides verification badge", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "public-owner",
      role: "owner",
    })
    const propertyId = await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Publik",
      address: "Jalan Publik",
      slug: "kos-publik",
      isActive: true,
      propertyVerificationStatus: "pending_review",
    })
    await ctx.db.insert("property_photos", {
      propertyId,
      storageId: await ctx.storage.store(
        new File(["photo"], "photo.jpg", { type: "image/jpeg" })
      ),
      sortOrder: 0,
      createdAt: Date.now(),
    })
  })
  const result = await t.query(api.properties.getPublicBySlug, {
    slug: "kos-publik",
  })
  expect(result?.isVerified).toBe(false)
  expect(result?.photos).toHaveLength(1)
})

test("public property output hides rooms with payments awaiting verification", async () => {
  const t = convexTest(schema, modules)
  const { propertyId, roomId, tenantId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "owner-with-pending-room",
      role: "owner",
    })
    const propertyId = await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Pending",
      address: "Jalan Pending",
      slug: "kos-pending",
      isActive: true,
    })
    const roomId = await ctx.db.insert("rooms", {
      propertyId,
      roomNumber: "1",
      status: "available",
      monthlyRent: 1500000,
    })
    const tenantId = await ctx.db.insert("tenants", {
      propertyId,
      roomId,
      name: "Calon Tenant",
      phone: "08123456789",
      startedAt: Date.now(),
      dueDay: 1,
      status: "pending",
    })
    return { propertyId, roomId, tenantId }
  })
  await t.run(async (ctx) => {
    await ctx.db.insert("payments", {
      propertyId,
      tenantId,
      roomId,
      amount: 500000,
      paymentType: "dp",
      purpose: "dp",
      paidAt: Date.now(),
      dueDate: Date.now(),
      status: "pending_review",
    })
  })
  const result = await t.query(api.properties.getPublicBySlug, {
    slug: "kos-pending",
  })
  expect(result?.rooms).toHaveLength(0)
})

test("published profile returns only safe room, facility, profile, and resolved photo fields", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "public-profile-owner",
      role: "owner",
    })
    const propertyId = await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Melati",
      address: "Jalan Rahasia 123",
      slug: "kos-melati-registration",
      isActive: true,
      publicSlug: "kos-melati-dago",
      isPublished: true,
      publishedAt: Date.now(),
      publicDescription: "Kos tenang dekat kampus.",
      publicAreaLabel: "Dago, Bandung",
      publicLat: -6.871,
      publicLng: 107.611,
      publicShowPrice: false,
      publicShowFullAddress: false,
    })
    const selectedPhotoId = await ctx.db.insert("property_photos", {
      propertyId,
      storageId: await ctx.storage.store(
        new File(["photo"], "photo.jpg", { type: "image/jpeg" })
      ),
      sortOrder: 2,
      createdAt: Date.now(),
      caption: "Teras",
    })
    await ctx.db.patch("properties", propertyId, {
      publicPhotoIds: [selectedPhotoId],
    })
    const roomId = await ctx.db.insert("rooms", {
      propertyId,
      roomNumber: "A1",
      status: "occupied",
      monthlyRent: 1800000,
      annualRent: 20000000,
      roomType: "Deluxe",
      sizeSqm: 18,
      bathroomFacilities: ["Shower", "Water heater"],
      furnitureElectronics: ["Kasur", "AC"],
      description: "Catatan internal tidak boleh tampil.",
    })
    const tenantId = await ctx.db.insert("tenants", {
      propertyId,
      roomId,
      name: "Rahasia Tenant",
      phone: "08123456789",
      startedAt: Date.now(),
      dueDay: 5,
      status: "active",
    })
    await ctx.db.insert("property_facilities", {
      propertyId,
      category: "shared",
      name: "WiFi",
      description: "Cepat",
      isActive: true,
      createdAt: Date.now(),
    })
    await ctx.db.insert("property_facilities", {
      propertyId,
      category: "parking",
      name: "Parkir lama",
      isActive: false,
      createdAt: Date.now(),
    })
    return { propertyId, tenantId }
  })

  const result = await t.query(api.properties.getPublishedKosBySlug, {
    slug: "kos-melati-dago",
  })
  expect(result).not.toBeNull()
  expect(result).toMatchObject({
    name: "Kos Melati",
    publicDescription: "Kos tenang dekat kampus.",
    publicAreaLabel: "Dago, Bandung",
    publicLat: -6.871,
    publicLng: 107.611,
  })
  expect(result).not.toHaveProperty("address")
  expect(result?.photos[0]).toHaveProperty("url")
  expect(result?.photos[0]).toHaveProperty("sortOrder", 2)
  expect(result?.photos[0]).not.toHaveProperty("storageId")
  expect(result).toMatchObject({ isLocationVerified: false })
  expect(result).not.toHaveProperty("pinLat")
  expect(result).not.toHaveProperty("pinLng")
  expect(result).not.toHaveProperty("distanceM")
  expect(result).not.toHaveProperty("locationCaptures")
  expect(result?.rooms[0]).toMatchObject({
    label: "A1",
    roomType: "Deluxe",
    sizeSqm: 18,
    isAvailable: false,
  })
  expect(result?.rooms[0]).not.toHaveProperty("monthlyRent")
  expect(result?.rooms[0]).not.toHaveProperty("annualRent")
  expect(result?.rooms[0]).not.toHaveProperty("description")
  expect(result?.rooms[0]).not.toHaveProperty("tenant")
  expect(result?.facilities).toEqual([
    { category: "shared", name: "WiFi", description: "Cepat" },
  ])
  expect(setup.tenantId).toBeDefined()
})

test("published profile includes prices and full address only when explicitly enabled", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "priced-public-owner",
      role: "owner",
    })
    return await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Harga",
      address: "Jalan Lengkap 99",
      slug: "kos-harga-registration",
      isActive: true,
      publicSlug: "kos-harga",
      isPublished: true,
      publicShowPrice: true,
      publicShowFullAddress: true,
      publicPhotoIds: [],
    })
  })
  await t.run(async (ctx) => {
    await ctx.db.insert("rooms", {
      propertyId,
      roomNumber: "1",
      status: "available",
      monthlyRent: 1500000,
      annualRent: 16000000,
    })
  })
  const result = await t.query(api.properties.getPublishedKosBySlug, {
    slug: "kos-harga",
  })
  expect(result).toMatchObject({ address: "Jalan Lengkap 99" })
  expect(result?.rooms[0]).toMatchObject({
    monthlyRent: 1500000,
    annualRent: 16000000,
  })
})

test("published query skips deleted selected photos and unpublished properties return null", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "deleted-photo-owner",
      role: "owner",
    })
    const propertyId = await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Hilang",
      address: "Jalan",
      slug: "kos-hilang-registration",
      isActive: true,
      publicSlug: "kos-hilang",
      isPublished: true,
      publicPhotoIds: [],
    })
    const photoId = await ctx.db.insert("property_photos", {
      propertyId,
      storageId: await ctx.storage.store(new File(["x"], "x.jpg")),
      sortOrder: 0,
      createdAt: Date.now(),
    })
    await ctx.db.patch("properties", propertyId, { publicPhotoIds: [photoId] })
    await ctx.db.delete("property_photos", photoId)
    return propertyId
  })
  const publishedResult = await t.query(api.properties.getPublishedKosBySlug, {
    slug: "kos-hilang",
  })
  expect(publishedResult?.photos).toEqual([])
  expect(publishedResult).not.toHaveProperty("publicLat")
  expect(publishedResult).not.toHaveProperty("publicLng")
  await t.run(async (ctx) =>
    ctx.db.patch("properties", setup, { isPublished: false })
  )
  expect(
    await t.query(api.properties.getPublishedKosBySlug, { slug: "kos-hilang" })
  ).toBeNull()
})

test("owner publish reports every missing prerequisite and rejects another owner", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "publish-owner",
      role: "owner",
    })
    await ctx.db.insert("owners", {
      tokenIdentifier: "other-owner",
      role: "owner",
    })
    return await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Belum Lengkap",
      address: "Jalan",
      slug: "kos-belum-lengkap",
      isActive: true,
    })
  })
  const owner = t.withIdentity({ tokenIdentifier: "publish-owner" })
  await expect(
    owner.mutation(api.properties.setPublishState, {
      propertyId,
      isPublished: true,
    })
  ).rejects.toThrow("Minimal 1 kamar")
  await expect(
    t
      .withIdentity({ tokenIdentifier: "other-owner" })
      .mutation(api.properties.setPublishState, {
        propertyId,
        isPublished: true,
      })
  ).rejects.toThrow("Properti tidak ditemukan")
})

test("owner publish generates a stable slug and keeps published timestamp across unpublish", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: "slug-owner",
      role: "owner",
    })
    const propertyId = await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Melati",
      address: "Jalan",
      slug: "kos-melati-registration",
      isActive: true,
      publicDescription: "Deskripsi",
      publicAreaLabel: "Dago",
    })
    await ctx.db.insert("rooms", {
      propertyId,
      roomNumber: "1",
      status: "available",
      monthlyRent: 1000,
    })
    const photoIds = []
    for (let index = 0; index < 3; index += 1)
      photoIds.push(
        await ctx.db.insert("property_photos", {
          propertyId,
          storageId: await ctx.storage.store(
            new File([String(index)], `${index}.jpg`)
          ),
          sortOrder: index,
          createdAt: Date.now(),
        })
      )
    await ctx.db.patch("properties", propertyId, { publicPhotoIds: photoIds })
    return propertyId
  })
  const owner = t.withIdentity({ tokenIdentifier: "slug-owner" })
  await owner.mutation(api.properties.setPublishState, {
    propertyId: setup,
    isPublished: true,
  })
  const first = await t.run(async (ctx) => ctx.db.get("properties", setup))
  expect(first?.publicSlug).toBe("kos-melati-dago")
  expect(first?.publishedAt).toBeTypeOf("number")
  await owner.mutation(api.properties.setPublishState, {
    propertyId: setup,
    isPublished: false,
  })
  await owner.mutation(api.properties.setPublishState, {
    propertyId: setup,
    isPublished: true,
  })
  const second = await t.run(async (ctx) => ctx.db.get("properties", setup))
  expect(second?.publishedAt).toBe(first?.publishedAt)
})
