import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOwner } from "./lib/auth"

export const normalizeChatId = (channel: "telegram" | "whatsapp", chatId: string) => channel === "whatsapp" ? chatId.replace(/[^0-9]/g, "") : chatId.trim()

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    return await ctx.db.query("bot_links").withIndex("by_owner_and_channel", (q) => q.eq("ownerId", owner._id)).take(10)
  },
})

export const connect = mutation({
  args: { channel: v.union(v.literal("telegram"), v.literal("whatsapp")), chatId: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const chatId = normalizeChatId(args.channel, args.chatId)
    if (!chatId) throw new Error("ID chat wajib diisi.")
    const existing = (await ctx.db.query("bot_links").withIndex("by_owner_and_channel", (q) => q.eq("ownerId", owner._id)).take(10)).find((link) => link.channel === args.channel)
    if (existing) {
      await ctx.db.patch("bot_links", existing._id, { chatId, status: "active", displayName: args.displayName?.trim(), lastSeenAt: Date.now() })
      return existing._id
    }
    return await ctx.db.insert("bot_links", { ownerId: owner._id, channel: args.channel, chatId, status: "active", displayName: args.displayName?.trim(), createdAt: Date.now() })
  },
})

export const disconnect = mutation({
  args: { channel: v.union(v.literal("telegram"), v.literal("whatsapp")) },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx)
    const link = (await ctx.db.query("bot_links").withIndex("by_owner_and_channel", (q) => q.eq("ownerId", owner._id)).take(10)).find((item) => item.channel === args.channel)
    if (link) await ctx.db.patch("bot_links", link._id, { status: "inactive" })
    return null
  },
})

export const resolve = internalQuery({
  args: { channel: v.union(v.literal("telegram"), v.literal("whatsapp")), chatId: v.string() },
  handler: async (ctx, args) => (await ctx.db.query("bot_links").withIndex("by_channel_and_chat_id", (q) => q.eq("channel", args.channel)).take(100)).find((item) => item.chatId === normalizeChatId(args.channel, args.chatId) && item.status === "active") ?? null,
})

export const touch = internalMutation({
  args: { linkId: v.id("bot_links") },
  handler: async (ctx, args) => { await ctx.db.patch("bot_links", args.linkId, { lastSeenAt: Date.now() }); return null },
})
