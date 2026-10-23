import { internalMutation, mutation, query } from "./_generated/server"
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

const publicProfileFields = {
  publicDescription: v.optional(v.string()),
  publicAreaLabel: v.optional(v.string()),
  publicPhotoIds: v.optional(v.array(v.id("property_photos"))),
  publicShowPrice: v.optional(v.boolean()),
  publicShowFullAddress: v.optional(v.boolean()),
  publicLat: v.optional(v.number()),
  publicLng: v.optional(v.number()),
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
  publicSlug: v.string(),
  publicDescription: v.optional(v.string()),
  publicAreaLabel: v.optional(v.string()),
  publicLat: v.optional(v.number()),
  publicLng: v.optional(v.number()),
  address: v.optional(v.string()),
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
    if (args.publicDescription !== undefined) {
      if (args.publicDescription.length > 1000)
        throw new Error("Deskripsi publik maksimal 1000 karakter.")
      patch.publicDescription = args.publicDescription.trim() || undefined
    }
    if (args.publicAreaLabel !== undefined) {
      if (args.publicAreaLabel.length > 120)
        throw new Error("Label area maksimal 120 karakter.")
      patch.publicAreaLabel = args.publicAreaLabel.trim() || undefined
    }
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
        if (!existing && !registration && !RESERVED_SLUGS.has(publicSlug)) break
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
      property.lockedByTier
    )
      return null
    const publicSlug = property.publicSlug
    if (!publicSlug) return null
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
    const pendingPayments = await ctx.db
      .query("payments")
      .withIndex("by_property_and_status", (q) =>
        q.eq("propertyId", property._id).eq("status", "pending_review")
      )
      .take(100)
    const activeBookings = await ctx.db
      .query("bookings")
      .withIndex("by_property_and_status", (q) =>
        q.eq("propertyId", property._id)
      )
      .take(100)
    const blockedRoomIds = new Set([
      ...pendingPayments.map((payment) => String(payment.roomId)),
      ...activeBookings
        .filter(
          (booking) =>
            booking.status === "pending" || booking.status === "locked"
        )
        .map((booking) => String(booking.roomId)),
    ])
    const activeApplicationHolds = await ctx.db
      .query("rentalApplications")
      .withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "accepted"))
      .take(200)
    for (const application of activeApplicationHolds) {
      if ((application.holdExpiresAt ?? 0) > Date.now()) blockedRoomIds.add(String(application.roomId))
    }
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
    return {
      name: property.name,
      publicSlug,
      ...(property.publicDescription
        ? { publicDescription: property.publicDescription }
        : {}),
      ...(property.publicAreaLabel
        ? { publicAreaLabel: property.publicAreaLabel }
        : {}),
      ...(property.publicLat !== undefined && property.publicLng !== undefined
        ? { publicLat: property.publicLat, publicLng: property.publicLng }
        : {}),
      ...(property.publicShowFullAddress === true
        ? { address: property.address }
        : {}),
      isLocationVerified: property.locationVerificationStatus === "verified",
      ...(property.locationVerificationStatus === "verified" &&
      property.locationVerifiedAt !== undefined
        ? { locationVerifiedAt: property.locationVerifiedAt }
        : {}),
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

export const listPublishedSlugs = query({
  args: {},
  returns: v.array(v.object({ slug: v.string(), updatedAt: v.number() })),
  handler: async (ctx) =>
    (
      await ctx.db
        .query("properties")
        .withIndex("by_is_published", (q) => q.eq("isPublished", true))
        .take(100)
    )
      .filter(
        (property) =>
          Boolean(property.publicSlug) &&
          property.isActive &&
          !property.lockedByTier
      )
      .map((property) => ({
        slug: property.publicSlug!,
        updatedAt: property._creationTime,
      })),
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
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const property = await ctx.db
      .query("properties")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug)))
      .unique()
    if (!property || !property.isActive || property.lockedByTier) return null
    const owner = await ctx.db.get("owners", property.ownerId)
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100)
    const pendingPayments = await ctx.db
      .query("payments")
      .withIndex("by_property_and_status", (q) =>
        q.eq("propertyId", property._id).eq("status", "pending_review")
      )
      .take(100)
    const activeBookings = await ctx.db
      .query("bookings")
      .withIndex("by_property_and_status", (q) =>
        q.eq("propertyId", property._id)
      )
      .take(100)
    const unavailableRoomIds = new Set([
      ...pendingPayments.map((payment) => String(payment.roomId)),
      ...activeBookings
        .filter(
          (booking) =>
            booking.status === "pending" || booking.status === "locked"
        )
        .map((booking) => String(booking.roomId)),
    ])
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
      isVerified: property.propertyVerificationStatus === "verified",
      ownerIdentityVerified: owner?.identityVerificationStatus === "verified",
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
