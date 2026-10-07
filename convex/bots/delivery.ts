"use node"

import { env, internalAction } from "../_generated/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { createPaymentReference } from "./commands"
import { sendTelegramPaymentProof, sendTelegramPaymentReview, sendTelegramText } from "./telegram"
import { sendWhatsAppPaymentReview } from "./whatsapp"

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
