import { internalMutation, mutation, query } from "./_generated/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { requirePropertyOwner, requireOwner } from "./lib/auth"
import { assertPropertyCapacityForOwner } from "./subscriptions"
import {
  assertValidPublicSlug,
  createSlugCandidate,
  normalizePublicCoordinates,
  normalizePublicSlug,
  RESERVED_SLUGS,
} from "./lib/publicProperty"
import { formatRatingSummary } from "./lib/reviewRules"
import { gridCellFor } from "./lib/searchRules"
import { isRoomAvailable } from "./lib/applicationRules"
import { getRoomHoldBlockers } from "./lib/roomHolds"
import { parseRegistrationCode } from "./lib/registrationLink"
import { KOS_TYPES, MAX_LANDMARKS, RULE_KEYS, normalizePublicAreaKey, validateLandmark, RELATED_LIMIT } from "./lib/kosInfoRules"
import { bucketLabel, tenancyDisplay } from "./lib/ownerTrustRules"

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const ensureSlugAvailable = async (
  ctx: Parameters<typeof requireOwner>[0],
  slug: string,
  propertyId?: string
) => {
  const existingRegistration = await ctx.db
    .query("properties")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (existingRegistration && existingRegistration._id !== propertyId)
    throw new Error("Link properti sudah digunakan.")
  const existingPublic = await ctx.db
    .query("properties")
    .withIndex("by_public_slug", (q) => q.eq("publicSlug", slug))
    .unique()
  if (existingPublic && existingPublic._id !== propertyId)
    throw new Error("Link properti sudah digunakan oleh halaman publik.")
  const redirect = await ctx.db
    .query("slugRedirects")
    .withIndex("by_old_slug", (q) => q.eq("oldSlug", slug))
    .unique()
  if (redirect) throw new Error("Slug publik pernah digunakan dan tidak dapat dipakai ulang.")
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    return await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .take(50)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    slug: v.string(),
    propertyPhotoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    await assertPropertyCapacityForOwner(ctx, owner._id)
    const name = args.name.trim()
    const address = args.address.trim()
    const slug = normalizeSlug(args.slug || args.name)
    if (!name || !address || !slug)
      throw new Error("Nama, alamat, dan link properti wajib diisi.")
    if (args.propertyPhotoStorageIds.length < 3)
      throw new Error("Minimal 3 foto properti wajib diunggah.")
    await ensureSlugAvailable(ctx, slug)
    const propertyId = await ctx.db.insert("properties", {
      ownerId: owner._id,
      name,
      address,
      slug,
      isActive: true,
    })
    for (const [
      sortOrder,
      storageId,
    ] of args.propertyPhotoStorageIds.entries()) {
      await ctx.db.insert("property_photos", {
        propertyId,
        storageId,
        sortOrder,
        createdAt: Date.now(),
      })
    }
    return propertyId
  },
})

export const update = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    address: v.string(),
    slug: v.string(),
    propertyPhotoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const name = args.name.trim()
    const address = args.address.trim()
    const slug = normalizeSlug(args.slug || args.name)
    if (!name || !address || !slug)
      throw new Error("Nama, alamat, dan link properti wajib diisi.")
    if (args.propertyPhotoStorageIds.length < 3)
      throw new Error("Minimal 3 foto properti wajib tersedia.")
    await ensureSlugAvailable(ctx, slug, args.propertyId)
    await ctx.db.patch("properties", args.propertyId, { name, address, slug })
    const photos = await ctx.db
      .query("property_photos")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .take(100)
    const requestedStorageIds = new Set(
      args.propertyPhotoStorageIds.map(String)
    )
    const retainedPhotoIds = new Set<string>()
    for (const photo of photos) {
      if (!requestedStorageIds.has(String(photo.storageId))) {
        await ctx.db.delete("property_photos", photo._id)
        continue
      }
      const sortOrder = args.propertyPhotoStorageIds.findIndex(
        (storageId) => String(storageId) === String(photo.storageId)
      )
      retainedPhotoIds.add(String(photo._id))
      await ctx.db.patch("property_photos", photo._id, { sortOrder })
    }
    for (const [
      sortOrder,
      storageId,
    ] of args.propertyPhotoStorageIds.entries()) {
      if (
        !photos.some((photo) => String(photo.storageId) === String(storageId))
      ) {
        await ctx.db.insert("property_photos", {
          propertyId: args.propertyId,
          storageId,
          sortOrder,
          createdAt: Date.now(),
        })
      }
    }
    const currentProperty = await ctx.db.get("properties", args.propertyId)
    if (currentProperty?.publicPhotoIds) {
      await ctx.db.patch("properties", args.propertyId, {
        publicPhotoIds: currentProperty.publicPhotoIds.filter((photoId) =>
          retainedPhotoIds.has(String(photoId))
        ),
      })
    }
    return args.propertyId
  },
})

