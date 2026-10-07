import { defineApp } from "convex/server"
import { v } from "convex/values"

const app = defineApp({
  env: {
    AUTH_GOOGLE_ID: v.optional(v.string()),
    AUTH_GOOGLE_SECRET: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
    TELEGRAM_BOT_TOKEN: v.optional(v.string()),
    TELEGRAM_WEBHOOK_SECRET: v.optional(v.string()),
    WHATSAPP_ACCESS_TOKEN: v.optional(v.string()),
    WHATSAPP_PHONE_NUMBER_ID: v.optional(v.string()),
    WHATSAPP_VERIFY_TOKEN: v.optional(v.string()),
    META_APP_SECRET: v.optional(v.string()),
  },
})

export default app
