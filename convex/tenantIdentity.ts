import { env, internalMutation, mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { generateToken, hashToken } from "./lib/reviewRules"
import { CHALLENGE_TTL_MIN, CONFIRM_TTL_MIN, IDENTITY_NOTICE_VERSION, MAX_CHALLENGES_PER_HOUR_GLOBAL, MAX_FAILED_CODE_ATTEMPTS_PER_SENDER_PER_HOUR, SESSION_TTL_DAYS, generateVerificationCode, normalizeIndonesianPhone, parseVerificationCode, transitionChallenge, type ChallengeStatus } from "./lib/tenantIdentity"
import { assertRaporEnabled } from "./lib/raporGate"
import { isTenantDataVerified } from "./lib/tenantImport"

const GENERIC_STATUS = "Kode tidak valid atau sudah tidak berlaku."
const TELEGRAM_SHARE_CONTACT_PROMPT = "📱 *Verifikasi Identitas — BotKos*\n\nKode verifikasi valid! Untuk menghubungkan data sewa dan Rapor Penghunimu, kami memerlukan verifikasi nomor telepon akun Telegram ini.\n\nSilakan tekan tombol *📱 Bagikan Nomor Telepon* di bawah untuk melanjutkan."
const CONFIRMATION_WA = "🔒 *Konfirmasi Keamanan — Rapor Penghuni BotKos*\n\nSeseorang meminta menghubungkan nomor ini ke *Rapor Penghuni BotKos*.\n\nMohon pastikan keamanan akunmu:\n• Balas *YA* — Hanya jika *KAMU sendiri* yang membuka halaman verifikasi barusan.\n• Balas *TIDAK* — Jika ada orang lain yang menyuruhmu mengirim kode ini atau kamu tidak mengenali permintaan ini.\n\n⏱ *Berlaku 5 menit.*\n_Pesan otomatis sistem BotKos. Jangan bagikan pesan ini kepada siapa pun._"
const CONFIRMATION_TG = "🔒 *Konfirmasi Keamanan — Rapor Penghuni BotKos*\n\nNomor teleponmu berhasil diverifikasi. Seseorang meminta menghubungkan nomor ini ke *Rapor Penghuni BotKos*.\n\nMohon pastikan keamanan akunmu:\n• Balas *YA* (atau tekan tombol di bawah) — Hanya jika *KAMU sendiri* yang membuka halaman verifikasi barusan.\n• Balas *TIDAK* — Jika ada orang lain yang menyuruhmu mengirim kode ini atau kamu tidak mengenali permintaan ini.\n\n⏱ *Berlaku 5 menit.*\n_Pesan otomatis sistem BotKos. Jangan bagikan pesan ini kepada siapa pun._"
const envValues = env as typeof env & Record<string, string | undefined>

const senderHash = (senderKey: string) => hashToken(`sender:${senderKey}`)
const sessionFromToken = async (ctx: QueryCtx | MutationCtx, token: string) => {
  assertRaporEnabled(envValues.RAPOR_ENABLED)
  const tokenHash = await hashToken(token)
  const session = await ctx.db.query("tenantSessions").withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash)).unique()
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) throw new Error("Sesi penghuni tidak valid atau sudah berakhir.")
  const identity = await ctx.db.get("tenantIdentities", session.identityId)
  if (!identity || identity.status !== "active") throw new Error("Identitas penghuni tidak tersedia.")
  return { session, identity }
}

export const requireTenantSession = sessionFromToken

const botLinks = (code: string) => {
  const telegramBot = envValues.TELEGRAM_BOT_USERNAME || "kosly_admin_bot"
  const whatsappBot = envValues.WHATSAPP_BOT_NUMBER || "6289674745742"
  const links: { telegram?: string; whatsapp?: string } = {
    telegram: `https://t.me/${telegramBot.replace(/^@/, "")}?start=verify_${code}`,
    whatsapp: `https://wa.me/${whatsappBot.replace(/\D/g, "")}?text=${encodeURIComponent(code)}`,
  }
  return links
}

