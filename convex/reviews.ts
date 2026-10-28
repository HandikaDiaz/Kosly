import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { normalizePublicSlug } from "./lib/publicProperty"
import { requirePropertyOwner } from "./lib/auth"
import { isRentPayment } from "./lib/paymentClassification"
import { isTenantDataVerified } from "./lib/tenantImport"
import {
  BURST_REVIEWS,
  BURST_WINDOW_DAYS,
  INVITE_TTL_DAYS,
  MAX_INVITES_PER_PROPERTY_PER_DAY,
  MAX_REPLY_CHARS,
  buildStayLabel,
  cleanReviewText,
  computeStayDays,
  generateToken,
  hashToken,
  isTenancyEligible,
  shouldInvite,
  formatRatingSummary,
  formatReviewMonthYear,
} from "./lib/reviewRules"

const INVALID_TOKEN = "Link ulasan tidak valid atau sudah tidak tersedia."
const sanitizeDeliveryError = (message: string) => message.replace(/https?:\/\/\S+/gi, "[url]").replace(/\d{7,}/g, "[redacted]").slice(0, 200)

const getTenantPaymentState = async (ctx: QueryCtx, tenantId: Id<"tenants">) => {
  const payments = await ctx.db.query("payments").withIndex("by_tenant_and_paid_at", (q) => q.eq("tenantId", tenantId)).take(100)
  return payments.some(isRentPayment)
}

const getTenantStatus = (tenant: { status: "pending" | "active" | "inactive"; lifecycle_status?: "active" | "akan_pindah" | "moved_out" }) => tenant.lifecycle_status ?? tenant.status

const updateReviewStats = async (ctx: MutationCtx, propertyId: Id<"properties">, countDelta: number, sumDelta: number, now: number) => {
  const current = await ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", propertyId)).unique()
  if (current) {
    await ctx.db.patch("reviewStats", current._id, { count: Math.max(0, current.count + countDelta), sum: Math.max(0, current.sum + sumDelta), updatedAt: now })
  } else {
    await ctx.db.insert("reviewStats", { propertyId, count: Math.max(0, countDelta), sum: Math.max(0, sumDelta), updatedAt: now })
  }
}

export const createReviewInvitation = internalMutation({
  args: { tenancyId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now()
    const tenant = await ctx.db.get("tenants", args.tenancyId)
    if (!tenant) throw new Error("Tenancy tidak ditemukan.")
    if (!isTenantDataVerified(tenant)) throw new Error("Data tenant belum dikonfirmasi oleh tenant.")
    const property = await ctx.db.get("properties", tenant.propertyId)
    if (!property) throw new Error("Properti tidak ditemukan.")
    const stayDays = computeStayDays(tenant.startedAt, tenant.move_out_date ?? now)
    const hasConfirmedPayment = await getTenantPaymentState(ctx, tenant._id)
    if (!isTenancyEligible({ stayDays, hasConfirmedPayment }).eligible || !shouldInvite({ status: getTenantStatus(tenant), stayDays, hasConfirmedPayment, now })) throw new Error("Tenancy belum memenuhi syarat ulasan.")
    const priorReview = await ctx.db.query("reviews").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(1)
    if (priorReview.length > 0) throw new Error("Tenancy sudah memiliki ulasan.")
    const invitations = await ctx.db.query("reviewInvitations").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(20)
    if (invitations.some((item) => !item.usedAt && !item.revokedAt && item.expiresAt > now)) throw new Error("Undangan ulasan masih aktif.")
    const propertyInvitations = await ctx.db.query("reviewInvitations").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(500)
    const since = now - 86_400_000
    if (propertyInvitations.filter((item) => item.createdAt >= since).length >= MAX_INVITES_PER_PROPERTY_PER_DAY) throw new Error("Batas undangan harian tercapai.")
    const token = generateToken()
    const invitationId = await ctx.db.insert("reviewInvitations", {
      propertyId: property._id,
      tenancyId: tenant._id,
      tokenHash: await hashToken(token),
      createdAt: now,
      expiresAt: now + INVITE_TTL_DAYS * 86_400_000,
    })
    return { token, invitationId }
  },
})

