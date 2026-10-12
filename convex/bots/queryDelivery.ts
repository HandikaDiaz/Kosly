"use node"

import { internalAction } from "../_generated/server"
import { v } from "convex/values"
import { env } from "../_generated/server"
import { internal } from "../_generated/api"
import { sendTelegramText } from "./telegram"
import { sendWhatsAppText } from "./whatsapp"
import type { TelegramReplyMarkup } from "./telegram"

const botEnv = env as typeof env & Record<string, string | undefined>

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
    replyMarkup: v.optional(v.object({ inline_keyboard: v.array(v.array(v.object({ text: v.string(), callback_data: v.string() }))) })),
  },
  handler: async (_ctx, args) => {
    if (args.channel === "telegram") {
      if (!botEnv.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.")
      await sendTelegramText(botEnv.TELEGRAM_BOT_TOKEN, args.chatId, args.text, { parseMode: "HTML", replyMarkup: args.replyMarkup as TelegramReplyMarkup | undefined })
    } else {
      if (!botEnv.WHATSAPP_ACCESS_TOKEN || !botEnv.WHATSAPP_PHONE_NUMBER_ID) throw new Error("Kredensial WhatsApp belum dikonfigurasi.")
      await sendWhatsAppText(botEnv.WHATSAPP_ACCESS_TOKEN, botEnv.WHATSAPP_PHONE_NUMBER_ID, args.chatId, args.text)
    }
    return null
  },
})