export const updateBankDetails = mutation({
  args: {
    propertyId: v.id("properties"),
    bankName: v.string(),
    bankAccountNumber: v.string(),
    bankAccountHolder: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    await ctx.db.patch("properties", args.propertyId, {
      bankName: args.bankName.trim() || undefined,
      bankAccountNumber: args.bankAccountNumber.trim() || undefined,
      bankAccountHolder: args.bankAccountHolder.trim() || undefined,
    })
    return { success: true }
  },
})

const publicProfileFields = {
  publicDescription: v.optional(v.string()),
  publicAreaLabel: v.optional(v.string()),
  publicPhotoIds: v.optional(v.array(v.id("property_photos"))),
  publicShowPrice: v.optional(v.boolean()),
  publicShowFullAddress: v.optional(v.boolean()),
  publicLat: v.optional(v.number()),
  publicLng: v.optional(v.number()),
  publicKosType: v.optional(v.union(v.string(), v.null())),
  publicRules: v.optional(v.union(v.object({
    hewan: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))),
    merokok: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))),
    tamu: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))),
    masak: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))),
    jamMalam: v.optional(v.object({ value: v.union(v.literal("boleh"), v.literal("tidak")), time: v.optional(v.string()) })),
  }), v.null())),
  publicLandmarks: v.optional(v.union(v.array(v.object({ name: v.string(), distanceM: v.number() })), v.null())),
}

const publicationStatusValidator = v.object({
  propertyId: v.id("properties"),
  publicSlug: v.union(v.string(), v.null()),
  isPublished: v.boolean(),
  publishedAt: v.union(v.number(), v.null()),
  publicDescription: v.union(v.string(), v.null()),
  publicAreaLabel: v.union(v.string(), v.null()),
  publicPhotoIds: v.array(v.id("property_photos")),
  publicShowPrice: v.boolean(),
  publicShowFullAddress: v.boolean(),
  publicKosType: v.union(v.string(), v.null()),
  publicRules: v.union(v.object({
    hewan: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), merokok: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), tamu: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), masak: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), jamMalam: v.optional(v.object({ value: v.union(v.literal("boleh"), v.literal("tidak")), time: v.optional(v.string()) })),
  }), v.null()),
  publicLandmarks: v.array(v.object({ name: v.string(), distanceM: v.number() })),
  publicInfoUpdatedAt: v.union(v.number(), v.null()),
  requirements: v.object({
    name: v.boolean(),
    room: v.boolean(),
    description: v.boolean(),
    area: v.boolean(),
    photos: v.boolean(),
  }),
  missing: v.array(v.string()),
})

