import { env, internalMutation } from "../_generated/server"
import { internal } from "../_generated/api"
import type { MutationCtx } from "../_generated/server"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import { normalizeChatId } from "../botLinks"
import { approveSubscriptionForAdmin, rejectSubscriptionForAdmin } from "../admin"
import { reviewIdentityForAdmin, reviewPropertyForAdmin } from "../verifications"
import { updateStatusForAdmin } from "../reports"
import { getTierForRoomCount, getTierPrice, tierRank, type BillingCycle } from "../lib/subscription_tiers"
import { getEffectiveTier, getRoomCountForOwner } from "../subscriptions"
import { createRoomForOwnerInContext, updateRoomForOwnerInContext } from "../rooms"
import { confirmPaymentForOwner, rejectPaymentForOwner } from "../payments"
import { createPaymentReference, createQueueReference, parseBotCommand } from "./commands"
import { parseQueryCommand } from "./queries"
import { buildTelegramCancelMarkup, buildTelegramUpgradeMessage } from "./telegram"
import { parseRoomWizardInput } from "./roomWizard"
import { finalizeAddRoomInContext, type RoomWizardData } from "./roomFlow"
import { propertyTabUrl } from "../lib/propertyTabs"
import { buildChatIdMessage, buildHelpMessage, buildUnknownCommandMessage, buildWelcomeMessage, commandForChannel } from "./help"
import { isRaporEnabled } from "../lib/raporGate"

const channelValidator = v.union(v.literal("telegram"), v.literal("whatsapp"))
const decisionValidator = v.union(v.literal("approve"), v.literal("reject"))
const response = (
  channel: "telegram" | "whatsapp",
  chatId: string,
  text: string,
  replyMarkup?:
    | { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }
    | { keyboard: Array<Array<{ text: string; request_location?: boolean; request_contact?: boolean }>>; resize_keyboard?: boolean; one_time_keyboard?: boolean }
    | { remove_keyboard: boolean }
) => ({ status: "response" as const, channel, chatId, text, ...(replyMarkup ? { replyMarkup } : {}) })
type ProcessResult =
  | { status: "duplicate" | "invalid" | "silent" }
  | ReturnType<typeof response>
  | { status: "query"; query: "status" | "unpaid" | "vacant"; ownerId: Id<"owners">; channel: "telegram" | "whatsapp"; chatId: string }
  | { status: "photo"; channel: "telegram" | "whatsapp"; chatId: string; ownerId: Id<"owners">; sessionId: Id<"bot_sessions">; photoFileId?: string; photoMediaId?: string }
  | { status: "room_photo"; channel: "telegram" | "whatsapp"; chatId: string; ownerId: Id<"owners">; stateId: Id<"bot_conversation_state">; photoFileId?: string; photoMediaId?: string }
  | { status: "search"; kind: "cari" | "detail" | "deep_link"; channel: "telegram" | "whatsapp"; chatId: string; senderKey: string; text: string; arg?: string; location?: { latitude: number; longitude: number } }
  | { status: "tenant_payment_receipt"; channel: "whatsapp"; chatId: string; text: string; imageUrl?: string }
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const displayValue = (channel: "telegram" | "whatsapp", value: string) => channel === "telegram" ? escapeHtml(value) : value
const dateText = (value?: number) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "belum ditentukan"
const roomFeatureGateText = "Fitur khusus Growth dan Pro\n\nTambah dan edit kamar lewat bot tersedia untuk tier Growth dan Pro."
const roomStatusMap = { kosong: "available", tersedia: "available", available: "available", terisi: "occupied", occupied: "occupied", dipesan: "booked", booked: "booked" } as const
const roomStatusLabel = { available: "Tersedia", occupied: "Terisi", booked: "Dipesan" } as const
const privacyReply = (baseUrl: string | undefined, reviewed: string | undefined) => reviewed === "true" && baseUrl ? `Kebijakan Privasi: ${baseUrl.replace(/\/+$/, "")}/kebijakan-privasi\nHak Data: ${baseUrl.replace(/\/+$/, "")}/hak-data` : "Informasi privasi sedang disiapkan."
const propertyReportReply = (baseUrl: string | undefined, value: string) => baseUrl && value.trim() ? `Laporkan kos melalui formulir ini: ${baseUrl.replace(/\/+$/, "")}/kos/${encodeURIComponent(value.trim())}/lapor` : "Kos tidak ditemukan."

const getOwnerSubscriptionTier = async (ctx: MutationCtx, ownerId: Id<"owners">) => {
  const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique()
  return getEffectiveTier(subscription)
}

