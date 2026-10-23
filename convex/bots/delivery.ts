"use node"

import { env, internalAction } from "../_generated/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { createPaymentReference } from "./commands"
import { sendTelegramPaymentProof, sendTelegramPaymentReview, sendTelegramText } from "./telegram"
import { buildWhatsAppReviewMessage, sendWhatsAppImage, sendWhatsAppPaymentProof, sendWhatsAppPaymentReview, sendWhatsAppText } from "./whatsapp"

const botEnv = env as typeof env & Record<string, string | undefined>
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export const sendPaymentUploaded = internalAction({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const review = await ctx.runQuery(internal.notifications.getPaymentReview, { paymentId: args.paymentId })
    if (!review || review.links.length === 0) return { delivered: 0 }
    const summary = { propertyName: review.propertyName, roomNumber: review.roomNumber, tenantName: review.tenantName, amount: `Rp ${review.amount.toLocaleString("id-ID")}`, reference: createPaymentReference(String(review.paymentId)) }
    let delivered = 0
    for (const link of review.links) {
      try {
        if (link.channel === "telegram" && botEnv.TELEGRAM_BOT_TOKEN) {
          const result = review.proofUrl ? await sendTelegramPaymentProof(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, summary, review.proofUrl) : await sendTelegramPaymentReview(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, summary)
          await ctx.runMutation(internal.notifications.recordDelivery, { paymentId: review.paymentId, ownerId: review.ownerId, channel: "telegram", status: "logged", externalMessageId: result.result?.message_id ? String(result.result.message_id) : undefined })
          delivered += 1
        }
        if (link.channel === "whatsapp") {
          if (review.paymentType === "dp") {
            const result = await ctx.runAction(internal.whatsappDelivery.sendWhatsAppNotification, { toPhoneE164: link.chatId, kind: "owner_dp_claim", params: { kode: summary.reference, kos: review.propertyName }, fallbackText: buildWhatsAppReviewMessage(summary), idempotencyKey: `payment:${review.paymentId}:owner_dp_claim` })
            await ctx.runMutation(internal.notifications.recordDelivery, { paymentId: review.paymentId, ownerId: review.ownerId, channel: "whatsapp", status: result.ok ? "logged" : "failed", errorMessage: result.errorCode })
            if (result.ok) delivered += 1
            continue
          }
          if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) continue
          const result = review.proofUrl
            ? await sendWhatsAppPaymentProof(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, summary, review.proofUrl)
            : await sendWhatsAppPaymentReview(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, summary)
          await ctx.runMutation(internal.notifications.recordDelivery, { paymentId: review.paymentId, ownerId: review.ownerId, channel: "whatsapp", status: "logged", externalMessageId: result.messages?.[0]?.id })
          delivered += 1
        }
      } catch (error) {
        await ctx.runMutation(internal.notifications.recordDelivery, { paymentId: review.paymentId, ownerId: review.ownerId, channel: link.channel, status: "failed", errorMessage: error instanceof Error ? error.message : "Provider request failed" })
      }
    }
    return { delivered }
  },
})

export const sendTenantPaymentPendingNotice = internalAction({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args): Promise<{ delivered: number }> => {
    if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) return { delivered: 0 }
    const review = await ctx.runQuery(internal.notifications.getPaymentReview, { paymentId: args.paymentId })
    if (!review) return { delivered: 0 }
    const phoneNumber = review.tenantPhone.replace(/\D/g, "")
    if (phoneNumber.length < 9) return { delivered: 0 }
    const amount = `Rp ${review.amount.toLocaleString("id-ID")}`
    const text = `Halo *${review.tenantName}*,\n\nBukti pembayaran Anda sudah kami terima.\n\nProperti: ${review.propertyName}\nKamar: ${review.roomNumber}\nNominal: ${amount}\nStatus: Menunggu verifikasi pemilik kos\n\n_Kami akan mengirimkan pembaruan setelah keputusan dibuat._`
    try {
      const result = review.proofUrl
        ? await sendWhatsAppImage(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, phoneNumber, review.proofUrl, text)
        : await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, phoneNumber, text)
      return { delivered: result.messages?.length ? 1 : 0 }
    } catch (error) {
      console.error("Gagal mengirim konfirmasi penerimaan pembayaran ke tenant:", error)
      return { delivered: 0 }
    }
  },
})

