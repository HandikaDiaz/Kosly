import { internalMutation } from "../_generated/server"
import type { MutationCtx } from "../_generated/server"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import { normalizeChatId } from "../botLinks"
import { approveSubscriptionForAdmin, rejectSubscriptionForAdmin } from "../admin"
import { reviewIdentityForAdmin, reviewPropertyForAdmin } from "../verifications"
import { updateStatusForAdmin } from "../reports"
import { getTierForRoomCount, getTierPrice, tierRank, type BillingCycle, type SubscriptionTier } from "../lib/subscription_tiers"
import { confirmPaymentForOwner, rejectPaymentForOwner } from "../payments"
import { createPaymentReference, createQueueReference, parseBotCommand } from "./commands"
import { parseQueryCommand } from "./queries"

const channelValidator = v.union(v.literal("telegram"), v.literal("whatsapp"))
const decisionValidator = v.union(v.literal("approve"), v.literal("reject"))
const response = (channel: "telegram" | "whatsapp", chatId: string, text: string) => ({ status: "response" as const, channel, chatId, text })
const dateText = (value?: number) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "belum ditentukan"

export const processEvent = internalMutation({
  args: { channel: channelValidator, eventId: v.string(), chatId: v.string(), text: v.optional(v.string()), callbackAction: v.optional(v.union(v.literal("confirm"), v.literal("reject"))), callbackReference: v.optional(v.string()), callbackQueryId: v.optional(v.string()), photoFileId: v.optional(v.string()), photoMediaId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db.query("notification_log").withIndex("by_provider_event", (q) => q.eq("providerEventId", args.eventId)).unique()
    if (duplicate) return { status: "duplicate" as const }
    const chatId = normalizeChatId(args.channel, args.chatId)
    const link = (await ctx.db.query("bot_links").withIndex("by_channel_and_chat_id", (q) => q.eq("channel", args.channel).eq("chatId", chatId)).take(10)).find((item) => item.status === "active")
    if (!link) return { status: "invalid" as const }
    await ctx.db.patch("bot_links", link._id, { lastSeenAt: Date.now() })
    const actor = await ctx.db.get("owners", link.ownerId)
    if (!actor) return { status: "invalid" as const }

    const session = (await ctx.db.query("bot_sessions").withIndex("by_chat", (q) => q.eq("channel", args.channel).eq("chatId", chatId).eq("status", "active")).take(5)).find((item) => item.expiresAt > Date.now())
    if (args.photoFileId || args.photoMediaId) {
      if (actor.role === "owner" && session?.kind === "upgrade_payment") return { status: "photo" as const, channel: args.channel, chatId, ownerId: link.ownerId, sessionId: session._id, photoFileId: args.photoFileId, photoMediaId: args.photoMediaId }
      return { status: "invalid" as const }
    }

    const parsed = args.callbackAction && args.callbackReference ? { kind: args.callbackAction, reference: args.callbackReference, reason: "Ditolak melalui bot Telegram." } : parseBotCommand(args.text ?? "")
    const isAdminCommand = parsed.kind === "pending" || parsed.kind === "summary" || parsed.kind === "admin_decision" || (parsed.kind === "yes" && session?.kind === "admin_confirmation")
    if (actor.role === "admin" && isAdminCommand) {
      if (parsed.kind === "pending") {
        const owners = await ctx.db.query("owners").take(100)
        const ownerName = new Map(owners.map((item) => [String(item._id), item.name ?? item.email ?? "Owner"]))
        const identity = owners.filter((item) => item.identityVerificationStatus === "pending_review").map((item) => `${createQueueReference("VERIFY", String(item._id))} (${ownerName.get(String(item._id))})`)
        const properties = await ctx.db.query("properties").take(100)
        const propertyItems = properties.filter((item) => item.propertyVerificationStatus === "pending_review").map((item) => `${createQueueReference("VERIFY", String(item._id))} (${item.name})`)
        const subscriptions = await ctx.db.query("subscriptions").withIndex("by_status", (q) => q.eq("status", "pending_payment")).take(100)
        const billing = subscriptions.map((item) => `${createQueueReference("BILL", String(item._id))} (${item.tier})`)
        const reports = await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).take(100)
        const reportItems = reports.map((item) => `${createQueueReference("REPORT", String(item._id))}`)
        return response(args.channel, chatId, `📥 <b>Antrean admin</b>\n\nVerifikasi (${identity.length + propertyItems.length}): ${[...identity, ...propertyItems].join(", ") || "-"}\nPembayaran (${billing.length}): ${billing.join(", ") || "-"}\nLaporan (${reportItems.length}): ${reportItems.join(", ") || "-"}\n\nGunakan /approve ID atau /reject ID.`)
      }
      if (parsed.kind === "summary") {
        const subscriptions = await ctx.db.query("subscriptions").take(100)
        const counts = subscriptions.reduce<Record<string, number>>((result, item) => { result[item.tier] = (result[item.tier] ?? 0) + 1; return result }, {})
        const mrr = subscriptions.filter((item) => item.status === "active" && item.tier !== "free").reduce((sum, item) => sum + (item.billingCycle === "annual" ? item.priceAmount / 12 : item.priceAmount), 0)
        return response(args.channel, chatId, `📊 Ringkasan admin\n\nMRR: Rp ${Math.round(mrr).toLocaleString("id-ID")}\nStarter: ${counts.starter ?? 0}\nGrowth: ${counts.growth ?? 0}\nPro: ${counts.pro ?? 0}\nPast due: ${subscriptions.filter((item) => item.status === "past_due").length}`)
      }
      if (parsed.kind === "admin_decision") {
        const target = await resolveAdminTarget(ctx, parsed.reference)
        if (!target) return { status: "invalid" as const }
        if (session) await ctx.db.patch("bot_sessions", session._id, { status: "expired" })
        await ctx.db.insert("bot_sessions", { channel: args.channel, chatId, ownerId: link.ownerId, kind: "admin_confirmation", status: "active", targetType: target.type, targetId: target.id, decision: parsed.decision, createdAt: Date.now(), expiresAt: Date.now() + 5 * 60 * 1000 })
        return response(args.channel, chatId, `⚠️ Konfirmasi diperlukan\n\nJenis: ${target.label}\nDetail: ${target.detail}\nID: ${parsed.reference}\n\nKetik YA untuk ${parsed.decision === "approve" ? "menyetujui" : "menolak"}, atau abaikan pesan ini untuk membatalkan.`)
      }
      if (parsed.kind === "yes" && session?.kind === "admin_confirmation" && session.targetType && session.targetId && session.decision) {
        const targetId = session.targetId
        if (session.targetType === "subscription") session.decision === "approve" ? await approveSubscriptionForAdmin(ctx, link.ownerId, targetId as Id<"subscriptions">) : await rejectSubscriptionForAdmin(ctx, link.ownerId, targetId as Id<"subscriptions">, "Ditolak melalui bot admin.")
        if (session.targetType === "verification_identity") await reviewIdentityForAdmin(ctx, link.ownerId, { ownerId: targetId as Id<"owners">, decision: session.decision === "approve" ? "approved" : "rejected", reason: session.decision === "reject" ? "Ditolak melalui bot admin." : undefined })
        if (session.targetType === "verification_property") await reviewPropertyForAdmin(ctx, link.ownerId, { propertyId: targetId as Id<"properties">, decision: session.decision === "approve" ? "approved" : "rejected", reason: session.decision === "reject" ? "Ditolak melalui bot admin." : undefined })
        if (session.targetType === "report") await updateStatusForAdmin(ctx, link.ownerId, { reportId: targetId as Id<"reports">, status: session.decision === "approve" ? "reviewed" : "resolved" })
        await ctx.db.patch("bot_sessions", session._id, { status: "completed" })
        return response(args.channel, chatId, "✅ Keputusan admin sudah diterapkan.")
      }
      return { status: "invalid" as const }
    }

    const query = parseQueryCommand(args.text ?? "")
    if (query === "status" || query === "unpaid" || query === "vacant") return { status: "query" as const, query, ownerId: link.ownerId, channel: args.channel, chatId }
    if (parsed.kind === "subscription") {
      const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).unique()
      const rooms = subscription?.roomCountAtLastCheck ?? 0
      const tier = subscription?.tier ?? "free"
      const recommended = getTierForRoomCount(rooms)
      return response(args.channel, chatId, `📦 Langganan BotKos\n\nTier aktif: ${tier}\nJumlah kamar: ${rooms}\nJatuh tempo: ${dateText(subscription?.currentPeriodEnd)}\nStatus: ${subscription?.status ?? "active"}${tierRank[recommended] > tierRank[tier] ? `\n\n⚠️ Tier yang disarankan: ${recommended}\nGunakan /upgrade untuk melihat pilihan.` : ""}`)
    }
    if (parsed.kind === "upgrade") {
      const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).unique()
      const activeTier = subscription?.tier ?? "free"
      const tiers = (["starter", "growth", "pro"] as const).filter((tier) => tierRank[tier] > tierRank[activeTier])
      if (!tiers.length) return response(args.channel, chatId, "Anda sudah berada di tier tertinggi. Tidak ada pilihan upgrade.")
      if (session) await ctx.db.patch("bot_sessions", session._id, { status: "expired" })
      await ctx.db.insert("bot_sessions", { channel: args.channel, chatId, ownerId: link.ownerId, kind: "upgrade_selection", status: "active", createdAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000 })
      return response(args.channel, chatId, `⬆️ Pilih tier upgrade (balas nama tier + siklus):\n\n${tiers.map((tier, index) => `${index + 1}. ${tier} — Rp ${getTierPrice(tier, "monthly").toLocaleString("id-ID")}/bulan atau Rp ${getTierPrice(tier, "annual").toLocaleString("id-ID")}/tahun`).join("\n")}\n\nContoh: GROWTH MONTHLY`)
    }
    if (parsed.kind === "selection" && session?.kind === "upgrade_selection") {
      const [selection, cycle = "MONTHLY"] = parsed.value.split(" ")
      const tierMap = { "1": "starter", "2": "growth", "3": "pro", STARTER: "starter", GROWTH: "growth", PRO: "pro" } as const
      const tier = tierMap[selection as keyof typeof tierMap]
      const billingCycle: BillingCycle = cycle === "ANNUAL" || cycle === "TAHUNAN" ? "annual" : "monthly"
      if (!tier) return response(args.channel, chatId, "Pilihan tier tidak dikenali. Balas STARTER, GROWTH, atau PRO + MONTHLY/ANNUAL.")
      await ctx.db.patch("bot_sessions", session._id, { kind: "upgrade_payment", selectedTier: tier, selectedBillingCycle: billingCycle })
      return response(args.channel, chatId, `✅ Pilihan ${tier} ${billingCycle} dicatat.\n\nTransfer manual ke rekening/QRIS admin sebesar Rp ${getTierPrice(tier, billingCycle).toLocaleString("id-ID")}, lalu upload foto bukti transfer di chat ini. Pengajuan akan menunggu review admin.`)
    }
    if (parsed.kind === "confirm" || parsed.kind === "reject") {
      const allPayments = await ctx.db.query("payments").take(500)
      const payment = allPayments.find((candidate) => createPaymentReference(String(candidate._id)) === parsed.reference)
      if (!payment || payment.status !== "pending_review") return { status: "invalid" as const }
      if (parsed.kind === "confirm") await confirmPaymentForOwner(ctx, payment._id, link.ownerId)
      else await rejectPaymentForOwner(ctx, payment._id, link.ownerId, parsed.reason ?? "Ditolak melalui bot.")
      return response(args.channel, chatId, parsed.kind === "confirm" ? "Pembayaran dikonfirmasi." : "Pembayaran ditolak.")
    }
    return { status: "invalid" as const }
  },
})

