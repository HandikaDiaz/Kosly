"use node"

import { env, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { hashToken } from "./lib/reviewRules"
import { mapWhatsAppError, sendWhatsAppNotification as dispatchWhatsAppNotification } from "./lib/whatsappNotification"

const botEnv = env as typeof env & Record<string, string | undefined>
const kindValidator = v.union(v.literal("owner_new_application"), v.literal("owner_application_reminder"), v.literal("owner_dp_claim"), v.literal("tenant_application_accepted"), v.literal("tenant_application_update"), v.literal("tenant_hold_reminder"), v.literal("tenant_review_invite"))

type ProviderError = Error & { status?: number; providerCode?: number }

const postWhatsApp = async (phoneNumberId: string, accessToken: string, body: Record<string, unknown>, apiVersion: string) => {
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify(body) })
  if (!response.ok) {
    let providerCode: number | undefined
    try { const payload = await response.json() as { error?: { code?: number } }; providerCode = payload.error?.code } catch { /* provider response is intentionally not logged */ }
    const error = new Error("WhatsApp Cloud API gagal") as ProviderError
    error.status = response.status
    error.providerCode = providerCode
    throw error
  }
  const payload = await response.json() as { messages?: Array<{ id?: string }> }
  return payload.messages?.[0]?.id
}

export const sendWhatsAppNotification = internalAction({
  args: {
    toPhoneE164: v.string(), kind: kindValidator, params: v.record(v.string(), v.string()), fallbackText: v.string(), idempotencyKey: v.string(), buttonParam: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = args.toPhoneE164.replace(/\D/g, "")
    const phoneHash = await hashToken(normalizedPhone)
    const base = { kind: args.kind, idempotencyKey: args.idempotencyKey }
    if (normalizedPhone.length < 9) {
      await ctx.runMutation(internal.whatsappState.recordDelivery, { ...base, phoneHash, at: Date.now(), mode: "skipped", ok: false, errorCode: "nomor_tidak_valid" })
      return { mode: "skipped" as const, ok: false, errorCode: "nomor_tidak_valid" }
    }
    const attempted = await ctx.runQuery(internal.whatsappState.hasDeliveryAttempt, base)
    const lastInboundAt = (await ctx.runQuery(internal.whatsappState.getWindow, { phoneHash })) ?? undefined
    const accessToken = botEnv.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = botEnv.WHATSAPP_PHONE_NUMBER_ID
    const apiVersion = botEnv.WHATSAPP_GRAPH_API_VERSION ?? "v22.0"
    const result = await dispatchWhatsAppNotification({ ...args, toPhoneE164: normalizedPhone }, {
      now: Date.now(), phoneHash, lastInboundAt, templatesEnabled: botEnv.WHATSAPP_TEMPLATES_ENABLED !== "false", alreadyAttempted: attempted,
      sendText: async (text) => {
        if (!accessToken || !phoneNumberId) throw new Error("Kredensial WhatsApp belum tersedia")
        try { return await postWhatsApp(phoneNumberId, accessToken, { messaging_product: "whatsapp", to: normalizedPhone, type: "text", text: { preview_url: false, body: text } }, apiVersion) } catch (cause) { const error = cause as ProviderError; throw Object.assign(error, { mapped: mapWhatsAppError(error.status, error.providerCode) }) }
      },
      sendTemplate: async (template) => {
        if (!accessToken || !phoneNumberId) throw new Error("Kredensial WhatsApp belum tersedia")
        try { return await postWhatsApp(phoneNumberId, accessToken, { messaging_product: "whatsapp", to: normalizedPhone, type: "template", template }, apiVersion) } catch (cause) { const error = cause as ProviderError; throw Object.assign(error, { mapped: mapWhatsAppError(error.status, error.providerCode) }) }
      },
      record: async (entry) => { await ctx.runMutation(internal.whatsappState.recordDelivery, { ...base, phoneHash, at: Date.now(), ...entry }) },
      incrementStats: async (mode, kind) => { await ctx.runMutation(internal.whatsappState.incrementStats, { date: new Date().toISOString().slice(0, 10), mode, kind }) },
    })
    return result
  },
})
