"use node"

import { internalAction } from "../_generated/server"
import { v } from "convex/values"
import { env } from "../_generated/server"
import { internal } from "../_generated/api"
import { sendTelegramText } from "./telegram"
import { sendWhatsAppImage, sendWhatsAppText } from "./whatsapp"
import type { TelegramReplyMarkup } from "./telegram"
import { resolveTenantReplyRoute } from "../lib/applicationReply"

const botEnv = env as typeof env & Record<string, string | undefined>
const markdownToTelegramHtml = (text: string) => text
  .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
  .replace(/_([^_\n]+)_/g, "<i>$1</i>")
  .replace(/`([^`\n]+)`/g, "<code>$1</code>")

export const sendResponse = internalAction({
  args: {
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    chatId: v.string(),
    ownerId: v.id("owners"),
    query: v.union(v.literal("status"), v.literal("unpaid"), v.literal("vacant")),
    status: v.optional(v.literal("query")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(internal.bots.queries.getResponse, {
      ownerId: args.ownerId,
      query: args.query,
      channel: args.channel,
      now: Date.now(),
    })
    if (args.channel === "telegram") {
      const token = botEnv.TELEGRAM_BOT_TOKEN
      if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
      await sendTelegramText(token, args.chatId, message, { parseMode: "HTML" })
    } else {
      const accessToken = botEnv.WHATSAPP_ACCESS_TOKEN
      const phoneNumberId = botEnv.WHATSAPP_PHONE_NUMBER_ID
      if (!accessToken || !phoneNumberId) throw new Error("Kredensial WhatsApp belum dikonfigurasi.")
      await sendWhatsAppText(accessToken, phoneNumberId, args.chatId, message)
    }
    return null
  },
})

export const sendTextResponse = internalAction({
  args: {
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    chatId: v.string(),
    text: v.string(),
    replyMarkup: v.optional(v.union(
      v.object({ inline_keyboard: v.array(v.array(v.object({ text: v.string(), callback_data: v.string() }))) }),
      v.object({
        keyboard: v.array(v.array(v.object({
          text: v.string(),
          request_location: v.optional(v.boolean()),
          request_contact: v.optional(v.boolean()),
        }))),
        resize_keyboard: v.optional(v.boolean()),
        one_time_keyboard: v.optional(v.boolean()),
      }),
      v.object({
        remove_keyboard: v.boolean(),
      })
    )),
  },
  handler: async (_ctx, args) => {
    if (args.channel === "telegram") {
      if (!botEnv.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
      await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, args.chatId, markdownToTelegramHtml(args.text), { parseMode: "HTML", replyMarkup: args.replyMarkup as TelegramReplyMarkup | undefined })
    } else {
      if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) throw new Error("Kredensial WhatsApp belum dikonfigurasi.")
      await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, args.chatId, args.text)
    }
    return null
  },
})

export const sendImageResponse = internalAction({
  args: {
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    chatId: v.string(),
    text: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (args.channel === "whatsapp") {
      if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) return null
      if (args.imageUrl) {
        try {
          await sendWhatsAppImage(
            botEnv.WHATSAPP_ACCESS_TOKEN,
            botEnv.WHATSAPP_PHONE_NUMBER_ID,
            args.chatId,
            args.imageUrl,
            args.text
          )
          return null
        } catch (e) {
          console.warn("sendWhatsAppImage failed, fallback to sendWhatsAppText:", e)
        }
      }
      await sendWhatsAppText(
        botEnv.WHATSAPP_ACCESS_TOKEN,
        botEnv.WHATSAPP_PHONE_NUMBER_ID,
        args.chatId,
        args.text
      )
    }
    return null
  },
})

export const sendApplicationOwnerNotice = internalAction({
    args: { ownerId: v.id("owners"), text: v.string(), applicationId: v.id("rentalApplications"), kind: v.union(v.literal("owner_new_application"), v.literal("owner_application_reminder")), params: v.record(v.string(), v.string()) },
  handler: async (ctx, args) => {
    const links = await ctx.runQuery(internal.notifications.getOwnerBotLinks, { ownerId: args.ownerId })
    for (const link of links) {
      try {
        if (link.channel === "telegram" && botEnv.TELEGRAM_BOT_TOKEN) await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, link.chatId, args.text, { parseMode: "HTML" })
        if (link.channel === "whatsapp") await ctx.runAction(internal.whatsappDelivery.sendWhatsAppNotification, { toPhoneE164: link.chatId, kind: args.kind, params: args.params, fallbackText: args.text, idempotencyKey: `application:${args.applicationId}:${args.kind}` })
      } catch { console.error("Gagal mengirim notifikasi pengajuan ke pemilik") }
    }
    return null
  },
})

export const sendApplicationTenantNotice = internalAction({
  args: {
    application: v.object({ channel: v.union(v.literal("telegram"), v.literal("whatsapp")), replyChatId: v.optional(v.string()), applicantPhoneE164: v.optional(v.string()), anonymizedAt: v.optional(v.number()) }),
    applicationId: v.id("rentalApplications"),
    text: v.string(),
    kind: v.optional(v.union(v.literal("tenant_application_accepted"), v.literal("tenant_application_update"), v.literal("tenant_hold_reminder"))),
    params: v.optional(v.record(v.string(), v.string())),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const route = resolveTenantReplyRoute(args.application)
    if (!route) return { delivered: false, skipped: true }
    const code = args.text.match(/pengajuan\s+([A-Z0-9-]+)/i)?.[1] ?? "pengajuan"
    const notificationKind = args.kind ?? (args.text.includes("Pengingat") ? "tenant_hold_reminder" : args.text.includes("diterima") ? "tenant_application_accepted" : "tenant_application_update")
    const notificationParams = args.params ?? (notificationKind === "tenant_application_accepted" ? { kode: code, batasWaktu: args.text.match(/sampai\s+(.+?)\s+WIB/i)?.[1] ?? "batas waktu hold" } : notificationKind === "tenant_hold_reminder" ? { kode: code, batasWaktu: args.text.match(/pada\s+(.+?)\s+WIB/i)?.[1] ?? "batas waktu hold" } : { kode: code })
    try {
      if (route.channel === "telegram") {
        if (!botEnv.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
        await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, route.address, markdownToTelegramHtml(args.text), { parseMode: "HTML" })
      } else {
        const result = await ctx.runAction(internal.whatsappDelivery.sendWhatsAppNotification, { toPhoneE164: route.address, kind: notificationKind, params: notificationParams, fallbackText: args.text, idempotencyKey: args.idempotencyKey ?? `application:${args.applicationId}:${notificationKind}` })
        if (!result.ok) throw new Error(result.errorCode ?? "Pengiriman gagal.")
      }
      return { delivered: true, skipped: false }
    } catch (error) {
      console.error("Gagal mengirim notifikasi status pengajuan")
      return { delivered: false, skipped: false }
    }
  },
})
