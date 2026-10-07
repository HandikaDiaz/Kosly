import { internalMutation } from "../_generated/server"
import { v } from "convex/values"
import { normalizeChatId } from "../botLinks"
import { confirmPaymentForOwner, rejectPaymentForOwner } from "../payments"
import { createPaymentReference, parseBotCommand } from "./commands"
import { parseQueryCommand } from "./queries"

export const processEvent = internalMutation({
  args: { channel: v.union(v.literal("telegram"), v.literal("whatsapp")), eventId: v.string(), chatId: v.string(), text: v.optional(v.string()), callbackAction: v.optional(v.union(v.literal("confirm"), v.literal("reject"))), callbackReference: v.optional(v.string()), callbackQueryId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db.query("notification_log").withIndex("by_provider_event", (q) => q.eq("providerEventId", args.eventId)).unique()
    if (duplicate) return { status: "duplicate" as const }
    const chatId = normalizeChatId(args.channel, args.chatId)
    const links = await ctx.db.query("bot_links").withIndex("by_channel_and_chat_id", (q) => q.eq("channel", args.channel).eq("chatId", chatId)).take(10)
    const link = links.find((item) => item.status === "active") ?? (await ctx.db.query("bot_links").withIndex("by_channel_and_chat_id", (q) => q.eq("channel", args.channel)).take(100)).find((item) => item.chatId === chatId && item.status === "active")
    if (!link) return { status: "invalid" as const }
    const query = args.callbackAction ? "invalid" : parseQueryCommand(args.text ?? "")
    if (query === "status" || query === "unpaid" || query === "vacant") return { status: "query" as const, query, ownerId: link.ownerId, channel: args.channel, chatId }
    const parsed = args.callbackAction && args.callbackReference ? { kind: args.callbackAction, reference: args.callbackReference, reason: "Ditolak melalui bot Telegram." } : parseBotCommand(args.text ?? "")
    if (parsed.kind === "help" || parsed.kind === "invalid") return { status: "invalid" as const }

    const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", link.ownerId)).collect()
    let payment = null
    for (const property of properties) {
      const pendingPayments = await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id).eq("status", "pending_review")).order("desc").take(50)
      for (const candidate of pendingPayments) {
        if (createPaymentReference(String(candidate._id)) === parsed.reference) {
          payment = candidate
          break
        }
      }
      if (payment) break

      const recentPayments = await ctx.db.query("payments").withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id)).order("desc").take(50)
      for (const candidate of recentPayments) {
        if (createPaymentReference(String(candidate._id)) === parsed.reference) {
          payment = candidate
          break
        }
      }
      if (payment) break
    }

    if (!payment) {
      const allPayments = await ctx.db.query("payments").order("desc").take(500)
      for (const candidate of allPayments) {
        if (createPaymentReference(String(candidate._id)) !== parsed.reference) continue
        const property = await ctx.db.get("properties", candidate.propertyId)
        if (property?.ownerId === link.ownerId) {
          payment = candidate
          break
        }
      }
    }

    if (!payment || payment.status !== "pending_review") return { status: "invalid" as const }
    const event = { ownerId: link.ownerId, propertyId: payment.propertyId, tenantId: payment.tenantId, type: "payment_uploaded" as const, channel: args.channel, occurredOn: new Date().toISOString().slice(0, 10), status: "logged" as const, payload: JSON.stringify({ action: parsed.kind, reference: parsed.reference }), providerEventId: args.eventId, actionReference: parsed.reference }
    try {
      if (parsed.kind === "confirm") await confirmPaymentForOwner(ctx, payment._id, link.ownerId)
      else await rejectPaymentForOwner(ctx, payment._id, link.ownerId, parsed.reason ?? "Ditolak melalui bot.")
      await ctx.db.insert("notification_log", event)
      await ctx.db.patch("bot_links", link._id, { lastSeenAt: Date.now() })
      return { status: parsed.kind === "confirm" ? "confirmed" as const : "rejected" as const }
    } catch {
      return { status: "invalid" as const }
    }
  },
})