const publicPhotoValidator = v.object({
  url: v.string(),
  sortOrder: v.number(),
})
const publicRoomValidator = v.object({
  label: v.string(),
  roomType: v.optional(v.string()),
  sizeSqm: v.optional(v.number()),
  bathroomFacilities: v.optional(v.array(v.string())),
  furnitureElectronics: v.optional(v.array(v.string())),
  isAvailable: v.boolean(),
  monthlyRent: v.optional(v.number()),
  annualRent: v.optional(v.number()),
})
const publicProfileValidator = v.object({
  name: v.string(),
  slug: v.string(),
  publicSlug: v.string(),
  propertySlug: v.string(),
  publicDescription: v.optional(v.string()),
  publicAreaLabel: v.optional(v.string()),
  publicLat: v.optional(v.number()),
  publicLng: v.optional(v.number()),
  address: v.optional(v.string()),
  publicShowFullAddress: v.boolean(),
  isLocationVerified: v.boolean(),
  locationVerifiedAt: v.optional(v.number()),
  reviewCount: v.number(),
  ratingAverage: v.union(v.number(), v.null()),
  photos: v.array(publicPhotoValidator),
  facilities: v.array(
    v.object({
      category: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })
  ),
  rooms: v.array(publicRoomValidator),
  contactWhatsApp: v.optional(v.string()),
  contactTelegram: v.optional(v.string()),
  kosType: v.optional(v.string()),
  rules: v.optional(v.object({ hewan: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), merokok: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), tamu: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), masak: v.optional(v.union(v.literal("boleh"), v.literal("tidak"))), jamMalam: v.optional(v.object({ value: v.union(v.literal("boleh"), v.literal("tidak")), time: v.optional(v.string()) })) })),
  landmarks: v.optional(v.array(v.object({ name: v.string(), distanceM: v.number() }))),
  infoUpdatedAt: v.optional(v.number()),
  ownerTrust: v.object({ identityVerified: v.boolean(), identityVerifiedMonth: v.optional(v.string()), propertyDocsReviewed: v.boolean(), joinedMonth: v.string(), tenancyDisplay: v.optional(v.string()), responseBucketLabel: v.optional(v.string()) }),
})

const publicationRequirements = async (
  ctx: Parameters<typeof requireOwner>[0],
  property: {
    name: string
    publicDescription?: string
    publicAreaLabel?: string
    publicPhotoIds?: import("./_generated/dataModel").Id<"property_photos">[]
    _id: import("./_generated/dataModel").Id<"properties">
  }
) => {
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_property", (q) => q.eq("propertyId", property._id))
    .take(100)
  const photos = await ctx.db
    .query("property_photos")
    .withIndex("by_property", (q) => q.eq("propertyId", property._id))
    .take(100)
  const photoIds = new Set(photos.map((photo) => String(photo._id)))
  const selectedCount = (property.publicPhotoIds ?? []).filter((photoId) =>
    photoIds.has(String(photoId))
  ).length
  const requirements = {
    name: Boolean(property.name.trim()),
    room: rooms.length > 0,
    description: Boolean(property.publicDescription?.trim()),
    area: Boolean(property.publicAreaLabel?.trim()),
    photos: selectedCount >= 3,
  }
  const missing = [
    !requirements.name ? "Nama kos" : null,
    !requirements.room ? "Minimal 1 kamar" : null,
    !requirements.description ? "Deskripsi publik" : null,
    !requirements.area ? "Label area" : null,
    !requirements.photos ? "Minimal 3 foto publik" : null,
  ].filter((item): item is string => item !== null)
  return { requirements, missing }
}

export const getPublicPublicationStatus = query({
  args: { propertyId: v.id("properties") },
  returns: publicationStatusValidator,
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    const { requirements, missing } = await publicationRequirements(
      ctx,
      property
    )
    return {
      propertyId: property._id,
      publicSlug: property.publicSlug ?? null,
      isPublished: property.isPublished === true,
      publishedAt: property.publishedAt ?? null,
      publicDescription: property.publicDescription ?? null,
      publicAreaLabel: property.publicAreaLabel ?? null,
      publicPhotoIds: property.publicPhotoIds ?? [],
      publicShowPrice: property.publicShowPrice === true,
      publicShowFullAddress: property.publicShowFullAddress === true,
      publicKosType: property.publicKosType ?? null,
      publicRules: property.publicRules ?? null,
      publicLandmarks: property.publicLandmarks ?? [],
      publicInfoUpdatedAt: property.publicInfoUpdatedAt ?? null,
      requirements,
      missing,
    }
  },
})