export const revokeReviewInvitation = internalMutation({
  args: { invitationId: v.id("reviewInvitations") },
  handler: async (ctx, args) => {
    await ctx.db.patch("reviewInvitations", args.invitationId, { revokedAt: Date.now() })
    return { ok: true }
  },
})

export const getReviewDeliveryStatus = internalQuery({
  args: { tenancyId: v.id("tenants") },
  handler: async (ctx, args) => {
    const invitations = await ctx.db.query("reviewInvitations").withIndex("by_tenancy", (q) => q.eq("tenancyId", args.tenancyId)).take(20)
    const attempts = invitations.reduce((total, invitation) => total + (invitation.deliveryAttempts ?? 0), 0)
    return { attempts, delivered: invitations.some((invitation) => Boolean(invitation.deliveredAt)) }
  },
})

export const getReviewDeliveryTarget = internalQuery({
  args: { tenancyId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get("tenants", args.tenancyId)
    if (!tenant) return null
    const property = await ctx.db.get("properties", tenant.propertyId)
    if (!property) return null
    return { propertyName: property.name, phone: tenant.phone }
  },
})

export const recordReviewInvitationDelivery = internalMutation({
  args: {
    invitationId: v.id("reviewInvitations"),
    success: v.boolean(),
    channel: v.optional(v.union(v.literal("whatsapp"), v.literal("telegram"))),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get("reviewInvitations", args.invitationId)
    if (!invitation) return { ok: false }
    const deliveryAttempts = (invitation.deliveryAttempts ?? 0) + 1
    if (args.success) {
      await ctx.db.patch("reviewInvitations", invitation._id, { deliveredAt: Date.now(), deliveryChannel: args.channel, deliveryAttempts, lastDeliveryError: undefined })
    } else {
      await ctx.db.patch("reviewInvitations", invitation._id, { deliveryAttempts, lastDeliveryError: sanitizeDeliveryError(args.error ?? "Pengiriman gagal.") })
    }
    return { ok: true }
  },
})

export const getInvitationContext = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token)
    const invitation = await ctx.db.query("reviewInvitations").withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash)).unique()
    if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= Date.now()) return null
    const property = await ctx.db.get("properties", invitation.propertyId)
    const tenant = await ctx.db.get("tenants", invitation.tenancyId)
    if (!property || !tenant) return null
    return { propertyName: property.name, stayLabel: buildStayLabel(computeStayDays(tenant.startedAt, tenant.move_out_date ?? Date.now())) }
  },
})

export const submitReview = mutation({
  args: { token: v.string(), rating: v.number(), text: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new Error("Rating harus berupa bilangan bulat 1 sampai 5.")
    const tokenHash = await hashToken(args.token)
    const invitation = await ctx.db.query("reviewInvitations").withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash)).unique()
    if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= Date.now()) throw new Error(INVALID_TOKEN)
    const tenant = await ctx.db.get("tenants", invitation.tenancyId)
    if (!tenant) throw new Error(INVALID_TOKEN)
    if (!isTenantDataVerified(tenant)) throw new Error(INVALID_TOKEN)
    const hasConfirmedPayment = await getTenantPaymentState(ctx, tenant._id)
    const stayDays = computeStayDays(tenant.startedAt, tenant.move_out_date ?? Date.now())
    if (!isTenancyEligible({ stayDays, hasConfirmedPayment }).eligible) throw new Error(INVALID_TOKEN)
    const priorReview = await ctx.db.query("reviews").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(1)
    if (priorReview.length > 0) throw new Error(INVALID_TOKEN)
    const now = Date.now()
    const recent = (await ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", invitation.propertyId).eq("status", "published")).take(500)).filter((review) => review.createdAt >= now - BURST_WINDOW_DAYS * 86_400_000)
    const text = args.text === undefined ? undefined : cleanReviewText(args.text)
    await ctx.db.patch("reviewInvitations", invitation._id, { usedAt: now })
    await ctx.db.insert("reviews", {
      propertyId: invitation.propertyId,
      tenancyId: tenant._id,
      invitationId: invitation._id,
      rating: args.rating,
      ...(text ? { text } : {}),
      stayDays,
      createdAt: now,
      status: "published",
      flaggedForAudit: recent.length >= BURST_REVIEWS - 1,
    })
    await updateReviewStats(ctx, invitation.propertyId, 1, args.rating, now)
    return { ok: true }
  },
})

