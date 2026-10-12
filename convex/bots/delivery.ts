"use node"

import { env, internalAction } from "../_generated/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { createPaymentReference } from "./commands"
import { sendTelegramPaymentProof, sendTelegramPaymentReview, sendTelegramText } from "./telegram"
import { sendWhatsAppPaymentReview, sendWhatsAppText } from "./whatsapp"

const botEnv = env as typeof env & Record<string, string | undefined>

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
          if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) {
            await ctx.runMutation(internal.notifications.recordDelivery, { paymentId: review.paymentId, ownerId: review.ownerId, channel: "whatsapp", status: "failed", errorMessage: "WHATSAPP_ACCESS_TOKEN atau WHATSAPP_PHONE_NUMBER_ID belum tersedia di Convex." })
            continue
          }
          const result = await sendWhatsAppPaymentReview(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, summary)
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
          await sendWhatsAppPaymentReview(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, link.chatId, { propertyName: "BotKos", roomNumber: "-", tenantName: "-", amount: "-", reference: "-" })
          delivered += 1
        }
      } catch (err) {
        console.error("Gagal kirim notifikasi reminder:", err)
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
      await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, args.chatId, "✅ Bukti transfer diterima. Pengajuan upgrade sudah masuk antrean review admin.")
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
    const message = "✅ Kamar " + result.roomNumber + " ditambahkan — Rp" + result.monthlyRent.toLocaleString("id-ID") + "/bulan, status Tersedia.\nFoto kamar juga sudah disimpan.\nLengkapi fasilitas & detail lain di dashboard: /dashboard/properties/" + result.propertyId
    if (args.channel === "telegram") {
      if (!botEnv.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
      await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, args.chatId, message)
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