export const startVerification = mutation({
  args: { noticeAccepted: v.boolean() },
  handler: async (ctx, args) => {
    assertRaporEnabled(envValues.RAPOR_ENABLED)
    if (!args.noticeAccepted) throw new Error("Persetujuan pemberitahuan wajib dipilih.")
    const now = Date.now()
    const recent = await ctx.db.query("verificationChallenges").withIndex("by_created", (q) => q.gte("createdAt", now - 60 * 60 * 1000)).take(MAX_CHALLENGES_PER_HOUR_GLOBAL + 1)
    if (recent.length >= MAX_CHALLENGES_PER_HOUR_GLOBAL) throw new Error("Terlalu banyak permintaan. Coba lagi nanti.")
    const code = generateVerificationCode()
    const pollSecret = generateToken()
    const challengeId = await ctx.db.insert("verificationChallenges", { codeHash: await hashToken(code), pollSecretHash: await hashToken(pollSecret), createdAt: now, expiresAt: now + CHALLENGE_TTL_MIN * 60 * 1000, status: "awaiting_message" })
    return { challengeId, code, pollSecret, expiresAt: now + CHALLENGE_TTL_MIN * 60 * 1000, botLinks: botLinks(code) }
  },
})

export const getChallengeStatus = query({
  args: { challengeId: v.id("verificationChallenges"), pollSecret: v.string() },
  handler: async (ctx, args) => {
    assertRaporEnabled(envValues.RAPOR_ENABLED)
    const challenge = await ctx.db.get("verificationChallenges", args.challengeId)
    if (!challenge || await hashToken(args.pollSecret) !== challenge.pollSecretHash) return null
    const status: ChallengeStatus = challenge.expiresAt <= Date.now() && challenge.status === "awaiting_message" ? "expired" : challenge.status
    return { status, expiresAt: challenge.expiresAt, remainingMs: Math.max(0, challenge.expiresAt - Date.now()) }
  },
})

const registerFailedAttempt = async (ctx: MutationCtx, senderKey: string, now: number) => {
  const keyHash = await senderHash(senderKey)
  const attempt = await ctx.db.query("senderAttempts").withIndex("by_sender_and_window", (q) => q.eq("senderKeyHash", keyHash)).take(10)
  const current = attempt.find((item) => now - item.windowStart < 60 * 60 * 1000)
  if (current) {
    if (current.failedCount >= MAX_FAILED_CODE_ATTEMPTS_PER_SENDER_PER_HOUR) return false
    await ctx.db.patch("senderAttempts", current._id, { failedCount: current.failedCount + 1 })
  } else await ctx.db.insert("senderAttempts", { senderKeyHash: keyHash, windowStart: now, failedCount: 1 })
  return true
}

type VerificationChallenge = Doc<"verificationChallenges">

const confirmInContext = async (ctx: MutationCtx, challenge: VerificationChallenge | undefined, channel: "whatsapp" | "telegram", senderKey: string, decision: "confirm" | "cancel") => {
  if (!challenge || challenge.status !== "awaiting_confirmation" || challenge.senderKey !== await senderHash(senderKey) || !challenge.confirmExpiresAt || challenge.confirmExpiresAt <= Date.now()) throw new Error(GENERIC_STATUS)
  if (decision === "cancel") {
    await ctx.db.patch("verificationChallenges", challenge._id, { status: "cancelled" })
    return { handled: true, text: "❌ *Verifikasi Dibatalkan*\n\nPermintaan penghubungan nomor telah dibatalkan. Jika Anda tidak merasa meminta ini, nomor Anda tetap aman.", clearKeyboard: true }
  }
  const phone = challenge.pendingPhoneE164
  if (!phone) throw new Error(GENERIC_STATUS)
  const existing = await ctx.db.query("tenantIdentities").withIndex("by_phone", (q) => q.eq("phoneE164", phone)).unique()
  const identityId = existing?._id ?? await ctx.db.insert("tenantIdentities", { phoneE164: phone, verifiedVia: channel, createdAt: Date.now(), lastVerifiedAt: Date.now(), noticeAcceptedAt: Date.now(), noticeVersion: IDENTITY_NOTICE_VERSION, status: "active" })
  if (existing) await ctx.db.patch("tenantIdentities", existing._id, { verifiedVia: channel, lastVerifiedAt: Date.now(), noticeAcceptedAt: Date.now(), noticeVersion: IDENTITY_NOTICE_VERSION, status: "active" })
  const tenants = await ctx.db.query("tenants").withIndex("by_tenant_phone_normalized", (q) => q.eq("tenantPhoneNormalized", phone)).take(100)
  for (const tenant of tenants) {
    if (!isTenantDataVerified(tenant)) continue
    const prior = await ctx.db.query("tenancyIdentityLinks").withIndex("by_identity", (q) => q.eq("identityId", identityId)).take(100)
    if (!prior.some((link) => link.tenancyId === tenant._id)) await ctx.db.insert("tenancyIdentityLinks", { identityId, tenancyId: tenant._id, status: "pending", createdAt: Date.now() })
  }
  await ctx.db.patch("verificationChallenges", challenge._id, { status: "verified", identityId })
  const keyHash = await senderHash(senderKey)
  const existingKey = (await ctx.db.query("identityChannelKeys").withIndex("by_channel_and_key", (q) => q.eq("channel", channel).eq("senderKeyHash", keyHash)).take(5)).find((item) => item.identityId === identityId)
  if (!existingKey) await ctx.db.insert("identityChannelKeys", { identityId, channel, senderKeyHash: keyHash, createdAt: Date.now() })
  return { handled: true, text: "✅ *Nomor Berhasil Terhubung!*\n\nNomor terhubung ke Portal Penghuni. Silakan kembali ke browser untuk mengakses Rapor Penghuni Anda.", clearKeyboard: true }
}

