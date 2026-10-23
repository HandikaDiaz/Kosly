import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { Id, Doc } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { requirePropertyOwner } from "./lib/auth"
import {
  deriveVerificationStatus,
  evaluateCapture,
  MAX_ATTEMPTS_PER_HOUR,
  MAX_UPLOAD_AGE_MS,
  MIN_PASSING_CAPTURES,
  ownerReasonMessage,
} from "./lib/locationVerification"

const captureKindValidator = v.union(
  v.literal("front"),
  v.literal("street"),
  v.literal("room")
)
const captureStatusValidator = v.union(
  v.literal("passed"),
  v.literal("needs_review"),
  v.literal("rejected")
)
const verificationStatusValidator = v.union(
  v.literal("unverified"),
  v.literal("pending_review"),
  v.literal("verified")
)
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_CLIENT_CAPTURE_AGE_MS = 24 * 60 * 60 * 1000
const MAX_CLIENT_CLOCK_SKEW_MS = 5 * 60 * 1000

const isFiniteNumber = (value: number) => Number.isFinite(value)
const assertCoordinates = (lat: number, lng: number) => {
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    throw new Error("Latitude pin harus berupa angka antara -90 dan 90.")
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    throw new Error("Longitude pin harus berupa angka antara -180 dan 180.")
  }
}

const activeCapturesForProperty = async (
  ctx: MutationCtx,
  propertyId: Id<"properties">
) =>
  await ctx.db
    .query("locationCaptures")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .take(500)

const updatePropertyVerificationStatus = async (
  ctx: MutationCtx,
  property: Doc<"properties">,
  captures: Array<
    Pick<Doc<"locationCaptures">, "kind" | "status" | "supersededAt">
  >,
  now: number
) => {
  const status = deriveVerificationStatus(captures)
  const locationVerifiedAt =
    status === "verified"
      ? property.locationVerificationStatus === "verified"
        ? (property.locationVerifiedAt ?? now)
        : now
      : undefined

  await ctx.db.patch("properties", property._id, {
    locationVerificationStatus: status,
    locationVerifiedAt,
  })
  return status
}

export const setPropertyPin = mutation({
  args: { propertyId: v.id("properties"), lat: v.number(), lng: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    assertCoordinates(args.lat, args.lng)

    const pinChanged =
      property.pinLat !== args.lat || property.pinLng !== args.lng
    if (!pinChanged) return null

    const now = Date.now()
    for await (const capture of ctx.db
      .query("locationCaptures")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))) {
      if (capture.supersededAt === undefined) {
        await ctx.db.patch("locationCaptures", capture._id, {
          supersededAt: now,
        })
      }
    }
    await ctx.db.patch("properties", args.propertyId, {
      pinLat: args.lat,
      pinLng: args.lng,
      locationVerificationStatus: "unverified",
      locationVerifiedAt: undefined,
    })
    return null
  },
})

export const generateVerificationUploadUrl = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    return await ctx.storage.generateUploadUrl()
  },
})

export const submitLocationCapture = mutation({
  args: {
    propertyId: v.id("properties"),
    kind: captureKindValidator,
    storageId: v.id("_storage"),
    lat: v.number(),
    lng: v.number(),
    accuracyM: v.number(),
    clientCapturedAt: v.number(),
  },
  returns: v.object({
    status: captureStatusValidator,
    reason: v.optional(v.string()),
    distanceM: v.number(),
    locationVerificationStatus: verificationStatusValidator,
  }),
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    if (property.pinLat === undefined || property.pinLng === undefined) {
      throw new Error(
        "Pin lokasi kos belum ditetapkan. Tetapkan pin lokasi sebelum mengirim foto verifikasi."
      )
    }
    assertCoordinates(args.lat, args.lng)
    if (!isFiniteNumber(args.accuracyM) || args.accuracyM <= 0) {
      throw new Error("Akurasi GPS harus berupa angka lebih dari 0 meter.")
    }

    const now = Date.now()
    if (
      !isFiniteNumber(args.clientCapturedAt) ||
      args.clientCapturedAt < now - MAX_CLIENT_CAPTURE_AGE_MS ||
      args.clientCapturedAt > now + MAX_CLIENT_CLOCK_SKEW_MS
    ) {
      throw new Error(
        "Waktu pengambilan foto tidak masuk akal. Ambil foto baru lalu coba lagi."
      )
    }
    const recentCaptures = await ctx.db
      .query("locationCaptures")
      .withIndex("by_property", (q) =>
        q
          .eq("propertyId", args.propertyId)
          .gte("_creationTime", now - 60 * 60 * 1000)
      )
      .take(MAX_ATTEMPTS_PER_HOUR + 1)
    if (recentCaptures.length >= MAX_ATTEMPTS_PER_HOUR) {
      throw new Error(
        "Batas 10 percobaan verifikasi per jam telah tercapai. Coba lagi setelah satu jam."
      )
    }

    const file = await ctx.db.system.get("_storage", args.storageId)
    if (!file || !file.contentType?.startsWith("image/")) {
      throw new Error("Foto verifikasi harus berupa berkas gambar.")
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        "Ukuran foto verifikasi tidak wajar. Gunakan gambar berukuran maksimal 10 MB."
      )
    }
    if (now - file._creationTime > MAX_UPLOAD_AGE_MS) {
      throw new Error(
        "Berkas foto sudah terlalu lama. Unggah foto baru dalam 10 menit terakhir."
      )
    }

    const evaluation = evaluateCapture({
      pin: { lat: property.pinLat, lng: property.pinLng },
      point: { lat: args.lat, lng: args.lng },
      accuracyM: args.accuracyM,
    })
    await ctx.db.insert("locationCaptures", {
      ...args,
      ...evaluation,
      serverCapturedAt: now,
    })
    const captures = await activeCapturesForProperty(ctx, args.propertyId)
    const locationVerificationStatus = await updatePropertyVerificationStatus(
      ctx,
      property,
      captures,
      now
    )

    return {
      status: evaluation.status,
      ...(evaluation.reason
        ? { reason: ownerReasonMessage(evaluation.reason) }
        : {}),
      distanceM: evaluation.distanceM,
      locationVerificationStatus,
    }
  },
})