export const updatePublicProfile = mutation({
  args: { propertyId: v.id("properties"), ...publicProfileFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    const patch: Record<string, unknown> = {}
    let infoChanged = false
    if (args.publicDescription !== undefined) {
      if (args.publicDescription.length > 1000)
        throw new Error("Deskripsi publik maksimal 1000 karakter.")
      patch.publicDescription = args.publicDescription.trim() || undefined
      infoChanged = true
    }
    if (args.publicAreaLabel !== undefined) {
      if (args.publicAreaLabel.length > 120)
        throw new Error("Label area maksimal 120 karakter.")
      patch.publicAreaLabel = args.publicAreaLabel.trim() || undefined
      patch.publicAreaKey = args.publicAreaLabel.trim() ? normalizePublicAreaKey(args.publicAreaLabel) : undefined
      infoChanged = true
    }
    if (args.publicKosType !== undefined) {
      if (args.publicKosType !== null && !KOS_TYPES.includes(args.publicKosType as (typeof KOS_TYPES)[number])) throw new Error("Tipe kos tidak valid.")
      patch.publicKosType = args.publicKosType || undefined
      infoChanged = true
    }
    if (args.publicRules !== undefined) {
      if (args.publicRules === null) patch.publicRules = undefined
      else {
        for (const key of RULE_KEYS) {
          const value = key === "jamMalam" ? args.publicRules.jamMalam?.value : args.publicRules[key]
          if (value !== undefined && value !== "boleh" && value !== "tidak") throw new Error("Aturan kos tidak valid.")
        }
        const time = args.publicRules.jamMalam?.time
        if (args.publicRules.jamMalam?.value === "tidak" && (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error("Jam malam harus berformat HH:MM.")
        patch.publicRules = args.publicRules
      }
      infoChanged = true
    }
    if (args.publicLandmarks !== undefined) {
      if (args.publicLandmarks === null) patch.publicLandmarks = undefined
      else {
        if (args.publicLandmarks.length > MAX_LANDMARKS) throw new Error(`Maksimal ${MAX_LANDMARKS} landmark.`)
        const names: string[] = []
        patch.publicLandmarks = args.publicLandmarks.map((landmark) => { const cleaned = validateLandmark(landmark, names); names.push(cleaned.name); return cleaned })
      }
      infoChanged = true
    }
    if (infoChanged) patch.publicInfoUpdatedAt = Date.now()
    if (args.publicPhotoIds !== undefined) {
      if (
        new Set(args.publicPhotoIds.map(String)).size !==
          args.publicPhotoIds.length ||
        args.publicPhotoIds.length > 30
      )
        throw new Error("Pilihan foto publik tidak valid.")
      const photos = await ctx.db
        .query("property_photos")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .take(100)
      const photoIds = new Set(photos.map((photo) => String(photo._id)))
      if (args.publicPhotoIds.some((photoId) => !photoIds.has(String(photoId))))
        throw new Error("Foto publik harus berasal dari properti ini.")
      patch.publicPhotoIds = args.publicPhotoIds
    }
    if (args.publicShowPrice !== undefined)
      patch.publicShowPrice = args.publicShowPrice
    if (args.publicShowFullAddress !== undefined)
      patch.publicShowFullAddress = args.publicShowFullAddress
    Object.assign(
      patch,
      normalizePublicCoordinates(args.publicLat, args.publicLng)
    )
    const nextLat = (patch.publicLat as number | undefined) ?? property.publicLat
    const nextLng = (patch.publicLng as number | undefined) ?? property.publicLng
    if (nextLat !== undefined && nextLng !== undefined) patch.publicGridCell = gridCellFor(nextLat, nextLng)
    if (
      args.publicLat === undefined &&
      args.publicLng === undefined &&
      ("publicLat" in args || "publicLng" in args)
    ) {
      patch.publicLat = undefined
      patch.publicLng = undefined
      patch.publicGridCell = undefined
    }
    await ctx.db.patch("properties", property._id, patch)
    return null
  },
})

export const updatePublicSlug = mutation({
  args: { propertyId: v.id("properties"), publicSlug: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    const slug = normalizePublicSlug(args.publicSlug)
    assertValidPublicSlug(slug)
    if (RESERVED_SLUGS.has(slug))
      throw new Error("Slug publik menggunakan route sistem.")
    await ensureSlugAvailable(ctx, slug, property._id)
    if (property.publicSlug && property.publicSlug !== slug) {
      const existingRedirect = await ctx.db.query("slugRedirects").withIndex("by_old_slug", (q) => q.eq("oldSlug", property.publicSlug!)).unique()
      if (!existingRedirect) await ctx.db.insert("slugRedirects", { oldSlug: property.publicSlug, propertyId: property._id, createdAt: Date.now() })
    }
    const previous =
      property.publicSlug && property.publicSlug !== slug
        ? [...(property.previousSlugs ?? []), property.publicSlug].filter(
            (value, index, values) => values.indexOf(value) === index
          )
        : property.previousSlugs
    await ctx.db.patch("properties", property._id, {
      publicSlug: slug,
      previousSlugs: previous,
    })
    return null
  },
})

export const setPublishState = mutation({
  args: { propertyId: v.id("properties"), isPublished: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    if (!args.isPublished) {
      await ctx.db.patch("properties", property._id, { isPublished: false })
      return null
    }
    const { missing } = await publicationRequirements(ctx, property)
    if (missing.length > 0)
      throw new Error(
        `Kos belum bisa dipublikasikan. Lengkapi: ${missing.join(", ")}.`
      )
    let publicSlug = property.publicSlug
    if (!publicSlug) {
      const base = createSlugCandidate(
        property.name,
        property.publicAreaLabel ?? ""
      )
      publicSlug = base
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const existing = await ctx.db
          .query("properties")
          .withIndex("by_public_slug", (q) => q.eq("publicSlug", publicSlug!))
          .unique()
        const registration = await ctx.db
          .query("properties")
          .withIndex("by_slug", (q) => q.eq("slug", publicSlug!))
          .unique()
        const redirect = await ctx.db.query("slugRedirects").withIndex("by_old_slug", (q) => q.eq("oldSlug", publicSlug!)).unique()
        if (!existing && !registration && !redirect && !RESERVED_SLUGS.has(publicSlug)) break
        publicSlug = `${base.slice(0, 75)}-${Math.random().toString(36).slice(2, 6)}`
      }
      assertValidPublicSlug(publicSlug)
    }
    await ctx.db.patch("properties", property._id, {
      isPublished: true,
      publicSlug,
      publishedAt: property.publishedAt ?? Date.now(),
    })
    return null
  },
})

export const getPublishedKosBySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), publicProfileValidator),
  handler: async (ctx, args) => {
    const property = await ctx.db
      .query("properties")
      .withIndex("by_public_slug", (q) =>
        q.eq("publicSlug", normalizePublicSlug(args.slug))
      )
      .unique()
    if (
      !property ||
      property.isPublished !== true ||
      !property.isActive ||
      property.lockedByTier ||
      property.publicSuspended
    )
      return null
    const publicSlug = property.publicSlug
    if (!publicSlug) return null
    const owner = await ctx.db.get("owners", property.ownerId)
    const ownerStats = await ctx.db.query("ownerPublicStats").withIndex("by_owner", (q) => q.eq("ownerId", property.ownerId)).unique()
    const identityVerified = owner?.identityVerificationStatus === "verified"
    const identityVerifiedMonth = owner?.identityVerificationReviewedAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date(owner.identityVerificationReviewedAt)) : undefined
    const propertyDocsReviewed = property.propertyVerificationStatus === "verified" && property.propertyVerificationReviewedAt !== undefined
    const reviewStats = await ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", property._id)).unique()
    const ratingSummary = formatRatingSummary(reviewStats ? { count: reviewStats.count, sum: reviewStats.sum } : { count: 0, sum: 0 })
    const selectedIds = new Set((property.publicPhotoIds ?? []).map(String))
    const allPhotos = await ctx.db
      .query("property_photos")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100)
    const photos = await Promise.all(
      allPhotos
        .filter((photo) => selectedIds.has(String(photo._id)))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (photo) => {
          const url = await ctx.storage.getUrl(photo.storageId)
          return url ? { url, sortOrder: photo.sortOrder } : null
        })
    )
    const facilities = (
      await ctx.db
        .query("property_facilities")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .take(100)
    )
      .filter((facility) => facility.isActive)
      .map((facility) => ({
        category: facility.category,
        name: facility.name,
        ...(facility.description ? { description: facility.description } : {}),
      }))
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100)
    const blockedRoomIds = new Set<string>()
    for (const room of rooms) if ((await getRoomHoldBlockers(ctx, room._id, Date.now())).length > 0) blockedRoomIds.add(String(room._id))
    const publicRooms = rooms.map((room) => ({
      label: room.roomNumber,
      ...(room.roomType ? { roomType: room.roomType } : {}),
      ...(room.sizeSqm !== undefined ? { sizeSqm: room.sizeSqm } : {}),
      ...(room.bathroomFacilities
        ? { bathroomFacilities: room.bathroomFacilities }
        : {}),
      ...(room.furnitureElectronics
        ? { furnitureElectronics: room.furnitureElectronics }
        : {}),
      isAvailable: isRoomAvailable(
        room,
        blockedRoomIds.has(String(room._id))
          ? [{ status: "accepted", holdExpiresAt: Number.POSITIVE_INFINITY }]
          : [],
        Date.now()
      ),
      ...(property.publicShowPrice === true
        ? {
            monthlyRent: room.monthlyRent,
            ...(room.annualRent !== undefined
              ? { annualRent: room.annualRent }
              : {}),
          }
        : {}),
    }))
    const ownerBotLinks = await ctx.db
      .query("bot_links")
      .withIndex("by_owner_and_channel", (q) =>
        q.eq("ownerId", property.ownerId)
      )
      .take(10)

    const activeWhatsApp = ownerBotLinks.find(
      (link) => link.channel === "whatsapp" && link.status === "active"
    )
    const activeTelegram = ownerBotLinks.find(
      (link) => link.channel === "telegram" && link.status === "active"
    )

    const contactWhatsApp = activeWhatsApp?.chatId?.trim() || undefined
    const contactTelegram =
      activeTelegram?.displayName?.trim().replace(/^@/, "") ||
      activeTelegram?.chatId?.trim().replace(/^@/, "") ||
      undefined

    return {
      name: property.name,
      slug: property.slug,
      publicSlug,
      propertySlug: property.slug,
      ...(contactWhatsApp ? { contactWhatsApp } : {}),
      ...(contactTelegram ? { contactTelegram } : {}),
      ...(property.publicDescription
        ? { publicDescription: property.publicDescription }
        : {}),
      ...(property.publicAreaLabel
        ? { publicAreaLabel: property.publicAreaLabel }
        : {}),
      ...(property.publicLat !== undefined && property.publicLng !== undefined
        ? { publicLat: property.publicLat, publicLng: property.publicLng }
        : property.pinLat !== undefined && property.pinLng !== undefined
          ? {
              publicLat: Math.round(property.pinLat * 1000) / 1000,
              publicLng: Math.round(property.pinLng * 1000) / 1000,
            }
          : {}),
      ...(property.publicShowFullAddress === true
        ? { address: property.address }
        : {}),
      publicShowFullAddress: property.publicShowFullAddress === true,
      isLocationVerified: property.locationVerificationStatus === "verified",
      ...(property.locationVerificationStatus === "verified" &&
      property.locationVerifiedAt !== undefined
        ? { locationVerifiedAt: property.locationVerifiedAt }
        : {}),
      ...(property.publicKosType ? { kosType: property.publicKosType } : {}),
      ...(property.publicRules ? { rules: property.publicRules } : {}),
      ...(property.publicLandmarks ? { landmarks: property.publicLandmarks } : {}),
      ...(property.publicInfoUpdatedAt !== undefined ? { infoUpdatedAt: property.publicInfoUpdatedAt } : {}),
      ownerTrust: {
        identityVerified,
        ...(identityVerified && identityVerifiedMonth ? { identityVerifiedMonth } : {}),
        propertyDocsReviewed,
        joinedMonth: ownerStats?.joinedMonth ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date(owner?.createdAt ?? owner?._creationTime ?? property._creationTime)),
        ...(ownerStats?.tenancyCount !== undefined && tenancyDisplay(ownerStats.tenancyCount) ? { tenancyDisplay: tenancyDisplay(ownerStats.tenancyCount) } : {}),
        ...(ownerStats?.responseBucket ? { responseBucketLabel: bucketLabel(ownerStats.responseBucket) } : {}),
      },
      photos: photos.filter(
        (photo): photo is NonNullable<typeof photo> => photo !== null
      ),
      facilities,
      rooms: publicRooms,
      reviewCount: ratingSummary.count,
      ratingAverage: ratingSummary.average,
    }
  },
})