export const receiveVerificationCode = internalMutation({
  args: { channel: v.union(v.literal("whatsapp"), v.literal("telegram")), rawText: v.string(), senderKey: v.string(), senderPhone: v.optional(v.string()), contactPhone: v.optional(v.string()), contactUserId: v.optional(v.string()), fromUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    assertRaporEnabled(envValues.RAPOR_ENABLED)
    const now = Date.now()
    const senderKeyDigest = await senderHash(args.senderKey)

    // ── Handle YA/TIDAK replies to an awaiting_confirmation challenge ──
    const decision = args.rawText.trim().replace(/^\//, "").toUpperCase()
    const awaitingConfirm = (await ctx.db.query("verificationChallenges").withIndex("by_created", (q) => q.gte("createdAt", now - 60 * 60 * 1000)).take(300)).find((item) => item.status === "awaiting_confirmation" && item.senderKey === senderKeyDigest)
    if (awaitingConfirm && (decision === "YA" || decision === "TIDAK")) return confirmInContext(ctx, awaitingConfirm, args.channel, args.senderKey, decision === "YA" ? "confirm" : "cancel")

    // ── Telegram: handle contact share for an awaiting_contact challenge ──
    if (args.channel === "telegram" && args.contactPhone && args.contactUserId && args.fromUserId && args.contactUserId === args.fromUserId) {
      const awaitingContact = (await ctx.db.query("verificationChallenges").withIndex("by_created", (q) => q.gte("createdAt", now - 60 * 60 * 1000)).take(300)).find((item) => item.status === "awaiting_contact" && item.senderKey === senderKeyDigest)
      if (awaitingContact && awaitingContact.expiresAt > now) {
        const phone = normalizeIndonesianPhone(args.contactPhone)
        if (!phone) return { handled: true, text: "⚠️ Nomor telepon tidak valid. Pastikan nomor telepon adalah nomor Indonesia yang aktif." }
        await ctx.db.patch("verificationChallenges", awaitingContact._id, { status: "awaiting_confirmation" as const, pendingPhoneE164: phone, confirmExpiresAt: now + CONFIRM_TTL_MIN * 60 * 1000 })
        return { handled: true, text: CONFIRMATION_TG, requestConfirm: true }
      }
    }

    // ── Extract and validate verification code (supports /start verify_BK-..., /start BK-..., verify_BK-..., or raw BK-...) ──
    const codeMatch = /(?:verify[_\s-]*|\/start\s+(?:verify[_\s-]*)?)?(BK[-\s]*[A-Z0-9]+)/i.exec(args.rawText)
    const codeText = codeMatch?.[1] ?? args.rawText
    const code = parseVerificationCode(codeText)
    if (!code) return { handled: false }
    const codeHash = await hashToken(code)
    const challenge = (await ctx.db.query("verificationChallenges").withIndex("by_code_hash", (q) => q.eq("codeHash", codeHash)).take(5)).find((item) => item.status === "awaiting_message" || (item.status === "awaiting_contact" && item.senderKey === senderKeyDigest))
    if (!challenge || challenge.expiresAt <= now) {
      if (!(await registerFailedAttempt(ctx, args.senderKey, now))) return { handled: true, text: GENERIC_STATUS }
      return { handled: true, text: GENERIC_STATUS }
    }

    // ── If already in awaiting_contact on Telegram, re-prompt to share contact ──
    if (challenge.status === "awaiting_contact" && args.channel === "telegram") {
      return { handled: true, text: TELEGRAM_SHARE_CONTACT_PROMPT, requestContact: true }
    }

    // ── Resolve phone number ──
    let phone: string | null = null
    if (args.channel === "whatsapp") {
      phone = normalizeIndonesianPhone(args.senderPhone ?? args.senderKey)
    } else if (args.channel === "telegram" && args.contactUserId && args.fromUserId && args.contactUserId === args.fromUserId) {
      phone = normalizeIndonesianPhone(args.contactPhone ?? "")
    }

    // ── Telegram: code received but no contact yet → ask for contact share ──
    if (!phone && args.channel === "telegram") {
      await ctx.db.patch("verificationChallenges", challenge._id, { status: "awaiting_contact" as const, channel: args.channel, senderKey: senderKeyDigest })
      return { handled: true, text: TELEGRAM_SHARE_CONTACT_PROMPT, requestContact: true }
    }

    if (!phone) return { handled: true, text: "Nomor telepon tidak dapat dikenali. Coba lagi." }

    // ── WhatsApp: phone already known → go straight to confirmation ──
    await ctx.db.patch("verificationChallenges", challenge._id, { status: transitionChallenge("awaiting_message", "message_received"), channel: args.channel, senderKey: senderKeyDigest, pendingPhoneE164: phone, confirmExpiresAt: now + CONFIRM_TTL_MIN * 60 * 1000 })
    return { handled: true, text: CONFIRMATION_WA, requestConfirm: true }
  },
})

export const confirmVerification = internalMutation({
  args: { channel: v.union(v.literal("whatsapp"), v.literal("telegram")), senderKey: v.string(), decision: v.union(v.literal("confirm"), v.literal("cancel")) },
  handler: async (ctx, args) => {
    assertRaporEnabled(envValues.RAPOR_ENABLED)
    const digest = await senderHash(args.senderKey)
    const challenge = (await ctx.db.query("verificationChallenges").withIndex("by_created", (q) => q.gte("createdAt", Date.now() - CONFIRM_TTL_MIN * 60 * 1000)).take(300)).find((item) => item.status === "awaiting_confirmation" && item.senderKey === digest)
    return confirmInContext(ctx, challenge, args.channel, args.senderKey, args.decision)
  },
})

export const claimVerifiedSession = mutation({
  args: { challengeId: v.id("verificationChallenges"), pollSecret: v.string() },
  handler: async (ctx, args) => {
    assertRaporEnabled(envValues.RAPOR_ENABLED)
    const challenge = await ctx.db.get("verificationChallenges", args.challengeId)
    if (!challenge || challenge.status !== "verified" || challenge.claimedAt || await hashToken(args.pollSecret) !== challenge.pollSecretHash || !challenge.identityId) throw new Error(GENERIC_STATUS)
    const token = generateToken()
    const now = Date.now()
    await ctx.db.insert("tenantSessions", { identityId: challenge.identityId, tokenHash: await hashToken(token), createdAt: now, expiresAt: now + SESSION_TTL_DAYS * 86_400_000 })
    await ctx.db.patch("verificationChallenges", challenge._id, { claimedAt: now })
    return { token, expiresAt: now + SESSION_TTL_DAYS * 86_400_000 }
  },
})

export const getMyTenantIdentity = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await sessionFromToken(ctx, args.sessionToken)
    return { status: identity.status, maskedPhone: `${identity.phoneE164.slice(0, 6)}•• •••• ${identity.phoneE164.slice(-4)}` }
  },
})

