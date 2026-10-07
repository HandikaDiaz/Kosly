import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin, requirePropertyOwner, requireOwner } from "./lib/auth"

const decisionValidator = v.union(v.literal("approved"), v.literal("rejected"))

export const submitIdentity = mutation({
  args: { ktpStorageId: v.id("_storage"), selfieStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const ktp = await ctx.db.system.get("_storage", args.ktpStorageId)
    const selfie = await ctx.db.system.get("_storage", args.selfieStorageId)
    if (!ktp || !selfie || (ktp.contentType && !ktp.contentType.startsWith("image/")) || (selfie.contentType && !selfie.contentType.startsWith("image/"))) throw new Error("KTP dan selfie harus berupa gambar.")
    await ctx.db.patch("owners", owner._id, { ktpStorageId: args.ktpStorageId, selfieStorageId: args.selfieStorageId, identityVerificationStatus: "pending_review" })
    return null
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
    return null
  },
})

export const listPendingIdentity = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const owners = await ctx.db.query("owners").take(100)
    return await Promise.all(owners.filter((owner) => owner.identityVerificationStatus === "pending_review").map(async (owner) => ({ owner, ktpUrl: owner.ktpStorageId ? await ctx.storage.getUrl(owner.ktpStorageId) : null, selfieUrl: owner.selfieStorageId ? await ctx.storage.getUrl(owner.selfieStorageId) : null })))
  },
})

export const listPendingProperties = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const properties = await ctx.db.query("properties").take(100)
    return await Promise.all(properties.filter((property) => property.propertyVerificationStatus === "pending_review").map(async (property) => ({ property, photos: await Promise.all((await ctx.db.query("property_photos").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(30)).map(async (photo) => ({ ...photo, url: await ctx.storage.getUrl(photo.storageId) }))), ownershipProofUrl: property.ownershipProofStorageId ? await ctx.storage.getUrl(property.ownershipProofStorageId) : null })))
  },
})

export const reviewIdentity = mutation({
  args: { ownerId: v.id("owners"), decision: decisionValidator, reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const owner = await ctx.db.get("owners", args.ownerId)
    if (!owner || owner.identityVerificationStatus !== "pending_review") throw new Error("Review identitas sudah diputuskan atau tidak ditemukan.")
    if (args.decision === "rejected" && !args.reason?.trim()) throw new Error("Alasan penolakan wajib diisi.")
    await ctx.db.patch("owners", owner._id, { identityVerificationStatus: args.decision === "approved" ? "verified" : "rejected", identityVerificationReviewedAt: Date.now(), identityVerificationRejectionReason: args.decision === "rejected" ? args.reason?.trim() : undefined })
    return { reviewerOwnerId: admin._id }
  },
})

export const reviewProperty = mutation({
  args: { propertyId: v.id("properties"), decision: decisionValidator, reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const property = await ctx.db.get("properties", args.propertyId)
    if (!property || property.propertyVerificationStatus !== "pending_review") throw new Error("Review properti sudah diputuskan atau tidak ditemukan.")
    if (args.decision === "rejected" && !args.reason?.trim()) throw new Error("Alasan penolakan wajib diisi.")
    await ctx.db.patch("properties", property._id, { propertyVerificationStatus: args.decision === "approved" ? "verified" : "rejected", propertyVerificationReviewedAt: Date.now(), propertyVerificationRejectionReason: args.decision === "rejected" ? args.reason?.trim() : undefined })
    return null
  },
})