export const getRelatedPublishedKos = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const source = await ctx.db.query("properties").withIndex("by_public_slug", (q) => q.eq("publicSlug", normalizePublicSlug(args.slug))).unique()
    if (!source || source.isPublished !== true || !source.isActive || source.lockedByTier || source.publicSuspended || !source.publicAreaKey) return []
    const limit = Math.min(RELATED_LIMIT, Math.max(1, Math.floor(args.limit ?? RELATED_LIMIT)))
    const properties = await ctx.db.query("properties").withIndex("by_public_area_key", (q) => q.eq("publicAreaKey", source.publicAreaKey).eq("isPublished", true)).take(limit + 1)
    const related = properties.filter((property) => property._id !== source._id && property.isActive && !property.lockedByTier && !property.publicSuspended).slice(0, limit)
    const result: Array<{ slug: string; name: string; areaLabel?: string; hargaMulai?: number; isLocationVerified: boolean }> = []
    for (const property of related) {
      if (!property.publicSlug) continue
      let hargaMulai: number | undefined
      if (property.publicShowPrice === true) {
        const rooms = await ctx.db.query("rooms").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)
        const prices = rooms.map((room) => room.monthlyRent).filter((value): value is number => typeof value === "number")
        if (prices.length) hargaMulai = Math.min(...prices)
      }
      result.push({ slug: property.publicSlug, name: property.name, ...(property.publicAreaLabel ? { areaLabel: property.publicAreaLabel } : {}), ...(hargaMulai !== undefined ? { hargaMulai } : {}), isLocationVerified: property.locationVerificationStatus === "verified" })
    }
    return result
  },
})

