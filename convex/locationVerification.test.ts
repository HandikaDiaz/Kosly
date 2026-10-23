import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

const createProperty = async (
  t: ReturnType<typeof convexTest>,
  token = "location-owner"
) =>
  await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", {
      tokenIdentifier: token,
      role: "owner",
    })
    return await ctx.db.insert("properties", {
      ownerId,
      name: "Kos Lokasi",
      address: "Jl. Test",
      slug: "kos-lokasi",
      isActive: true,
    })
  })

test("only the owner can set the private pin and a changed pin supersedes prior captures", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await createProperty(t)
  await t.run(async (ctx) =>
    ctx.db.insert("owners", { tokenIdentifier: "other-owner", role: "owner" })
  )
  const captureId = await t.run(async (ctx) =>
    ctx.db.insert("locationCaptures", {
      propertyId,
      kind: "front",
      storageId: await ctx.storage.store(
        new Blob(["image"], { type: "image/jpeg" })
      ),
      lat: -6.2,
      lng: 106.8,
      accuracyM: 10,
      distanceM: 10,
      serverCapturedAt: Date.now(),
      clientCapturedAt: Date.now(),
      status: "passed",
    })
  )

  await expect(
    t
      .withIdentity({ tokenIdentifier: "other-owner" })
      .mutation(api.locationVerification.setPropertyPin, {
        propertyId,
        lat: -6.2,
        lng: 106.8,
      })
  ).rejects.toThrow("Properti tidak ditemukan.")
  await t
    .withIdentity({ tokenIdentifier: "location-owner" })
    .mutation(api.locationVerification.setPropertyPin, {
      propertyId,
      lat: -6.2,
      lng: 106.8,
    })
  await t.run(async (ctx) =>
    ctx.db.patch("properties", propertyId, {
      locationVerificationStatus: "verified",
      locationVerifiedAt: 1,
    })
  )
  await t
    .withIdentity({ tokenIdentifier: "location-owner" })
    .mutation(api.locationVerification.setPropertyPin, {
      propertyId,
      lat: -6.21,
      lng: 106.81,
    })

  const result = await t.run(async (ctx) => ({
    property: await ctx.db.get("properties", propertyId),
    capture: await ctx.db.get("locationCaptures", captureId),
  }))
  expect(result.property).toMatchObject({
    pinLat: -6.21,
    pinLng: 106.81,
    locationVerificationStatus: "unverified",
  })
  expect(result.property).not.toHaveProperty("locationVerifiedAt")
  expect(result.capture?.supersededAt).toBeTypeOf("number")
})

test("setting the same pin keeps existing verification evidence active", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await createProperty(t)
  await t
    .withIdentity({ tokenIdentifier: "location-owner" })
    .mutation(api.locationVerification.setPropertyPin, {
      propertyId,
      lat: -6.2,
      lng: 106.8,
    })
  const captureId = await t.run(async (ctx) => {
    await ctx.db.patch("properties", propertyId, {
      locationVerificationStatus: "verified",
      locationVerifiedAt: 1,
    })
    return await ctx.db.insert("locationCaptures", {
      propertyId,
      kind: "front",
      storageId: await ctx.storage.store(new Blob(["image"])),
      lat: -6.2,
      lng: 106.8,
      accuracyM: 10,
      distanceM: 10,
      serverCapturedAt: 2,
      clientCapturedAt: 2,
      status: "passed",
    })
  })

  await t
    .withIdentity({ tokenIdentifier: "location-owner" })
    .mutation(api.locationVerification.setPropertyPin, {
      propertyId,
      lat: -6.2,
      lng: 106.8,
    })
  const result = await t.run(async (ctx) => ({
    property: await ctx.db.get("properties", propertyId),
    capture: await ctx.db.get("locationCaptures", captureId),
  }))
  expect(result.property).toMatchObject({
    locationVerificationStatus: "verified",
    locationVerifiedAt: 1,
  })
  expect(result.capture).not.toHaveProperty("supersededAt")
})

test("location capture requires a pin before it can be evaluated", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await createProperty(t)
  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob(["image"], { type: "image/jpeg" }))
  )
  const args = {
    propertyId,
    kind: "front" as const,
    storageId,
    lat: -6.2,
    lng: 106.8,
    accuracyM: 10,
    clientCapturedAt: Date.now() - 60_000,
  }

  await expect(
    t
      .withIdentity({ tokenIdentifier: "location-owner" })
      .mutation(api.locationVerification.submitLocationCapture, args)
  ).rejects.toThrow("Pin lokasi")
  await t
    .withIdentity({ tokenIdentifier: "location-owner" })
    .mutation(api.locationVerification.setPropertyPin, {
      propertyId,
      lat: -6.2,
      lng: 106.8,
    })
  await expect(
    t
      .withIdentity({ tokenIdentifier: "location-owner" })
      .mutation(api.locationVerification.submitLocationCapture, args)
  ).rejects.toThrow("berkas gambar")
})

test("submission enforces the hourly attempt limit before accepting a file", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await createProperty(t)
  await t
    .withIdentity({ tokenIdentifier: "location-owner" })
    .mutation(api.locationVerification.setPropertyPin, {
      propertyId,
      lat: -6.2,
      lng: 106.8,
    })
  const storageId = await t.run(async (ctx) => {
    const stored = await ctx.storage.store(new Blob(["image"]))
    for (let index = 0; index < 10; index += 1) {
      await ctx.db.insert("locationCaptures", {
        propertyId,
        kind: "street",
        storageId: stored,
        lat: -6.2,
        lng: 106.8,
        accuracyM: 10,
        distanceM: 10,
        serverCapturedAt: Date.now(),
        clientCapturedAt: Date.now(),
        status: "rejected",
      })
    }
    return stored
  })

  await expect(
    t
      .withIdentity({ tokenIdentifier: "location-owner" })
      .mutation(api.locationVerification.submitLocationCapture, {
        propertyId,
        kind: "front",
        storageId,
        lat: -6.2,
        lng: 106.8,
        accuracyM: 10,
        clientCapturedAt: Date.now(),
      })
  ).rejects.toThrow("Batas 10 percobaan")
})

test("internal review updates capture and property verification status", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await createProperty(t)
  const captureId = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["image"]))
    await ctx.db.patch("properties", propertyId, {
      locationVerificationStatus: "pending_review",
    })
    await ctx.db.insert("locationCaptures", {
      propertyId,
      kind: "front",
      storageId,
      lat: -6.2,
      lng: 106.8,
      accuracyM: 10,
      distanceM: 10,
      serverCapturedAt: 1,
      clientCapturedAt: 1,
      status: "passed",
    })
    return await ctx.db.insert("locationCaptures", {
      propertyId,
      kind: "street",
      storageId,
      lat: -6.2,
      lng: 106.801,
      accuracyM: 10,
      distanceM: 111,
      serverCapturedAt: 2,
      clientCapturedAt: 2,
      status: "needs_review",
      reason: "jarak_di_luar_toleransi",
    })
  })

  await t.mutation(internal.locationVerification.resolveLocationReview, {
    captureId,
    decision: "passed",
    note: "Ditinjau manual.",
  })
  const result = await t.run(async (ctx) => ({
    property: await ctx.db.get("properties", propertyId),
    capture: await ctx.db.get("locationCaptures", captureId),
  }))
  expect(result.capture?.status).toBe("passed")
  expect(result.property?.locationVerificationStatus).toBe("verified")
  expect(result.property?.locationVerifiedAt).toBeTypeOf("number")
})