export const getLocationVerification = query({
  args: { propertyId: v.id("properties") },
  returns: v.object({
    status: verificationStatusValidator,
    pin: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    locationVerifiedAt: v.optional(v.number()),
    captures: v.array(
      v.object({
        kind: captureKindValidator,
        status: captureStatusValidator,
        reason: v.optional(v.string()),
        distanceM: v.number(),
        serverCapturedAt: v.number(),
      })
    ),
    remainingRequirements: v.object({
      passedCapturesNeeded: v.number(),
      needsFrontCapture: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const { property } = await requirePropertyOwner(ctx, args.propertyId)
    const captures = (
      await ctx.db
        .query("locationCaptures")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .take(500)
    ).filter((capture) => capture.supersededAt === undefined)
    const passedCaptures = captures.filter(
      (capture) => capture.status === "passed"
    )

    return {
      status: property.locationVerificationStatus ?? "unverified",
      ...(property.pinLat !== undefined && property.pinLng !== undefined
        ? { pin: { lat: property.pinLat, lng: property.pinLng } }
        : {}),
      ...(property.locationVerificationStatus === "verified" &&
      property.locationVerifiedAt !== undefined
        ? { locationVerifiedAt: property.locationVerifiedAt }
        : {}),
      captures: captures.map((capture) => ({
        kind: capture.kind,
        status: capture.status,
        ...(capture.reason
          ? {
              reason:
                ownerReasonMessage(
                  capture.reason as
                    | "akurasi_rendah"
                    | "jarak_di_luar_toleransi"
                    | "terlalu_jauh"
                ) ?? capture.reason,
            }
          : {}),
        distanceM: capture.distanceM,
        serverCapturedAt: capture.serverCapturedAt,
      })),
      remainingRequirements: {
        passedCapturesNeeded: Math.max(
          0,
          MIN_PASSING_CAPTURES - passedCaptures.length
        ),
        needsFrontCapture: !passedCaptures.some(
          (capture) => capture.kind === "front"
        ),
      },
    }
  },
})

export const resolveLocationReview = internalMutation({
  args: {
    captureId: v.id("locationCaptures"),
    decision: v.union(v.literal("passed"), v.literal("rejected")),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const capture = await ctx.db.get("locationCaptures", args.captureId)
    if (!capture || capture.supersededAt !== undefined) {
      throw new Error("Capture lokasi tidak tersedia untuk ditinjau.")
    }
    const property = await ctx.db.get("properties", capture.propertyId)
    if (!property)
      throw new Error("Properti untuk capture lokasi tidak ditemukan.")

    const now = Date.now()
    const note = args.note.trim()
    await ctx.db.patch("locationCaptures", capture._id, {
      status: args.decision,
      reason:
        args.decision === "rejected"
          ? note || "Ditolak setelah peninjauan."
          : undefined,
    })
    const captures = await activeCapturesForProperty(ctx, capture.propertyId)
    await updatePropertyVerificationStatus(ctx, property, captures, now)
    return null
  },
})