export const ownerReplyToReview = mutation({
  args: { reviewId: v.id("reviews"), text: v.string() },
  handler: async (ctx, args) => {
    const review = await ctx.db.get("reviews", args.reviewId)
    if (!review) throw new Error("Ulasan tidak ditemukan.")
    await requirePropertyOwner(ctx, review.propertyId)
    if (review.ownerReply) throw new Error("Balasan ulasan sudah tersedia.")
    await ctx.db.patch("reviews", review._id, { ownerReply: { text: cleanReviewText(args.text, MAX_REPLY_CHARS), createdAt: Date.now() } })
    return { ok: true }
  },
})

export const reportReview = mutation({
  args: { reviewId: v.id("reviews"), reason: v.union(v.literal("tidak_pernah_menginap"), v.literal("isi_menyerang_atau_palsu"), v.literal("data_pribadi"), v.literal("lainnya")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const review = await ctx.db.get("reviews", args.reviewId)
    if (!review) throw new Error("Ulasan tidak ditemukan.")
    await requirePropertyOwner(ctx, review.propertyId)
    const reports = await ctx.db.query("reviewReports").withIndex("by_review", (q) => q.eq("reviewId", review._id)).take(20)
    if (reports.length > 0) throw new Error("Ulasan sudah dilaporkan.")
    await ctx.db.insert("reviewReports", { reviewId: review._id, propertyId: review.propertyId, reason: args.reason, ...(args.note ? { note: cleanReviewText(args.note, MAX_REPLY_CHARS) } : {}), createdAt: Date.now(), status: "open" })
    return { ok: true }
  },
})

export const ownerListReviews = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePropertyOwner(ctx, args.propertyId)
    const reviews = await ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId)).take(100)
    return Promise.all(reviews.map(async (review) => {
      const reports = await ctx.db.query("reviewReports").withIndex("by_review", (q) => q.eq("reviewId", review._id)).take(20)
      return { reviewId: review._id, rating: review.rating, ...(review.text ? { text: review.text } : {}), stayLabel: buildStayLabel(review.stayDays), createdAt: review.createdAt, status: review.status, ...(review.ownerReply ? { ownerReply: review.ownerReply } : {}), alreadyReported: reports.length > 0 }
    }))
  },
})