const isRoomFeatureAllowed = (tier: keyof typeof tierRank) => tier === "growth" || tier === "pro"
const isMonthlyReportAllowed = (tier: keyof typeof tierRank) => tier === "growth" || tier === "pro"
const latestCompletedReportPeriod = () => {
  const now = new Date()
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export const processEvent = internalMutation({
    args: { channel: channelValidator, eventId: v.string(), chatId: v.string(), text: v.optional(v.string()), callbackAction: v.optional(v.union(v.literal("confirm"), v.literal("reject"), v.literal("upgrade"), v.literal("cancel"))), callbackReference: v.optional(v.string()), callbackQueryId: v.optional(v.string()), photoFileId: v.optional(v.string()), photoMediaId: v.optional(v.string()), senderKey: v.optional(v.string()), senderPhone: v.optional(v.string()), contactPhone: v.optional(v.string()), contactUserId: v.optional(v.string()), fromUserId: v.optional(v.string()), location: v.optional(v.object({ latitude: v.number(), longitude: v.number() })) },
  handler: async (ctx, args): Promise<ProcessResult> => {
    const duplicate = await ctx.db.query("notification_log").withIndex("by_provider_event", (q) => q.eq("providerEventId", args.eventId)).unique()
    if (duplicate) return { status: "duplicate" as const }
    const chatId = normalizeChatId(args.channel, args.chatId)
    const incomingText = (args.text ?? "").trim()
    const startSlug = incomingText.match(/^\/start\s+kos_([a-z0-9-]+)$/i)?.[1] ?? incomingText.match(/(?:^|\s)kos_([a-z0-9-]+)(?:\s|$)/i)?.[1]
    if (args.senderKey && startSlug) return { status: "search" as const, kind: "deep_link" as const, channel: args.channel, chatId, senderKey: args.senderKey, text: incomingText, arg: startSlug }
    if (args.senderKey && /^\/?cari(?:\s|$)/i.test(incomingText) && !args.location && !incomingText.replace(/^\/?cari\s*/i, "").trim()) return args.channel === "telegram" ? response(args.channel, chatId, "Bagikan lokasi untuk mencari kos terdekat. Lokasimu hanya dipakai sesaat dan tidak disimpan.", { keyboard: [[{ text: "Bagikan lokasi", request_location: true }]], resize_keyboard: true, one_time_keyboard: true }) : response(args.channel, chatId, "Kirim lokasi lewat tombol lampiran > Lokasi. Lokasimu hanya dipakai sesaat dan tidak disimpan.")
    if (args.senderKey && /^\/?cari(?:\s|$)/i.test(incomingText)) return { status: "search" as const, kind: "cari" as const, channel: args.channel, chatId, senderKey: args.senderKey, text: incomingText, location: args.location }
    if (args.senderKey && /^\/?detail(?:\s|$)/i.test(incomingText)) return { status: "search" as const, kind: "detail" as const, channel: args.channel, chatId, senderKey: args.senderKey, text: incomingText, arg: incomingText.replace(/^\/?detail\s*/i, "") }
    if (args.location) return response(args.channel, chatId, "Mau cari kos di dekat sini? Ketik /cari.")
    if (args.senderKey && args.text !== undefined && isRaporEnabled((env as typeof env & Record<string, string | undefined>).RAPOR_ENABLED)) {
      const identityResult: { handled: boolean; text?: string; requestContact?: boolean; requestConfirm?: boolean; clearKeyboard?: boolean } = await ctx.runMutation(internal.tenantIdentity.receiveVerificationCode, { channel: args.channel, rawText: args.text, senderKey: args.senderKey, senderPhone: args.senderPhone, contactPhone: args.contactPhone, contactUserId: args.contactUserId, fromUserId: args.fromUserId })
      if (identityResult.handled) {
        let replyMarkup: Parameters<typeof response>[3] = undefined
        if (args.channel === "telegram") {
          if (identityResult.requestContact) {
            replyMarkup = { keyboard: [[{ text: "📱 Bagikan Nomor Telepon", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }
          } else if (identityResult.requestConfirm) {
            replyMarkup = { keyboard: [[{ text: "YA" }, { text: "TIDAK" }]], resize_keyboard: true, one_time_keyboard: true }
          } else if (identityResult.clearKeyboard) {
            replyMarkup = { remove_keyboard: true }
          }
        }
        return response(args.channel, chatId, identityResult.text ?? "Kode tidak valid atau sudah tidak berlaku.", replyMarkup)
      }
    }
    const link = (await ctx.db.query("bot_links").withIndex("by_channel_and_chat_id", (q) => q.eq("channel", args.channel).eq("chatId", chatId)).take(10)).find((item) => item.status === "active")
    if (!link) {
      const unlinkedCommand = parseBotCommand(args.text ?? "")
      if (unlinkedCommand.kind === "privacy") return response(args.channel, chatId, privacyReply((env as typeof env & Record<string, string | undefined>).APP_BASE_URL, (env as typeof env & Record<string, string | undefined>).NEXT_PUBLIC_LEGAL_REVIEWED))
      if (unlinkedCommand.kind === "report_property") return response(args.channel, chatId, propertyReportReply((env as typeof env & Record<string, string | undefined>).APP_BASE_URL, unlinkedCommand.value))
      if (args.senderKey && args.text) {
        const applicationResult = await ctx.runMutation(internal.applicationFlow.handle, { channel: args.channel, senderKey: args.senderKey, chatId, text: args.text, senderPhone: args.senderPhone, contactPhone: args.contactPhone, contactUserId: args.contactUserId, fromUserId: args.fromUserId })
        if (applicationResult.handled) return response(args.channel, chatId, applicationResult.text)
      }
      if ((unlinkedCommand.kind === "share" || unlinkedCommand.kind === "revoke_share") && args.senderKey && !isRaporEnabled((env as typeof env & Record<string, string | undefined>).RAPOR_ENABLED)) return response(args.channel, chatId, "Fitur ini belum dibuka.")
      if ((unlinkedCommand.kind === "share" || unlinkedCommand.kind === "revoke_share") && args.senderKey) {
        const result = unlinkedCommand.kind === "share"
          ? await ctx.runMutation(internal.raporShares.botCreateShare, { channel: args.channel, senderKey: args.senderKey })
          : await ctx.runMutation(internal.raporShares.botRevokeShares, { channel: args.channel, senderKey: args.senderKey })
        return response(args.channel, chatId, result.text)
      }
      if (args.channel === "telegram" && unlinkedCommand.kind === "chat_id") {
        return response(args.channel, chatId, buildChatIdMessage(chatId))
      }
      if (args.channel === "telegram" && unlinkedCommand.kind === "help") return response(args.channel, chatId, buildHelpMessage("telegram", chatId))
      if (args.channel === "whatsapp") {
        const senderDigits = (args.senderPhone ?? chatId).replace(/\D/g, "")
        const refMatch = incomingText.match(/#([a-zA-Z0-9_-]+)/)
        let paymentToConfirm = null

        if (refMatch) {
          try {
            paymentToConfirm = await ctx.db.get("payments", refMatch[1] as Id<"payments">)
          } catch {
            // Not a valid payment ID format
          }
        }

        if (!paymentToConfirm && senderDigits.length >= 8) {
          const tenantsWithPhone = await ctx.db.query("tenants").take(200)
          const matchedTenant = tenantsWithPhone.find((t) => {
            const tPhone = t.phone.replace(/\D/g, "")
            return tPhone && (senderDigits.endsWith(tPhone) || tPhone.endsWith(senderDigits))
          })
          if (matchedTenant) {
            const recent = await ctx.db
              .query("payments")
              .withIndex("by_tenant_and_paid_at", (q) => q.eq("tenantId", matchedTenant._id))
              .order("desc")
              .take(1)
            if (recent[0] && recent[0].status === "pending_review") {
              paymentToConfirm = recent[0]
            }
          }
        }

        if (paymentToConfirm) {
          const property = await ctx.db.get("properties", paymentToConfirm.propertyId)
          const room = await ctx.db.get("rooms", paymentToConfirm.roomId)
          const tenant = await ctx.db.get("tenants", paymentToConfirm.tenantId)
          const proofUrl = paymentToConfirm.proofStorageId
            ? await ctx.storage.getUrl(paymentToConfirm.proofStorageId)
            : undefined

          const amountFormatted = `Rp ${paymentToConfirm.amount.toLocaleString("id-ID")}`
          const tenantName = tenant?.name || "Kak"
          const propertyName = property?.name || "Kos"
          const roomNumber = room?.roomNumber || "-"

          const replyText =
            `Halo *${tenantName}*! 👋\n\n` +
            `Bukti transfer pembayaran Anda untuk *${propertyName}* (Kamar ${roomNumber}) sebesar *${amountFormatted}* telah berhasil diterima di sistem BotKos.\n\n` +
            `📋 *Rincian Pembayaran:*\n` +
            `• Properti: ${propertyName}\n` +
            `• Kamar: ${roomNumber}\n` +
            `• Nominal: ${amountFormatted}\n` +
            `• Status: ⏳ *Menunggu Verifikasi Pemilik*\n\n` +
            `Di atas adalah salinan bukti transfer Anda. Kami akan mengirimkan notifikasi lagi di WhatsApp ini setelah pemilik kos mengonfirmasi pembayaran Anda. Terima kasih! 🙏`

          return {
            status: "tenant_payment_receipt" as const,
            channel: "whatsapp" as const,
            chatId,
            text: replyText,
            imageUrl: proofUrl ?? undefined,
          }
        }
      }

      if (args.text?.trim()) return response(args.channel, chatId, buildWelcomeMessage(args.channel))
      return { status: "invalid" as const }
    }
    const isFirstWhatsAppMessage = args.channel === "whatsapp" && !link.lastSeenAt
    await ctx.db.patch("bot_links", link._id, { lastSeenAt: Date.now() })
    const actor = await ctx.db.get("owners", link.ownerId)
    if (!actor) return { status: "invalid" as const }

    const session = (await ctx.db.query("bot_sessions").withIndex("by_chat", (q) => q.eq("channel", args.channel).eq("chatId", chatId).eq("status", "active")).take(5)).find((item) => item.expiresAt > Date.now())
    let conversation = (await ctx.db.query("bot_conversation_state").withIndex("by_chat_and_status", (q) => q.eq("channel", args.channel).eq("chatId", chatId).eq("status", "active")).take(5)).find((item) => item.flowType === "tambah_kamar")
    if (conversation && conversation.expiresAt <= Date.now()) {
      await ctx.db.patch("bot_conversation_state", conversation._id, { status: "expired" })
      conversation = undefined
      if (incomingText.toUpperCase() !== "/TAMBAHKAMAR" && incomingText.toUpperCase() !== "TAMBAHKAMAR") return response(args.channel, chatId, `⌛ Sesi tambah kamar sebelumnya sudah dibatalkan karena tidak ada aktivitas selama 10 menit. Kirim ${commandForChannel(args.channel, "tambahkamar")} untuk memulai lagi.`)
    }
    if (args.photoFileId || args.photoMediaId) {
      if (conversation?.currentStep === "photo") return { status: "room_photo" as const, channel: args.channel, chatId, ownerId: link.ownerId, stateId: conversation._id, photoFileId: args.photoFileId, photoMediaId: args.photoMediaId }
      if (actor.role === "owner" && session?.kind === "upgrade_payment") return { status: "photo" as const, channel: args.channel, chatId, ownerId: link.ownerId, sessionId: session._id, photoFileId: args.photoFileId, photoMediaId: args.photoMediaId }
      return { status: "invalid" as const }
    }

    if (conversation) {
      if (incomingText.toUpperCase() === "BATAL" || incomingText.toUpperCase() === "CANCEL") {
        await ctx.db.patch("bot_conversation_state", conversation._id, { status: "canceled" })
        return response(args.channel, chatId, `❌ *Proses dibatalkan*\n\n_Ketik ${commandForChannel(args.channel, "help")} untuk melihat command yang tersedia._`)
      }
      if (conversation.currentStep === "property") {
        const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).take(50)
        const selection = Number(incomingText)
        const property = Number.isInteger(selection) ? properties[selection - 1] : properties.find((item) => item.name.toLowerCase() === incomingText.toLowerCase())
        if (!property) return response(args.channel, chatId, "Pilih nomor properti yang valid, atau ketik BATAL.")
        await ctx.db.patch("bot_conversation_state", conversation._id, { currentStep: "room_number", collectedData: { propertyId: property._id } })
        return response(args.channel, chatId, `🔑 *Tambah Kamar · 1/3*\n\nProperti ${property.name} dipilih.\n\nNomor atau nama kamar?`)
      }
      const parsedWizard = parseRoomWizardInput(conversation.currentStep, incomingText)
      if (!parsedWizard.ok) return response(args.channel, chatId, parsedWizard.message)
      const data: RoomWizardData = { ...conversation.collectedData }
      if (conversation.currentStep === "room_number") {
        data.roomNumber = String(parsedWizard.value)
        await ctx.db.patch("bot_conversation_state", conversation._id, { currentStep: "monthly_rent", collectedData: data })
        return response(args.channel, chatId, `🔑 *Tambah Kamar · 2/3*\n\nHarga sewa bulanan untuk kamar ${data.roomNumber}?\n\n_Contoh: 1500000_`)
      }
      if (conversation.currentStep === "monthly_rent") {
        data.monthlyRent = Number(parsedWizard.value)
        await ctx.db.patch("bot_conversation_state", conversation._id, { currentStep: "photo", collectedData: data })
        return response(args.channel, chatId, "🔑 *Tambah Kamar · 3/3*\n\nKirim foto kamar ini, atau ketik \"lewati\".")
      }
      if (parsedWizard.value === "skip") {
        const result = await finalizeAddRoomInContext(ctx, conversation._id, link.ownerId, data)
        return response(args.channel, chatId, `✅ *Kamar ${result.roomNumber} ditambahkan*\n\nHarga: Rp ${result.monthlyRent.toLocaleString("id-ID")}/bulan\nStatus: Tersedia\n\nLengkapi fasilitas dan detail lain di dashboard: ${propertyTabUrl(String(result.propertyId), "rooms")}`)
      }
    }

    if (isFirstWhatsAppMessage) return response(args.channel, chatId, buildWelcomeMessage("whatsapp"))

    const parsed = args.callbackAction === "upgrade" && args.callbackReference
      ? { kind: "selection" as const, value: args.callbackReference.replace(":", " ") }
      : args.callbackAction === "cancel" && args.callbackReference
        ? { kind: "cancel" as const, value: args.callbackReference }
        : args.callbackAction && args.callbackReference
          ? { kind: args.callbackAction, reference: args.callbackReference, reason: "Ditolak melalui bot Telegram." }
          : parseBotCommand(args.text ?? "")

    if (parsed.kind === "privacy") return response(args.channel, chatId, privacyReply((env as typeof env & Record<string, string | undefined>).APP_BASE_URL, (env as typeof env & Record<string, string | undefined>).NEXT_PUBLIC_LEGAL_REVIEWED))
    if (parsed.kind === "report_property") return response(args.channel, chatId, propertyReportReply((env as typeof env & Record<string, string | undefined>).APP_BASE_URL, parsed.value))

    if (parsed.kind === "application_decision") {
      try {
        const result = await ctx.runMutation(internal.applications.ownerDecisionByCode, { ownerId: link.ownerId, code: parsed.code, action: parsed.decision })
        return response(args.channel, chatId, result.text)
      } catch (error) {
        return response(args.channel, chatId, error instanceof Error ? error.message : "Pengajuan tidak dapat diproses.")
      }
    }

    if ((parsed.kind === "share" || parsed.kind === "revoke_share") && args.senderKey && !isRaporEnabled((env as typeof env & Record<string, string | undefined>).RAPOR_ENABLED)) return response(args.channel, chatId, "Fitur ini belum dibuka.")
    if ((parsed.kind === "share" || parsed.kind === "revoke_share") && args.senderKey) {
      const result = parsed.kind === "share"
        ? await ctx.runMutation(internal.raporShares.botCreateShare, { channel: args.channel, senderKey: args.senderKey })
        : await ctx.runMutation(internal.raporShares.botRevokeShares, { channel: args.channel, senderKey: args.senderKey })
      return response(args.channel, chatId, result.text)
    }

    if (parsed.kind === "help") return response(args.channel, chatId, buildHelpMessage(args.channel))
    // Telegram /start intentionally reuses the HTML help response; BotFather description is not required.
    if (parsed.kind === "chat_id") {
      if (args.channel !== "telegram") return response(args.channel, chatId, "Chat ID khusus Telegram. Untuk WhatsApp, gunakan nomor WhatsApp yang terhubung di dashboard.")
      return response(args.channel, chatId, buildChatIdMessage(chatId))
    }

    const isAdminCommand = parsed.kind === "pending" || parsed.kind === "summary" || parsed.kind === "admin_decision" || (parsed.kind === "yes" && session?.kind === "admin_confirmation")
    if (isAdminCommand && actor.role !== "admin") return { status: "silent" as const }

    if (parsed.kind === "add_room") {
      const tier = await getOwnerSubscriptionTier(ctx, link.ownerId)
      if (!isRoomFeatureAllowed(tier)) return response(args.channel, chatId, `🔑 *${roomFeatureGateText}*\n\n_Ketik ${commandForChannel(args.channel, "upgrade")} untuk melihat pilihan._`)
      const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).take(50)
      if (properties.length === 0) return response(args.channel, chatId, "Belum ada properti. Tambahkan properti dari dashboard terlebih dahulu.")
      const hasSingleProperty = properties.length === 1
      await ctx.db.insert("bot_conversation_state", {
        channel: args.channel,
        chatId,
        ownerId: link.ownerId,
        flowType: "tambah_kamar",
        currentStep: hasSingleProperty ? "room_number" : "property",
        status: "active",
        collectedData: hasSingleProperty ? { propertyId: properties[0]._id } : {},
        expiresAt: Date.now() + 10 * 60 * 1000,
      })
      if (hasSingleProperty) return response(args.channel, chatId, "🔑 *Tambah Kamar · 1/3*\n\nNomor atau nama kamar?\n\n_Ketik BATAL kapan saja untuk membatalkan._")
      return response(args.channel, chatId, "🔑 *Tambah Kamar · Pilih Properti*\n\n" + properties.map((property, index) => (index + 1) + ". " + property.name).join("\n") + "\n\n_Balas dengan nomor properti._")
    }

    if (parsed.kind === "edit_room") {
      const tier = await getOwnerSubscriptionTier(ctx, link.ownerId)
      if (!isRoomFeatureAllowed(tier)) return response(args.channel, chatId, `🔑 *${roomFeatureGateText}*\n\n_Ketik ${commandForChannel(args.channel, "upgrade")} untuk melihat pilihan._`)
      const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).take(50)
      let room: Awaited<ReturnType<typeof ctx.db.get<"rooms">>> | undefined
      for (const property of properties) {
        const candidate = await ctx.db.query("rooms").withIndex("by_property_and_room_number", (q) => q.eq("propertyId", property._id).eq("roomNumber", parsed.roomNumber)).unique()
        if (candidate) {
          room = candidate
          break
        }
      }
      if (!room) return response(args.channel, chatId, `⚠️ Kamar ${parsed.roomNumber} tidak ditemukan di properti Anda.`)
      if (parsed.field === "price") {
        const price = parseRoomWizardInput("monthly_rent", parsed.value)
        if (!price.ok) return response(args.channel, chatId, price.message)
        await updateRoomForOwnerInContext(ctx, link.ownerId, {
          roomId: room._id,
          roomNumber: room.roomNumber,
          monthlyRent: Number(price.value),
          status: room.status,
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
          dp_max_days: room.dp_max_days,
          electricityStatus: room.electricityStatus,
          additionalFees: room.additionalFees,
          description: room.description,
        })
        return response(args.channel, chatId, `✅ *Harga kamar diperbarui*\n\nKamar: ${room.roomNumber}\nHarga baru: Rp ${Number(price.value).toLocaleString("id-ID")}/bulan`)
      }
      const nextStatus = roomStatusMap[parsed.value.toLowerCase() as keyof typeof roomStatusMap]
      if (!nextStatus) return response(args.channel, chatId, "Status tidak dikenali. Gunakan: kosong, terisi, atau dipesan.")
      await updateRoomForOwnerInContext(ctx, link.ownerId, {
        roomId: room._id,
        roomNumber: room.roomNumber,
        monthlyRent: room.monthlyRent,
        status: nextStatus,
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
        dp_max_days: room.dp_max_days,
        electricityStatus: room.electricityStatus,
        additionalFees: room.additionalFees,
        description: room.description,
      })
      return response(args.channel, chatId, `✅ *Status kamar diperbarui*\n\nKamar: ${room.roomNumber}\nStatus: ${roomStatusLabel[nextStatus]}`)
    }

    if (parsed.kind === "monthly_report") {
      const tier = await getOwnerSubscriptionTier(ctx, link.ownerId)
      if (!isMonthlyReportAllowed(tier)) return response(args.channel, chatId, `🔑 *Laporan bulanan khusus Growth dan Pro*\n\nLaporan bulanan otomatis tersedia untuk tier Growth dan Pro.\n\n_Ketik ${commandForChannel(args.channel, "upgrade")} untuk melihat pilihan._`)
      const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).take(50)
      const activeProperties = properties.filter((property) => property.isActive)
      if (activeProperties.length === 0) return response(args.channel, chatId, "Belum ada properti aktif untuk dibuatkan laporan.")
      const period = latestCompletedReportPeriod()
      for (const property of activeProperties) await ctx.scheduler.runAfter(0, internal.monthlyReportsActions.generateAndDeliver, { ownerId: link.ownerId, propertyId: property._id, period })
      return response(args.channel, chatId, `📄 Laporan ${period} sedang dibuat. ${activeProperties.length} PDF terpisah akan dikirim ke channel bot yang terhubung.`)
    }

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
        return response(args.channel, chatId, `🔑 *Antrean Admin*\n\nVerifikasi: ${identity.length + propertyItems.length}\nPembayaran: ${billing.length}\nLaporan: ${reportItems.length}\n\n_Gunakan ${commandForChannel(args.channel, "approve")} [ID] atau ${commandForChannel(args.channel, "reject")} [ID]._`)
      }
      if (parsed.kind === "summary") {
        const subscriptions = await ctx.db.query("subscriptions").take(100)
        const counts = subscriptions.reduce<Record<string, number>>((result, item) => { result[item.tier] = (result[item.tier] ?? 0) + 1; return result }, {})
        const mrr = subscriptions.filter((item) => item.status === "active" && item.tier !== "free").reduce((sum, item) => sum + (item.billingCycle === "annual" ? item.priceAmount / 12 : item.priceAmount), 0)
        return response(args.channel, chatId, `🔑 *Ringkasan Admin*\n\nEstimasi MRR: Rp ${Math.round(mrr).toLocaleString("id-ID")}\n\n*Langganan*\nStarter: ${counts.starter ?? 0}\nGrowth: ${counts.growth ?? 0}\nPro: ${counts.pro ?? 0}\nPast due: ${subscriptions.filter((item) => item.status === "past_due").length}`)
      }
      if (parsed.kind === "admin_decision") {
        const target = await resolveAdminTarget(ctx, parsed.reference)
        if (!target) return response(args.channel, chatId, buildUnknownCommandMessage(args.channel))
        if (session) await ctx.db.patch("bot_sessions", session._id, { status: "expired" })
        await ctx.db.insert("bot_sessions", { channel: args.channel, chatId, ownerId: link.ownerId, kind: "admin_confirmation", status: "active", targetType: target.type, targetId: target.id, reference: parsed.reference, decision: parsed.decision, createdAt: Date.now(), expiresAt: Date.now() + 5 * 60 * 1000 })
        return response(args.channel, chatId, `⚠️ *Konfirmasi persetujuan/penolakan*\n\nJenis: ${target.label}\nDetail: ${target.detail}\nID: \`${parsed.reference}\`\n\n_Balas YA untuk menyetujui/menolak._`)
      }
      if (parsed.kind === "yes" && session?.kind === "admin_confirmation" && session.targetType && session.targetId && session.decision) {
        const targetId = session.targetId
        if (session.targetType === "subscription") session.decision === "approve" ? await approveSubscriptionForAdmin(ctx, link.ownerId, targetId as Id<"subscriptions">) : await rejectSubscriptionForAdmin(ctx, link.ownerId, targetId as Id<"subscriptions">, "Ditolak melalui bot admin.")
        if (session.targetType === "verification_identity") await reviewIdentityForAdmin(ctx, link.ownerId, { ownerId: targetId as Id<"owners">, decision: session.decision === "approve" ? "approved" : "rejected", reason: session.decision === "reject" ? "Ditolak melalui bot admin." : undefined })
        if (session.targetType === "verification_property") await reviewPropertyForAdmin(ctx, link.ownerId, { propertyId: targetId as Id<"properties">, decision: session.decision === "approve" ? "approved" : "rejected", reason: session.decision === "reject" ? "Ditolak melalui bot admin." : undefined })
        if (session.targetType === "report") await updateStatusForAdmin(ctx, link.ownerId, { reportId: targetId as Id<"reports">, status: session.decision === "approve" ? "reviewed" : "resolved" })
        await ctx.db.patch("bot_sessions", session._id, { status: "completed" })
        return response(args.channel, chatId, `✅ *Keputusan diterapkan*\n\nKeputusan admin untuk \`${session.reference ?? session.targetId}\` sudah diterapkan.`)
      }
      return response(args.channel, chatId, buildUnknownCommandMessage(args.channel))
    }

    if (parsed.kind === "cancel" && (session?.kind === "upgrade_selection" || session?.kind === "upgrade_payment")) {
      await ctx.db.patch("bot_sessions", session._id, { status: "expired" })
      return response(args.channel, chatId, `❌ *Proses dibatalkan*\n\n_Ketik ${commandForChannel(args.channel, "help")} untuk melihat command yang tersedia._`)
    }

    const query = parseQueryCommand(args.text ?? "")
    if (query === "status" || query === "unpaid" || query === "vacant") return { status: "query" as const, query, ownerId: link.ownerId, channel: args.channel, chatId }
    if (parsed.kind === "subscription") {
      const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).unique()
      const rooms = await getRoomCountForOwner(ctx, link.ownerId)
      const tier = subscription?.tier ?? "free"
      const recommended = getTierForRoomCount(rooms)
      return response(args.channel, chatId, `🔑 *Langganan BotKos*\n\nTier aktif: ${tier}\nJumlah kamar: ${rooms}\nStatus: ${subscription?.status ?? "active"}\nJatuh tempo: ${dateText(subscription?.currentPeriodEnd)}${tierRank[recommended] > tierRank[tier] ? `\n\n⚠️ *Perlu upgrade*\nJumlah kamar Anda sudah masuk ke tier ${recommended}.\n\n_Ketik ${commandForChannel(args.channel, "upgrade")} untuk melihat pilihan._` : ""}`)
    }
    if (parsed.kind === "upgrade") {
      const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).unique()
      const activeTier = subscription?.tier ?? "free"
      const tiers = (["starter", "growth", "pro"] as const).filter((tier) => tierRank[tier] > tierRank[activeTier])
      if (!tiers.length) return response(args.channel, chatId, "Anda sudah berada di tier tertinggi. Tidak ada pilihan upgrade.")
      if (session) await ctx.db.patch("bot_sessions", session._id, { status: "expired" })
      await ctx.db.insert("bot_sessions", { channel: args.channel, chatId, ownerId: link.ownerId, kind: "upgrade_selection", status: "active", createdAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000 })
      if (args.channel === "telegram") {
        const upgradeMessage = buildTelegramUpgradeMessage(tiers.map((tier) => ({ tier, monthlyPrice: getTierPrice(tier, "monthly"), annualPrice: getTierPrice(tier, "annual") })))
        return response(args.channel, chatId, upgradeMessage.text, upgradeMessage.reply_markup)
      }
      return response(args.channel, chatId, `🔑 *Pilih Paket Upgrade*\n\n${tiers.map((tier, index) => `*${index + 1}. ${tier}*\nRp ${getTierPrice(tier, "monthly").toLocaleString("id-ID")}/bulan · Rp ${getTierPrice(tier, "annual").toLocaleString("id-ID")}/tahun`).join("\n\n")}\n\nBalas dengan tier dan periode.\nContoh: \`GROWTH MONTHLY\`\n\n_Ketik BATAL untuk membatalkan._`)
    }
    if (parsed.kind === "selection" && session?.kind === "upgrade_selection") {
      const [selection, cycle = "MONTHLY"] = parsed.value.split(" ")
      const tierMap = { "1": "starter", "2": "growth", "3": "pro", STARTER: "starter", GROWTH: "growth", PRO: "pro" } as const
      const tier = tierMap[selection as keyof typeof tierMap]
      const billingCycle: BillingCycle = cycle === "ANNUAL" || cycle === "TAHUNAN" ? "annual" : "monthly"
      if (!tier) return response(args.channel, chatId, "⚠️ Pilihan tier tidak dikenali. Balas STARTER, GROWTH, atau PRO + MONTHLY/ANNUAL.")
      await ctx.db.patch("bot_sessions", session._id, { kind: "upgrade_payment", selectedTier: tier, selectedBillingCycle: billingCycle })
      const selectionText = `✅ *Pilihan ${tier} ${billingCycle} dicatat*\n\nTransfer manual ke rekening/QRIS admin sebesar Rp ${getTierPrice(tier, billingCycle).toLocaleString("id-ID")}, lalu upload foto bukti transfer di chat ini. Pengajuan akan menunggu review admin.`
      return response(args.channel, chatId, selectionText, args.channel === "telegram" ? buildTelegramCancelMarkup() : undefined)
    }
    if (parsed.kind === "confirm" || parsed.kind === "reject") {
      const allPayments = await ctx.db.query("payments").take(500)
      const payment = allPayments.find((candidate) => createPaymentReference(String(candidate._id)) === parsed.reference)
      if (!payment || payment.status !== "pending_review") return response(args.channel, chatId, "⚠️ Referensi pembayaran tidak ditemukan atau sudah diproses. Ketik /help untuk melihat format command.")
      const property = await ctx.db.get("properties", payment.propertyId)
      const room = await ctx.db.get("rooms", payment.roomId)
      const tenant = await ctx.db.get("tenants", payment.tenantId)
      const decision = parsed.kind === "confirm" ? "confirmed" as const : "rejected" as const
      if (parsed.kind === "confirm") await confirmPaymentForOwner(ctx, payment._id, link.ownerId)
      else await rejectPaymentForOwner(ctx, payment._id, link.ownerId, parsed.reason ?? "Ditolak melalui bot.")
      await ctx.scheduler.runAfter(0, internal.bots.delivery.sendPaymentDecisionNotice, { ownerId: link.ownerId, paymentId: payment._id, decision, sourceChannel: args.channel })
      const amount = `Rp ${payment.amount.toLocaleString("id-ID")}`
      const common = `Referensi: \`${displayValue(args.channel, parsed.reference)}\`\nTenant: ${displayValue(args.channel, tenant?.name ?? "Tenant")}\nKamar: ${displayValue(args.channel, property?.name ?? "Properti")} · ${displayValue(args.channel, room?.roomNumber ?? "-")}\nNominal: ${amount}`
      return response(args.channel, chatId, parsed.kind === "confirm"
        ? `✅ *Pembayaran dikonfirmasi*\n\n${common}\n\n_Tenant sudah menerima notifikasi WhatsApp._`
        : `❌ *Pembayaran ditolak*\n\n${common}\nAlasan: ${displayValue(args.channel, parsed.reason ?? "Bukti belum dapat diverifikasi.")}\n\n_Tenant sudah menerima notifikasi WhatsApp._`)
    }
    return response(args.channel, chatId, buildUnknownCommandMessage(args.channel))
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