export const sendPaymentDecisionNotice = internalAction({
  args: {
    ownerId: v.id("owners"),
    paymentId: v.id("payments"),
    decision: v.union(v.literal("confirmed"), v.literal("rejected")),
    sourceChannel: v.optional(v.union(v.literal("telegram"), v.literal("whatsapp"))),
  },
  handler: async (ctx, args) => {
    const review = await ctx.runQuery(internal.notifications.getPaymentReview, { paymentId: args.paymentId })
    if (!review || review.ownerId !== args.ownerId) return { delivered: 0 }
    const links = review.links.filter((link) => link.status === "active" && link.channel !== args.sourceChannel)
    const reference = createPaymentReference(String(args.paymentId))
    const text = args.decision === "confirmed"
      ? `🔑 <b>Pembayaran diperbarui</b>\n\nReferensi: <code>${escapeHtml(reference)}</code>\nTenant: ${escapeHtml(review.tenantName)}\nProperti: ${escapeHtml(review.propertyName)}\nKamar: ${escapeHtml(review.roomNumber)}\nStatus: Dikonfirmasi`
      : `🔑 <b>Pembayaran diperbarui</b>\n\nReferensi: <code>${escapeHtml(reference)}</code>\nTenant: ${escapeHtml(review.tenantName)}\nProperti: ${escapeHtml(review.propertyName)}\nKamar: ${escapeHtml(review.roomNumber)}\nStatus: Ditolak${review.rejectionReason ? `\nAlasan: ${escapeHtml(review.rejectionReason)}` : ""}`
    let delivered = 0
    for (const link of links) {
      try {
        if (link.channel === "telegram" && botEnv.TELEGRAM_BOT_TOKEN) {
          await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, text, { parseMode: "HTML" })
          delivered += 1
        }
        if (link.channel === "whatsapp" && botEnv.WHATSAPP_ACCESS_TOKEN && botEnv.WHATSAPP_PHONE_NUMBER_ID) {
          await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, text)
          delivered += 1
        }
      } catch (error) {
        console.error("Gagal mengirim sinkronisasi keputusan pembayaran:", error)
      }
    }
    const tenantPhone = review.tenantPhone.replace(/\D/g, "")
    if (botEnv.WHATSAPP_ACCESS_TOKEN && botEnv.WHATSAPP_PHONE_NUMBER_ID && tenantPhone.length >= 9) {
      const tenantText = args.decision === "confirmed"
        ? `✅ *Pembayaran diterima*\n\nHalo ${review.tenantName}, pembayaran Anda sudah dikonfirmasi oleh pemilik kos.\n\nProperti: ${review.propertyName}\nKamar: ${review.roomNumber}\nNominal: Rp ${review.amount.toLocaleString("id-ID")}`
        : `❌ *Pembayaran ditolak*\n\nHalo ${review.tenantName}, pembayaran Anda ditolak oleh pemilik kos.\n\nProperti: ${review.propertyName}\nKamar: ${review.roomNumber}\nNominal: Rp ${review.amount.toLocaleString("id-ID")}\nAlasan: ${review.rejectionReason ?? "Bukti belum dapat diverifikasi."}`
      try {
        const result = await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, tenantPhone, tenantText)
        if (result.messages?.length) delivered += 1
      } catch (error) {
        console.error("Gagal mengirim hasil verifikasi pembayaran ke tenant:", error)
      }
    }
    return { delivered }
  },
})

