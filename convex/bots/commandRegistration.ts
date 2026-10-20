"use node"

import { action, env } from "../_generated/server"
import { api } from "../_generated/api"
import { v } from "convex/values"
import { registerTelegramCommands } from "./telegram"
import { registerWhatsAppCommands } from "./whatsapp"

const botEnv = env as typeof env & Record<string, string | undefined>

/**
 * Registers the shared owner command list on both messaging platforms.
 * This action is intentionally manual and admin-only, so deployments do not
 * repeatedly mutate provider configuration.
 */
export const registerCommands = action({
  args: {},
  returns: v.object({ telegram: v.boolean(), whatsapp: v.boolean() }),
  handler: async (ctx) => {
    const role = await ctx.runQuery(api.owners.getCurrentRole, {})
    if (role !== "admin") throw new Error("Akses admin ditolak.")

    const telegramToken = botEnv.TELEGRAM_BOT_TOKEN
    const whatsappToken = botEnv.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = botEnv.WHATSAPP_PHONE_NUMBER_ID
    if (!telegramToken || !whatsappToken || !phoneNumberId) {
      throw new Error("Kredensial Telegram dan WhatsApp belum lengkap di Convex.")
    }

    await registerTelegramCommands(telegramToken)
    await registerWhatsAppCommands(whatsappToken, phoneNumberId, botEnv.WHATSAPP_GRAPH_API_VERSION ?? "v22.0")
    return { telegram: true, whatsapp: true }
  },
})
