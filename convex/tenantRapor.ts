import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { requirePropertyOwner } from "./lib/auth"
import { hashToken } from "./lib/reviewRules"
import { SHARE_CONSENT_VERSION, DISPUTE_AUDIT_THRESHOLD, DISPUTE_RESPONSE_DAYS, IDENTITY_INACTIVE_DELETE_MONTHS, MAX_DISPUTES_PER_TENANCY, MAX_DISPUTE_NOTE_CHARS, MAX_OPEN_DISPUTES_PER_IDENTITY, classifyPeriod, computeRaporSummary, formatMonthLabel, labelForTier, type PaymentPeriod } from "./lib/raporRules"
import { SHARE_CONSENT_TEXT, consentTextForHash } from "./lib/consentTexts"
import { listPaymentPeriodsForTenancy } from "./lib/paymentAdapter"
import { requireTenantSession } from "./tenantIdentity"
import { SHARE_ROW_RETENTION_DAYS } from "./lib/shareRules"

const cleanNote = (value?: string) => value?.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_DISPUTE_NOTE_CHARS) || undefined
const confirmedLinks = async (ctx: QueryCtx | MutationCtx, identityId: Id<"tenantIdentities">) => (await ctx.db.query("tenancyIdentityLinks").withIndex("by_identity", (q) => q.eq("identityId", identityId)).take(100)).filter((link) => link.status === "confirmed")
const excludedForIdentity = async (ctx: QueryCtx | MutationCtx, identityId: Id<"tenantIdentities">) => {
  const disputes = await ctx.db.query("paymentDisputes").withIndex("by_identity", (q) => q.eq("identityId", identityId)).take(500)
  return new Set(disputes.filter((item) => item.status === "open" || item.status === "resolved_for_tenant" || item.status === "lapsed").map((item) => item.periodId))
}
const allPeriodsForIdentity = async (ctx: QueryCtx | MutationCtx, identityId: Id<"tenantIdentities">) => {
  const links = await confirmedLinks(ctx, identityId)
  const periods = (await Promise.all(links.map((link) => listPaymentPeriodsForTenancy(ctx, link.tenancyId)))).flat()
  return { links, periods }
}
const touchIdentity = async (ctx: MutationCtx, identityId: Id<"tenantIdentities">) => {
  const identity = await ctx.db.get("tenantIdentities", identityId)
  if (identity && (!identity.lastActiveAt || Date.now() - identity.lastActiveAt >= 86_400_000)) await ctx.db.patch("tenantIdentities", identityId, { lastActiveAt: Date.now() })
}

export const getShareConsentText = query({ args: {}, handler: async () => SHARE_CONSENT_TEXT })

export const grantShareConsent = mutation({
  args: { sessionToken: v.string(), textVersion: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireTenantSession(ctx, args.sessionToken)
    await touchIdentity(ctx, identity._id)
    if (args.textVersion !== SHARE_CONSENT_VERSION) throw new Error("Versi persetujuan sudah berubah. Muat ulang halaman.")
    const active = (await ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", identity._id).eq("purpose", "share_rapor")).take(20)).find((item) => !item.withdrawnAt)
    if (active && active.textVersion === SHARE_CONSENT_VERSION) return { active: true, grantedAt: active.grantedAt, textVersion: active.textVersion }
    if (active) await ctx.db.patch("tenantConsents", active._id, { withdrawnAt: Date.now() })
    const grantedAt = Date.now()
    const consent = await ctx.db.insert("tenantConsents", { identityId: identity._id, purpose: "share_rapor", textVersion: SHARE_CONSENT_VERSION, textSha256: await hashToken(consentTextForHash()), grantedAt, channel: "web" })
    return { active: true, grantedAt, textVersion: SHARE_CONSENT_VERSION, consentId: consent }
  },
})

export const withdrawShareConsent = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireTenantSession(ctx, args.sessionToken)
    await touchIdentity(ctx, identity._id)
    const active = (await ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", identity._id).eq("purpose", "share_rapor")).take(20)).find((item) => !item.withdrawnAt)
    if (active) await ctx.db.patch("tenantConsents", active._id, { withdrawnAt: Date.now() })
    await ctx.runMutation(internal.tenantRapor.revokeDerivedData, { identityId: identity._id })
    return { active: false }
  },
})