export const sendReminderNotice = internalAction({
  args: { ownerId: v.id("owners"), text: v.string() },
  handler: async (ctx, args) => {
    const links = await ctx.runQuery(internal.notifications.getOwnerBotLinks, { ownerId: args.ownerId })
    let delivered = 0
    for (const link of links) {
      if (link.status !== "active") continue
      try {
        if (link.channel === "telegram" && botEnv.TELEGRAM_BOT_TOKEN) {
          await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, args.text)
          delivered += 1
        }
        if (link.channel === "whatsapp" && botEnv.WHATSAPP_ACCESS_TOKEN && botEnv.WHATSAPP_PHONE_NUMBER_ID) {
          await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, args.text)
          delivered += 1
        }
      } catch (err) {
        console.error("Gagal kirim notifikasi reminder:", err)
      }
    }
    return { delivered }
  },
})

export const sendSupportTicketReplyNotice = internalAction({
  args: { ownerId: v.id("owners"), subject: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const links = await ctx.runQuery(internal.notifications.getOwnerBotLinks, { ownerId: args.ownerId })
    let delivered = 0
    for (const link of links) {
      if (link.status !== "active") continue
      try {
        if (link.channel === "telegram" && botEnv.TELEGRAM_BOT_TOKEN) {
          await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, `🔑 <b>Admin BotKos membalas tiket Anda</b>\n\nSubjek: ${escapeHtml(args.subject)}\n\n${escapeHtml(args.message)}`, { parseMode: "HTML" })
          delivered += 1
        }
        if (link.channel === "whatsapp" && botEnv.WHATSAPP_ACCESS_TOKEN && botEnv.WHATSAPP_PHONE_NUMBER_ID) {
          await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, `🔑 *Admin BotKos membalas tiket Anda*\n\nSubjek: ${args.subject}\n\n${args.message}`)
          delivered += 1
        }
      } catch (error) {
        console.error("Gagal mengirim notifikasi balasan tiket:", error)
      }
    }
    return { delivered }
  },
})

export const receiveSubscriptionProof = internalAction({
  args: { channel: v.union(v.literal("telegram"), v.literal("whatsapp")), chatId: v.string(), ownerId: v.id("owners"), sessionId: v.id("bot_sessions"), photoFileId: v.optional(v.string()), photoMediaId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.bots.subscriptionFlow.getSession, { sessionId: args.sessionId })
    if (!session || session.status !== "active" || !session.selectedTier || !session.selectedBillingCycle) return null
    let response: Response
    if (args.channel === "telegram") {
      if (!args.photoFileId || !botEnv.TELEGRAM_BOT_TOKEN) throw new Error("Foto Telegram belum dapat dibaca.")
      const fileResponse = await fetch(`https://api.telegram.org/bot${botEnv.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(args.photoFileId)}`)
      const fileData = await fileResponse.json() as { ok: boolean; result?: { file_path?: string } }
      if (!fileData.ok || !fileData.result?.file_path) throw new Error("File Telegram tidak ditemukan.")
      response = await fetch(`https://api.telegram.org/file/bot${botEnv.TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`)
    } else {
      if (!args.photoMediaId || !botEnv.WHATSAPP_ACCESS_TOKEN) throw new Error("Foto WhatsApp belum dapat dibaca.")
      const mediaResponse = await fetch(`https://graph.facebook.com/v22.0/${args.photoMediaId}`, { headers: { authorization: `Bearer ${botEnv.WHATSAPP_ACCESS_TOKEN}` } })
      const media = await mediaResponse.json() as { url?: string }
      if (!media.url) throw new Error("Media WhatsApp tidak ditemukan.")
      response = await fetch(media.url, { headers: { authorization: `Bearer ${botEnv.WHATSAPP_ACCESS_TOKEN}` } })
    }
    if (!response.ok) throw new Error("Gagal mengunduh bukti transfer.")
    const storageId = await ctx.storage.store(await response.blob())
    await ctx.runMutation(internal.subscriptions.submitPaymentFromBot, { ownerId: args.ownerId, sessionId: args.sessionId, tier: session.selectedTier, billingCycle: session.selectedBillingCycle, proofStorageId: storageId })
    if (args.channel === "telegram") {
      if (!botEnv.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
      await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, args.chatId, "✅ <b>Bukti transfer diterima</b>\n\nPengajuan upgrade sudah masuk antrean review admin.", { parseMode: "HTML" })
    } else {
      if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) throw new Error("Kredensial WhatsApp belum dikonfigurasi.")
      await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, args.chatId, "✅ Bukti transfer diterima. Pengajuan upgrade sudah masuk antrean review admin.")
    }
    return null
  },
})