export const moderateReview = internalMutation({
  args: { reviewId: v.id("reviews"), decision: v.union(v.literal("published"), v.literal("hidden")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const review = await ctx.db.get("reviews", args.reviewId)
    if (!review) throw new Error("Ulasan tidak ditemukan.")
    if (review.status !== args.decision) {
      const delta = args.decision === "published" ? 1 : -1
      await updateReviewStats(ctx, review.propertyId, delta, delta * review.rating, Date.now())
      await ctx.db.patch("reviews", review._id, { status: args.decision })
    }
    return { ok: true }
  },
})

export const resolveReviewReport = internalMutation({
  args: { reportId: v.id("reviewReports") },
  handler: async (ctx, args) => {
    await ctx.db.patch("reviewReports", args.reportId, { status: "resolved" })
    return { ok: true }
  },
})

export const listReviewsNeedingAudit = internalQuery({
  args: {},
  handler: async (ctx) => {
    const reviews = await ctx.db.query("reviews").take(500)
    const reports = await ctx.db.query("reviewReports").withIndex("by_status", (q) => q.eq("status", "open")).take(500)
    const reported = new Set(reports.map((report) => report.reviewId))
    return reviews.filter((review) => review.flaggedForAudit || reported.has(review._id))
  },
})

export const scheduleActiveReviewInvitations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const tenants = await ctx.db.query("tenants").withIndex("by_status_and_due_day", (q) => q.eq("status", "active")).take(500)
    let scheduled = 0
    const scheduledTenancyIds = new Set<Id<"tenants">>()
    for (const tenant of tenants) {
      if (scheduled >= 50) break
      if (!isTenantDataVerified(tenant)) continue
      const stayDays = computeStayDays(tenant.startedAt, now)
      const payments = await ctx.db.query("payments").withIndex("by_tenant_and_paid_at", (q) => q.eq("tenantId", tenant._id)).take(100)
      const hasConfirmedPayment = payments.some(isRentPayment)
      if (!shouldInvite({ status: getTenantStatus(tenant), stayDays, hasConfirmedPayment, now })) continue
      const existingReview = await ctx.db.query("reviews").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(1)
      if (existingReview.length > 0) continue
      const invitations = await ctx.db.query("reviewInvitations").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(20)
      if (invitations.some((invitation) => !invitation.usedAt && !invitation.revokedAt && invitation.expiresAt > now)) continue
      const latestAttempt = invitations.filter((invitation) => (invitation.deliveryAttempts ?? 0) > 0).sort((left, right) => right.createdAt - left.createdAt)[0]
      if (latestAttempt && now - latestAttempt.createdAt < 86_400_000) continue
      if (invitations.reduce((total, invitation) => total + (invitation.deliveryAttempts ?? 0), 0) >= 3) continue
      await ctx.scheduler.runAfter(scheduled * 1_000, internal.reviewDelivery.sendReviewInvitation, { tenancyId: tenant._id, reason: "active90" })
      scheduledTenancyIds.add(tenant._id)
      scheduled += 1
    }
    if (scheduled < 50) {
      const invitations = await ctx.db.query("reviewInvitations").take(500)
      const tenancyIds = [...new Set(invitations.map((invitation) => invitation.tenancyId))]
      for (const tenancyId of tenancyIds) {
        if (scheduled >= 50) break
        if (scheduledTenancyIds.has(tenancyId)) continue
        const tenant = await ctx.db.get("tenants", tenancyId)
        if (!tenant) continue
        const attempts = invitations.filter((invitation) => invitation.tenancyId === tenancyId)
        if (attempts.some((invitation) => invitation.deliveredAt) || attempts.reduce((total, invitation) => total + (invitation.deliveryAttempts ?? 0), 0) >= 3) continue
        const latest = attempts.filter((invitation) => (invitation.deliveryAttempts ?? 0) > 0).sort((left, right) => right.createdAt - left.createdAt)[0]
        if (!latest || now - latest.createdAt < 86_400_000 || latest.usedAt || latest.revokedAt === undefined) continue
        const reason = getTenantStatus(tenant) === "moved_out" || getTenantStatus(tenant) === "inactive" ? "moveout" : "active90"
        await ctx.scheduler.runAfter(scheduled * 1_000, internal.reviewDelivery.sendReviewInvitation, { tenancyId, reason })
        scheduledTenancyIds.add(tenancyId)
        scheduled += 1
      }
    }
    return { scheduled }
  },
})

export const recomputeReviewStats = internalMutation({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const published = await ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", args.propertyId).eq("status", "published")).take(5000)
    const current = await ctx.db.query("reviewStats").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).unique()
    const values = { count: published.length, sum: published.reduce((total, review) => total + review.rating, 0), updatedAt: Date.now() }
    if (current) await ctx.db.patch("reviewStats", current._id, values)
    else await ctx.db.insert("reviewStats", { propertyId: args.propertyId, ...values })
    return formatRatingSummary(values)
  },
})

export const listPublishedReviews = query({
  args: { slug: v.string(), cursor: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const property = await ctx.db.query("properties").withIndex("by_public_slug", (q) => q.eq("publicSlug", normalizePublicSlug(args.slug))).unique()
    if (!property || property.isPublished !== true || !property.isActive || property.lockedByTier) return null
    const pageSize = Math.min(20, Math.max(1, Math.floor(args.limit ?? 10)))
    const all = await ctx.db.query("reviews").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "published")).order("desc").take(500)
    let start = 0
    if (args.cursor) {
      for (let index = 0; index < all.length; index += 1) {
        if (await hashToken(String(all[index]._id)) === args.cursor) {
          start = index + 1
          break
        }
      }
    }
    const page = all.slice(start, start + pageSize)
    const nextCursor = start + page.length < all.length && page.length > 0 ? await hashToken(String(page[page.length - 1]._id)) : null
    return {
      reviews: page.map((review) => ({
        rating: review.rating,
        ...(review.text ? { text: review.text } : {}),
        stayLabel: buildStayLabel(review.stayDays),
        monthYear: formatReviewMonthYear(review.createdAt),
        ...(review.ownerReply ? { ownerReply: { text: review.ownerReply.text, monthYear: formatReviewMonthYear(review.ownerReply.createdAt) } } : {}),
      })),
      nextCursor,
    }
  },
})