export const getMyConsentState = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireTenantSession(ctx, args.sessionToken)
    const active = (await ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", identity._id).eq("purpose", "share_rapor")).take(20)).find((item) => !item.withdrawnAt)
    return { active: Boolean(active), grantedAt: active?.grantedAt, needsReconsent: Boolean(active && active.textVersion !== SHARE_CONSENT_VERSION) }
  },
})

export const listMyPaymentRecords = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireTenantSession(ctx, args.sessionToken)
    const links = await confirmedLinks(ctx, identity._id)
    const disputes = await ctx.db.query("paymentDisputes").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(500)
    return (await Promise.all(links.map(async (link) => {
      const tenant = await ctx.db.get("tenants", link.tenancyId)
      const property = tenant ? await ctx.db.get("properties", tenant.propertyId) : null
      if (!tenant || !property) return null
      const periods = await listPaymentPeriodsForTenancy(ctx, tenant._id)
      const due = periods.filter((period) => period.dueDate <= Date.now()).map((period) => {
        const classification = classifyPeriod(period, Date.now(), new Set(disputes.filter((item) => item.status !== "withdrawn" && item.periodId === period.periodId).map((item) => item.periodId)))
        const dispute = disputes.find((item) => item.periodId === period.periodId && item.status !== "withdrawn")
        return { periodId: period.periodId, monthLabel: formatMonthLabel(new Date(period.dueDate)), status: classification === "on_time" ? "tepat_waktu" as const : classification === "late" && period.confirmed ? "terlambat" as const : "belum_dibayar" as const, ...(classification === "late" && period.paidAt ? { daysLate: Math.max(1, Math.ceil((period.paidAt - period.dueDate) / 86_400_000)) } : {}), ...(dispute ? { disputeStatus: dispute.status } : {}) }
      })
      return { propertyName: property.name, periodLabel: `${formatMonthLabel(new Date(tenant.startedAt))} - ${tenant.move_out_date ? formatMonthLabel(new Date(tenant.move_out_date)) : "sekarang"}`, periods: due }
    }))).filter((item): item is NonNullable<typeof item> => item !== null)
  },
})

const summaryForIdentity = async (ctx: QueryCtx | MutationCtx, identityId: Id<"tenantIdentities">) => {
  const { periods } = await allPeriodsForIdentity(ctx, identityId)
  return computeRaporSummary(periods, Date.now(), await excludedForIdentity(ctx, identityId))
}

export const previewMyRapor = query({ args: { sessionToken: v.string() }, handler: async (ctx, args) => { const { identity } = await requireTenantSession(ctx, args.sessionToken); const summary = await summaryForIdentity(ctx, identity._id); return { label: "Pratinjau (belum dibagikan)", ...summary, ...(summary.available ? { tierLabel: labelForTier(summary.tier) } : {}) } } })