const resolveAdminTarget = async (ctx: MutationCtx, reference: string): Promise<{ type: "verification_identity" | "verification_property" | "subscription" | "report"; id: string; label: string; detail: string } | null> => {
  const owners = await ctx.db.query("owners").take(100)
  const owner = owners.find((item: { _id: Id<"owners">; identityVerificationStatus?: string }) => createQueueReference("VERIFY", String(item._id)) === reference && item.identityVerificationStatus === "pending_review")
  if (owner) return { type: "verification_identity", id: String(owner._id), label: "Verifikasi identitas", detail: owner.name ?? owner.email ?? "Owner" }
  const properties = await ctx.db.query("properties").take(100)
  const property = properties.find((item: { _id: Id<"properties">; propertyVerificationStatus?: string; name: string }) => createQueueReference("VERIFY", String(item._id)) === reference && item.propertyVerificationStatus === "pending_review")
  if (property) return { type: "verification_property", id: String(property._id), label: "Verifikasi properti", detail: property.name }
  const subscriptions = await ctx.db.query("subscriptions").withIndex("by_status", (q) => q.eq("status", "pending_payment")).take(100)
  const subscription = subscriptions.find((item: { _id: Id<"subscriptions">; tier: string }) => createQueueReference("BILL", String(item._id)) === reference)
  if (subscription) return { type: "subscription", id: String(subscription._id), label: "Pembayaran langganan", detail: `Tier ${subscription.tier}` }
  const reports = await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).take(100)
  const report = reports.find((item: { _id: Id<"reports">; description: string }) => createQueueReference("REPORT", String(item._id)) === reference)
  if (report) return { type: "report", id: String(report._id), label: "Laporan", detail: report.description.slice(0, 120) }
  return null
}
