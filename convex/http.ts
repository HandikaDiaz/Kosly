import { httpAction, env } from "./_generated/server"
import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { normalizeTelegramUpdate, normalizeWhatsAppEvent, verifyTelegramSecret, verifyWhatsAppChallenge, verifyWhatsAppSignature } from "./bots/webhooks"
import { answerTelegramCallback } from "./bots/telegram"
import { auth } from "./auth"

const http = httpRouter()
auth.addHttpRoutes(http)
const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === "object" && value !== null ? value as Record<string, unknown> : null
const botEnv = env as typeof env & Record<string, string | undefined>

http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyTelegramSecret(botEnv.TELEGRAM_WEBHOOK_SECRET, request.headers.get("x-telegram-bot-api-secret-token") ?? undefined)) return new Response("Unauthorized", { status: 401 })
    const body = asRecord(await request.json())
    const event = body ? normalizeTelegramUpdate(body) : null
    if (!event) return new Response("Ignored", { status: 200 })
    const result = await ctx.runMutation(internal.bots.processor.processEvent, event)
    if (event.callbackQueryId && botEnv.TELEGRAM_BOT_TOKEN) {
      const callbackText = result.status === "confirmed" ? "Pembayaran dikonfirmasi." : result.status === "rejected" ? "Pembayaran ditolak." : result.status === "invalid" ? "Pembayaran tidak ditemukan atau sudah diproses." : "Perintah diterima."
      try {
        await answerTelegramCallback(botEnv.TELEGRAM_BOT_TOKEN, event.callbackQueryId, callbackText)
      } catch (err) {
        console.error("Failed to answer telegram callback:", err)
      }
    }
    if (result.status === "query") await ctx.runAction(internal.bots.queryDelivery.sendResponse, { channel: result.channel, chatId: result.chatId, ownerId: result.ownerId, query: result.query })
    return new Response("OK", { status: 200 })
  }),
})

http.route({
  path: "/whatsapp/webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url)
    const challenge = verifyWhatsAppChallenge(url.searchParams.get("hub.mode"), url.searchParams.get("hub.verify_token"), url.searchParams.get("hub.challenge"), botEnv.WHATSAPP_VERIFY_TOKEN)
    return challenge ? new Response(challenge, { status: 200 }) : new Response("Forbidden", { status: 403 })
  }),
})

http.route({
  path: "/whatsapp/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text()
    if (!await verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256") ?? undefined, botEnv.META_APP_SECRET)) return new Response("Unauthorized", { status: 401 })
    let parsed: unknown
    try { parsed = JSON.parse(rawBody) } catch { return new Response("Bad Request", { status: 400 }) }
    const event = normalizeWhatsAppEvent(asRecord(parsed) ?? {})
    if (!event) return new Response("Ignored", { status: 200 })
    const result = await ctx.runMutation(internal.bots.processor.processEvent, event)
    if (result.status === "query") await ctx.runAction(internal.bots.queryDelivery.sendResponse, { channel: result.channel, chatId: result.chatId, ownerId: result.ownerId, query: result.query })
    return new Response("OK", { status: 200 })
  }),
})

export default http