export const computeRaporForShare = internalQuery({
  args: { identityId: v.id("tenantIdentities") },
  handler: async (ctx, args) => {
    const active = (await ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", args.identityId).eq("purpose", "share_rapor")).take(20)).find((item) => !item.withdrawnAt && item.textVersion === SHARE_CONSENT_VERSION)
    if (!active) throw new Error("Rapor tidak tersedia.")
    return summaryForIdentity(ctx, args.identityId)
  },
})

export const createPaymentDispute = mutation({
  args: { sessionToken: v.string(), periodId: v.string(), reason: v.union(v.literal("sudah_bayar"), v.literal("tanggal_salah"), v.literal("bukan_masa_tinggal_saya"), v.literal("lainnya")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { identity } = await requireTenantSession(ctx, args.sessionToken)
    await touchIdentity(ctx, identity._id)
    const links = await confirmedLinks(ctx, identity._id)
    let tenancy: Doc<"tenants"> | null = null
    let period: PaymentPeriod | null = null
    for (const link of links) { const candidate = await ctx.db.get("tenants", link.tenancyId); const periods = candidate ? await listPaymentPeriodsForTenancy(ctx, candidate._id) : []; const found = periods.find((item) => item.periodId === args.periodId); if (candidate && found) { tenancy = candidate; period = found; break } }
    if (!tenancy || !period || period.dueDate > Date.now()) throw new Error("Catatan periode tidak tersedia.")
    const all = await ctx.db.query("paymentDisputes").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenancy?._id as Id<"tenants">)).take(100)
    if (all.filter((item) => item.status !== "withdrawn").length >= MAX_DISPUTES_PER_TENANCY) throw new Error("Batas keberatan untuk masa tinggal ini sudah tercapai.")
    if (all.some((item) => item.periodId === args.periodId && item.status !== "withdrawn")) throw new Error("Periode ini sudah dipertanyakan.")
    const identityDisputes = await ctx.db.query("paymentDisputes").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)
    if (identityDisputes.filter((item) => item.status === "open").length >= MAX_OPEN_DISPUTES_PER_IDENTITY) throw new Error("Terlalu banyak keberatan yang masih terbuka.")
    const createdAt = Date.now()
    const disputeId = await ctx.db.insert("paymentDisputes", { identityId: identity._id, tenancyId: tenancy._id, periodId: args.periodId, reason: args.reason, note: cleanNote(args.note), status: "open", createdAt })
    if (identityDisputes.filter((item) => item.createdAt >= createdAt - 30 * 86_400_000).length + 1 >= DISPUTE_AUDIT_THRESHOLD) await ctx.db.patch("tenantIdentities", identity._id, { flaggedForAudit: true })
    const property = await ctx.db.get("properties", tenancy.propertyId)
    if (property) { try { await ctx.scheduler.runAfter(0, internal.bots.delivery.sendReminderNotice, { ownerId: property.ownerId, text: `${tenancy.name} di ${property.name} mempertanyakan catatan pembayaran bulan ${formatMonthLabel(new Date(period.dueDate))}. Buka dashboard untuk menanggapi dalam 14 hari.` }) } catch { /* not blocking dispute creation */ } }
    return { disputeId }
  },
})

export const withdrawPaymentDispute = mutation({ args: { sessionToken: v.string(), disputeId: v.id("paymentDisputes") }, handler: async (ctx, args) => { const { identity } = await requireTenantSession(ctx, args.sessionToken); const dispute = await ctx.db.get("paymentDisputes", args.disputeId); if (!dispute || dispute.identityId !== identity._id || dispute.status !== "open") throw new Error("Keberatan tidak tersedia."); await ctx.db.patch("paymentDisputes", dispute._id, { status: "withdrawn", resolvedAt: Date.now() }); return { ok: true } } })
export const listMyDisputes = query({ args: { sessionToken: v.string() }, handler: async (ctx, args) => { const { identity } = await requireTenantSession(ctx, args.sessionToken); return (await ctx.db.query("paymentDisputes").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)).map((item) => ({ disputeId: item._id, tenancyId: item.tenancyId, periodId: item.periodId, reason: item.reason, note: item.note, status: item.status, createdAt: item.createdAt, ownerDecision: item.ownerDecision, ownerNote: item.ownerNote })) } })

export const ownerListDisputes = query({ args: { propertyId: v.id("properties") }, handler: async (ctx, args) => { await requirePropertyOwner(ctx, args.propertyId); const tenants = await ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).take(100); const rows = (await Promise.all(tenants.map(async (tenant) => { const disputes = await ctx.db.query("paymentDisputes").withIndex("by_tenancy", (q) => q.eq("tenancyId", tenant._id)).take(100); return disputes.map((item) => ({ disputeId: item._id, tenantName: tenant.name, periodId: item.periodId, reason: item.reason, note: item.note, status: item.status, createdAt: item.createdAt, daysRemaining: item.status === "open" ? Math.max(0, DISPUTE_RESPONSE_DAYS - Math.floor((Date.now() - item.createdAt) / 86_400_000)) : 0, ownerDecision: item.ownerDecision, ownerNote: item.ownerNote })) }))).flat(); return rows } })