export const listMyTenancyCandidates = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await sessionFromToken(ctx, args.sessionToken)
    const links = await ctx.db.query("tenancyIdentityLinks").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)
    return (await Promise.all(links.filter((link) => link.status === "pending" || link.status === "confirmed").map(async (link) => {
      const tenant = await ctx.db.get("tenants", link.tenancyId)
      const property = tenant ? await ctx.db.get("properties", tenant.propertyId) : null
      if (!tenant || !property) return null
      const start = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(new Date(tenant.startedAt))
      const end = tenant.move_out_date ? new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(new Date(tenant.move_out_date)) : "sekarang"
      return { linkId: link._id, propertyName: property.name, period: `${start} - ${end}`, status: link.status }
    }))).filter((item): item is NonNullable<typeof item> => item !== null)
  },
})

export const decideTenancyLink = mutation({
  args: { sessionToken: v.string(), linkId: v.id("tenancyIdentityLinks"), decision: v.union(v.literal("confirm"), v.literal("reject")) },
  handler: async (ctx, args) => {
    const { identity } = await sessionFromToken(ctx, args.sessionToken)
    const link = await ctx.db.get("tenancyIdentityLinks", args.linkId)
    if (!link || link.identityId !== identity._id || (link.status !== "pending" && args.decision === "confirm")) throw new Error("Catatan masa tinggal tidak tersedia.")
    await ctx.db.patch("tenancyIdentityLinks", link._id, { status: args.decision === "confirm" ? "confirmed" : "rejected", decidedAt: Date.now() })
    return { ok: true }
  },
})

