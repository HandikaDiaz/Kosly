import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin, requirePropertyOwner, requireOwner } from "./lib/auth"
import { internal } from "./_generated/api"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

export const IDENTITY_FILE_RETENTION_DAYS = 90
export const IDENTITY_FILE_RETENTION_MS = IDENTITY_FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000

const decisionValidator = v.union(v.literal("approved"), v.literal("rejected"))

export const submitIdentity = mutation({
  args: { ktpStorageId: v.id("_storage"), selfieStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const ktp = await ctx.db.system.get("_storage", args.ktpStorageId)
    const selfie = await ctx.db.system.get("_storage", args.selfieStorageId)
    if (!ktp || !selfie || (ktp.contentType && !ktp.contentType.startsWith("image/")) || (selfie.contentType && !selfie.contentType.startsWith("image/"))) throw new Error("KTP dan selfie harus berupa gambar.")
    await ctx.db.patch("owners", owner._id, { ktpStorageId: args.ktpStorageId, selfieStorageId: args.selfieStorageId, identityVerificationStatus: "pending_review", identityVerificationFilesDeleteAfter: undefined })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendAdminQueueNotice, { text: "📥 <b>Verifikasi identitas baru</b> menunggu review. Gunakan /pending untuk melihat ID antrean." })
    return null
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const submitProperty = mutation({
  args: { propertyId: v.id("properties"), ownershipProofStorageId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    if (args.ownershipProofStorageId) {
      const proof = await ctx.db.system.get("_storage", args.ownershipProofStorageId)
      if (!proof || (proof.contentType && !proof.contentType.startsWith("image/"))) throw new Error("Bukti kepemilikan harus berupa gambar.")
      await ctx.db.patch("properties", args.propertyId, { ownershipProofStorageId: args.ownershipProofStorageId })
    }
    await ctx.db.patch("properties", args.propertyId, { propertyVerificationStatus: "pending_review" })
    await ctx.scheduler.runAfter(0, internal.bots.delivery.sendAdminQueueNotice, { text: "📥 <b>Verifikasi properti baru</b> menunggu review. Gunakan /pending untuk melihat ID antrean." })
    return null
  },
})

export const listPendingIdentity = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const owners = await ctx.db.query("owners").take(100)
    return owners.filter((owner) => owner.identityVerificationStatus === "pending_review").map((owner) => ({ owner, ktpStorageId: owner.ktpStorageId ?? null, selfieStorageId: owner.selfieStorageId ?? null }))
  },
})

export const listPendingProperties = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const properties = await ctx.db.query("properties").take(100)
    return await Promise.all(properties.filter((property) => property.propertyVerificationStatus === "pending_review").map(async (property) => ({ property, photos: await Promise.all((await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(30)).map(async (photo) => ({ ...photo, url: await ctx.storage.getUrl(photo.storageId) }))), ownershipProofStorageId: property.ownershipProofStorageId ?? null })))
  },
})

export const reviewIdentityForAdmin = async (ctx: MutationCtx, adminId: Id<"owners">, args: { ownerId: Id<"owners">; decision: "approved" | "rejected"; reason?: string }) => {
    const owner = await ctx.db.get("owners", args.ownerId)
    if (!owner || owner.identityVerificationStatus !== "pending_review") throw new Error("Review identitas sudah diputuskan atau tidak ditemukan.")
    if (args.decision === "rejected" && !args.reason?.trim()) throw new Error("Alasan penolakan wajib diisi.")
    const reviewedAt = Date.now()
    await ctx.db.patch("owners", owner._id, { identityVerificationStatus: args.decision === "approved" ? "verified" : "rejected", identityVerificationReviewedAt: reviewedAt, identityVerificationFilesDeleteAfter: reviewedAt + IDENTITY_FILE_RETENTION_MS, identityVerificationRejectionReason: args.decision === "rejected" ? args.reason?.trim() : undefined })
    return { reviewerOwnerId: adminId }
}

export const reviewIdentity = mutation({
  args: { ownerId: v.id("owners"), decision: decisionValidator, reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    return await reviewIdentityForAdmin(ctx, admin._id, args)
  },
})

export const deleteExpiredIdentityFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const owners = [
      ...(await ctx.db.query("owners").withIndex("by_identity_retention", (q) => q.eq("identityVerificationStatus", "verified").lte("identityVerificationFilesDeleteAfter", now)).take(500)),
      ...(await ctx.db.query("owners").withIndex("by_identity_retention", (q) => q.eq("identityVerificationStatus", "rejected").lte("identityVerificationFilesDeleteAfter", now)).take(500)),
    ]
    let deleted = 0
    for (const owner of owners) {
      if (owner.ktpStorageId) await ctx.storage.delete(owner.ktpStorageId)
      if (owner.selfieStorageId) await ctx.storage.delete(owner.selfieStorageId)
      await ctx.db.patch("owners", owner._id, { ktpStorageId: undefined, selfieStorageId: undefined, identityVerificationFilesDeleteAfter: undefined })
      deleted += 1
    }
    return { deleted }
  },
})

export const reviewPropertyForAdmin = async (ctx: MutationCtx, adminId: Id<"owners">, args: { propertyId: Id<"properties">; decision: "approved" | "rejected"; reason?: string }) => {
    const property = await ctx.db.get("properties", args.propertyId)
    if (!property || property.propertyVerificationStatus !== "pending_review") throw new Error("Review properti sudah diputuskan atau tidak ditemukan.")
    if (args.decision === "rejected" && !args.reason?.trim()) throw new Error("Alasan penolakan wajib diisi.")
    await ctx.db.patch("properties", property._id, { propertyVerificationStatus: args.decision === "approved" ? "verified" : "rejected", propertyVerificationReviewedAt: Date.now(), propertyVerificationRejectionReason: args.decision === "rejected" ? args.reason?.trim() : undefined })
    return { reviewerOwnerId: adminId }
}

export const reviewProperty = mutation({
  args: { propertyId: v.id("properties"), decision: decisionValidator, reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    return await reviewPropertyForAdmin(ctx, admin._id, args)
  },
})