export const ownerRespondToDispute = mutation({ args: { disputeId: v.id("paymentDisputes"), decision: v.union(v.literal("agree"), v.literal("reject")), note: v.optional(v.string()) }, handler: async (ctx, args) => { const dispute = await ctx.db.get("paymentDisputes", args.disputeId); if (!dispute) throw new Error("Keberatan tidak ditemukan."); const tenancy = await ctx.db.get("tenants", dispute.tenancyId); if (!tenancy) throw new Error("Masa tinggal tidak ditemukan."); await requirePropertyOwner(ctx, tenancy.propertyId); if (dispute.status !== "open") throw new Error("Keberatan ini sudah diputuskan."); const now = Date.now(); await ctx.db.patch("paymentDisputes", dispute._id, { status: args.decision === "agree" ? "resolved_for_tenant" : "resolved_for_owner", ownerDecision: args.decision, ownerNote: cleanNote(args.note), ownerRespondedAt: now, resolvedAt: now }); return { ok: true } } })

export const revokeDerivedData = internalMutation({ args: { identityId: v.id("tenantIdentities") }, handler: async (ctx, args) => {
  const shares = await ctx.db.query("raporShares").withIndex("by_identity", (q) => q.eq("identityId", args.identityId)).take(500)
  for (const share of shares) await ctx.db.delete("raporShares", share._id)
  return { revoked: shares.length }
} })

export const listDisputesNeedingAudit = internalQuery({ args: {}, handler: async (ctx) => (await ctx.db.query("tenantIdentities").take(500)).filter((identity) => identity.flaggedForAudit).map((identity) => ({ identityId: identity._id, flaggedForAudit: true })) })

export const runDailyRaporMaintenance = internalMutation({ args: {}, handler: async (ctx) => {
  const now = Date.now(); let lapsed = 0; let deleted = 0; let expiredShares = 0; let deletedShares = 0
  for (const share of await ctx.db.query("raporShares").withIndex("by_status_and_expires", (q) => q.eq("status", "active").lt("expiresAt", now)).take(500)) { await ctx.db.patch("raporShares", share._id, { status: "expired" }); expiredShares += 1 }
  for (const status of ["revoked", "expired", "revealed"] as const) for (const share of await ctx.db.query("raporShares").withIndex("by_status_and_expires", (q) => q.eq("status", status).lt("expiresAt", now - SHARE_ROW_RETENTION_DAYS * 86_400_000)).take(500)) { await ctx.db.delete("raporShares", share._id); deletedShares += 1 }
  for (const dispute of await ctx.db.query("paymentDisputes").withIndex("by_status_and_created", (q) => q.eq("status", "open")).take(500)) if (dispute.createdAt <= now - DISPUTE_RESPONSE_DAYS * 86_400_000) { await ctx.db.patch("paymentDisputes", dispute._id, { status: "lapsed", resolvedAt: now }); lapsed += 1 }
  for (const identity of await ctx.db.query("tenantIdentities").take(500)) if ((identity.lastActiveAt ?? identity.createdAt) <= now - IDENTITY_INACTIVE_DELETE_MONTHS * 30 * 86_400_000) { await ctx.runMutation(internal.tenantRapor.deleteInactiveIdentity, { identityId: identity._id }); deleted += 1 }
  return { lapsed, deleted, expiredShares, deletedShares }
} })

export const deleteInactiveIdentity = internalMutation({ args: { identityId: v.id("tenantIdentities") }, handler: async (ctx, args) => { await ctx.runMutation(internal.tenantRapor.revokeDerivedData, { identityId: args.identityId }); for (const row of await ctx.db.query("tenantSessions").withIndex("by_identity", (q) => q.eq("identityId", args.identityId)).take(100)) await ctx.db.delete("tenantSessions", row._id); for (const row of await ctx.db.query("tenancyIdentityLinks").withIndex("by_identity", (q) => q.eq("identityId", args.identityId)).take(100)) await ctx.db.delete("tenancyIdentityLinks", row._id); for (const row of await ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", args.identityId).eq("purpose", "share_rapor")).take(100)) await ctx.db.delete("tenantConsents", row._id); for (const row of await ctx.db.query("paymentDisputes").withIndex("by_identity", (q) => q.eq("identityId", args.identityId)).take(100)) await ctx.db.delete("paymentDisputes", row._id); for (const row of await ctx.db.query("verificationChallenges").take(500)) if (row.identityId === args.identityId) await ctx.db.delete("verificationChallenges", row._id); const identity = await ctx.db.get("tenantIdentities", args.identityId); if (identity) await ctx.db.delete("tenantIdentities", args.identityId); return { deleted: Boolean(identity) } } })