export const receiveRoomPhoto = internalAction({
  args: { channel: v.union(v.literal("telegram"), v.literal("whatsapp")), chatId: v.string(), ownerId: v.id("owners"), stateId: v.id("bot_conversation_state"), photoFileId: v.optional(v.string()), photoMediaId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    let response: Response
    if (args.channel === "telegram") {
      if (!args.photoFileId || !botEnv.TELEGRAM_BOT_TOKEN) throw new Error("Foto Telegram belum dapat dibaca.")
      const fileResponse = await fetch(`https://api.telegram.org/bot${botEnv.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(args.photoFileId)}`)
      const fileData = await fileResponse.json() as { ok: boolean; result?: { file_path?: string } }
      if (!fileData.ok || !fileData.result?.file_path) throw new Error("File Telegram tidak ditemukan.")
      response = await fetch(`https://api.telegram.org/file/bot${botEnv.TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`)
    } else {
      if (!args.photoMediaId || !botEnv.WHATSAPP_ACCESS_TOKEN) throw new Error("Foto WhatsApp belum dapat dibaca.")
      const mediaResponse = await fetch(`https://graph.facebook.com/v22.0/${args.photoMediaId}`, { headers: { authorization: `Bearer ${botEnv.WHATSAPP_ACCESS_TOKEN}` } })
      const media = await mediaResponse.json() as { url?: string }
      if (!media.url) throw new Error("Media WhatsApp tidak ditemukan.")
      response = await fetch(media.url, { headers: { authorization: `Bearer ${botEnv.WHATSAPP_ACCESS_TOKEN}` } })
    }
    if (!response.ok) throw new Error("Gagal mengunduh foto kamar.")
    const storageId = await ctx.storage.store(await response.blob())
    const result = await ctx.runMutation(internal.bots.roomFlow.finalizeAddRoom, { ownerId: args.ownerId, stateId: args.stateId, storageId })
    const message = args.channel === "telegram"
      ? `✅ <b>Kamar ${result.roomNumber} ditambahkan</b>\n\nHarga: Rp ${result.monthlyRent.toLocaleString("id-ID")}/bulan\nStatus: Tersedia\nFoto kamar juga sudah disimpan.\n\nLengkapi fasilitas dan detail lain di dashboard: /dashboard/properties/${result.propertyId}`
      : `✅ *Kamar ${result.roomNumber} ditambahkan*\n\nHarga: Rp ${result.monthlyRent.toLocaleString("id-ID")}/bulan\nStatus: Tersedia\nFoto kamar juga sudah disimpan.\n\nLengkapi fasilitas dan detail lain di dashboard: /dashboard/properties/${result.propertyId}`
    if (args.channel === "telegram") {
      if (!botEnv.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
      await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, args.chatId, message, { parseMode: "HTML" })
    } else {
      if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) throw new Error("Kredensial WhatsApp belum dikonfigurasi.")
      await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, args.chatId, message)
    }
    return null
  },
})

export const sendAdminQueueNotice = internalAction({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const links = await ctx.runQuery(internal.notifications.getAdminBotLinks, {})
    let delivered = 0
    for (const link of links) {
      try {
        if (link.channel === "telegram" && botEnv.TELEGRAM_BOT_TOKEN) {
          await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, args.text, { parseMode: "HTML" })
          delivered += 1
        } else if (link.channel === "whatsapp" && botEnv.WHATSAPP_ACCESS_TOKEN && botEnv.WHATSAPP_PHONE_NUMBER_ID) {
          await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, args.text)
          delivered += 1
        }
      } catch (error) {
        console.error("Gagal mengirim antrean admin:", error)
      }
    }
    return { delivered }
  },
})