export const backfillPublicAreaKeys = internalMutation({
  args: { cursor: v.optional(v.id("properties")), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("properties").order("asc").take(Math.min(100, Math.max(1, args.batchSize ?? 50)))
    const selected = args.cursor ? rows.filter((row) => row._id > args.cursor!).slice(0, args.batchSize ?? 50) : rows
    for (const property of selected) {
      const key = property.publicAreaLabel?.trim() ? normalizePublicAreaKey(property.publicAreaLabel) : undefined
      if (property.publicAreaKey !== key) await ctx.db.patch("properties", property._id, { publicAreaKey: key })
    }
    return { processed: selected.length, nextCursor: selected.length === rows.length ? null : selected.at(-1)?._id ?? null }
  },
})

export const listPublishedSlugs = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("properties").withIndex("by_is_published", (q) => q.eq("isPublished", true)).paginate(args.paginationOpts)
    return {
      ...page,
      page: page.page.filter((property) => Boolean(property.publicSlug) && property.isActive && !property.lockedByTier && !property.publicSuspended).map((property) => ({ slug: property.publicSlug!, updatedAt: Math.max(property._creationTime, property.publishedAt ?? 0, property.publicInfoUpdatedAt ?? 0) })),
    }
  },
})

export const resolvePublishedSlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), v.object({ slug: v.string() })),
  handler: async (ctx, args) => {
    const redirect = await ctx.db.query("slugRedirects").withIndex("by_old_slug", (q) => q.eq("oldSlug", normalizePublicSlug(args.slug))).unique()
    if (!redirect) return null
    const property = await ctx.db.get("properties", redirect.propertyId)
    if (!property || property.isPublished !== true || !property.isActive || property.lockedByTier || property.publicSuspended || !property.publicSlug) return null
    return { slug: property.publicSlug }
  },
})