export const logoutTenant = mutation({ args: { sessionToken: v.string() }, handler: async (ctx, args) => { const { session } = await sessionFromToken(ctx, args.sessionToken); await ctx.db.patch("tenantSessions", session._id, { revokedAt: Date.now() }); return { ok: true } } })
export const logoutEverywhere = mutation({ args: { sessionToken: v.string() }, handler: async (ctx, args) => { const { identity } = await sessionFromToken(ctx, args.sessionToken); for (const session of await ctx.db.query("tenantSessions").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)) await ctx.db.patch("tenantSessions", session._id, { revokedAt: Date.now() }); return { ok: true } } })
export const deleteMyTenantIdentity = mutation({ args: { sessionToken: v.string() }, handler: async (ctx, args) => {
  const { identity } = await sessionFromToken(ctx, args.sessionToken)
  await ctx.runMutation(internal.tenantRapor.revokeDerivedData, { identityId: identity._id })
  for (const session of await ctx.db.query("tenantSessions").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)) await ctx.db.delete("tenantSessions", session._id)
  for (const link of await ctx.db.query("tenancyIdentityLinks").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)) await ctx.db.delete("tenancyIdentityLinks", link._id)
  for (const consent of await ctx.db.query("tenantConsents").withIndex("by_identity_and_purpose", (q) => q.eq("identityId", identity._id).eq("purpose", "share_rapor")).take(100)) await ctx.db.delete("tenantConsents", consent._id)
  for (const dispute of await ctx.db.query("paymentDisputes").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)) await ctx.db.delete("paymentDisputes", dispute._id)
  for (const challenge of await ctx.db.query("verificationChallenges").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(500)) await ctx.db.delete("verificationChallenges", challenge._id)
  for (const key of await ctx.db.query("identityChannelKeys").withIndex("by_identity", (q) => q.eq("identityId", identity._id)).take(100)) await ctx.db.delete("identityChannelKeys", key._id)
  await ctx.db.delete("tenantIdentities", identity._id)
  return { ok: true }
} })

export const backfillTenantPhoneNormalized = internalMutation({
  args: { cursor: v.optional(v.id("tenants")), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("tenants").order("asc").take(5000)
    const start = args.cursor ? Math.max(0, page.findIndex((tenant) => tenant._id === args.cursor) + 1) : 0
    const selected = page.slice(start, start + Math.min(100, Math.max(1, args.batchSize ?? 50)))
    for (const tenant of selected) { const normalized = normalizeIndonesianPhone(tenant.phone); if (normalized && tenant.tenantPhoneNormalized !== normalized) await ctx.db.patch("tenants", tenant._id, { tenantPhoneNormalized: normalized }) }
    const hasMore = start + selected.length < page.length
    return { processed: selected.length, nextCursor: hasMore ? selected.at(-1)?._id ?? null : null }
  },
})

export const cleanupTenantIdentityData = internalMutation({ args: {}, handler: async (ctx) => { const now = Date.now(); let removed = 0; for (const challenge of await ctx.db.query("verificationChallenges").withIndex("by_created", (q) => q.lt("createdAt", now - 86_400_000)).take(500)) { await ctx.db.delete("verificationChallenges", challenge._id); removed += 1 }; for (const attempt of await ctx.db.query("senderAttempts").withIndex("by_window", (q) => q.lt("windowStart", now - 86_400_000)).take(500)) await ctx.db.delete("senderAttempts", attempt._id); return { removed } } })