export const setActive = mutation({
  args: { propertyId: v.id("properties"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    await ctx.db.patch("properties", args.propertyId, {
      isActive: args.isActive,
    })
    return null
  },
})

export const backfillPublicGridCells = internalMutation({
  args: { cursor: v.optional(v.id("properties")), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("properties").order("asc").take(500)
    const start = args.cursor ? Math.max(0, rows.findIndex((row) => row._id === args.cursor) + 1) : 0
    const selected = rows.slice(start, start + Math.min(100, Math.max(1, args.batchSize ?? 50)))
    for (const property of selected) {
      const grid = property.publicLat !== undefined && property.publicLng !== undefined ? gridCellFor(property.publicLat, property.publicLng) : undefined
      if (property.publicGridCell !== grid) await ctx.db.patch("properties", property._id, { publicGridCell: grid })
    }
    return { processed: selected.length, nextCursor: start + selected.length < rows.length ? selected.at(-1)?._id ?? null : null }
  },
})

export const getMine = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) =>
    (await requirePropertyOwner(ctx, args.propertyId)).property,
})

export const getPublicBySlug = query({
  args: { slug: v.string(), applicationCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let property = await ctx.db
      .query("properties")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug)))
      .unique()
    if (!property) {
      property = await ctx.db
        .query("properties")
        .withIndex("by_public_slug", (q) =>
          q.eq("publicSlug", normalizePublicSlug(args.slug))
        )
        .unique()
    }
    if (!property || !property.isActive || property.lockedByTier || property.publicSuspended) return null
    const owner = await ctx.db.get("owners", property.ownerId)
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100)
    const unavailableRoomIds = new Set<string>()
    for (const room of rooms) if ((await getRoomHoldBlockers(ctx, room._id, Date.now())).length > 0) unavailableRoomIds.add(String(room._id))
    const registrationCode = args.applicationCode ? parseRegistrationCode(args.applicationCode) : null
    const registrationApplication = registrationCode ? await ctx.db.query("rentalApplications").withIndex("by_code", (q) => q.eq("code", registrationCode)).unique() : null
    if (registrationApplication && registrationApplication.propertyId === property._id && registrationApplication.status === "accepted" && (registrationApplication.holdExpiresAt ?? 0) > Date.now()) {
      const blockers = await getRoomHoldBlockers(ctx, registrationApplication.roomId, Date.now())
      if (blockers.every((blocker) => blocker.applicationId === registrationApplication._id)) unavailableRoomIds.delete(String(registrationApplication.roomId))
    }
    const facilities = await ctx.db
      .query("property_facilities")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100)
    const propertyPhotos = await ctx.db
      .query("property_photos")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(30)
    const availableRooms = rooms.filter(
      (room) =>
        room.status === "available" && !unavailableRoomIds.has(String(room._id))
    )
    const publicRooms = await Promise.all(
      availableRooms.map(async (room) => {
        const media = await ctx.db
          .query("room_media")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .take(20)
        return {
          _id: room._id,
          roomNumber: room.roomNumber,
          monthlyRent: room.monthlyRent,
          floor: room.floor,
          roomType: room.roomType,
          sizeSqm: room.sizeSqm,
          maxOccupants: room.maxOccupants,
          genderCategory: room.genderCategory,
          bathroomType: room.bathroomType,
          bathroomFacilities: room.bathroomFacilities,
          furnitureElectronics: room.furnitureElectronics,
          bedSize: room.bedSize,
          annualRent: room.annualRent,
          depositFee: room.depositFee,
          dpAmount: room.dpAmount,
          electricityStatus: room.electricityStatus,
          additionalFees: room.additionalFees,
          description: room.description,
          media: await Promise.all(
            media.map(async (item) => ({
              kind: item.kind,
              caption: item.caption,
              url: await ctx.storage.getUrl(item.storageId),
            }))
          ),
        }
      })
    )
    return {
      name: property.name,
      slug: property.slug,
      address: property.address,
      publicShowFullAddress: property.publicShowFullAddress === true,
      isVerified: property.propertyVerificationStatus === "verified",
      ownerIdentityVerified: owner?.identityVerificationStatus === "verified",
      bankName: property.bankName,
      bankAccountNumber: property.bankAccountNumber,
      bankAccountHolder: property.bankAccountHolder,
      photos: await Promise.all(
        propertyPhotos
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(async (photo) => ({
            _id: photo._id,
            caption: photo.caption,
            url: await ctx.storage.getUrl(photo.storageId),
          }))
      ),
      facilities: facilities
        .filter((facility) => facility.isActive)
        .map(({ _id, category, name, description }) => ({
          _id,
          category,
          name,
          description,
        })),
      rooms: publicRooms,
    }
  },
})
