import { mutation, query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin } from "./lib/auth"

const GLOBAL_SETTINGS_KEY = "global"

/**
 * Returns whether pricing/subscription gating is currently enabled.
 * Defaults to false so new kos owners can try the app without limits.
 */
export const isPricingEnabled = async (ctx: Pick<QueryCtx, "db">): Promise<boolean> => {
  const settings = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
    .unique()
  return settings?.pricingEnabled ?? false
}

export const getPublicSettings = query({
  args: {},
  returns: v.object({
    pricingEnabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const pricingEnabled = await isPricingEnabled(ctx)
    return { pricingEnabled }
  },
})

export const setPricingEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.object({
    pricingEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique()

    if (existing) {
      await ctx.db.patch("appSettings", existing._id, {
        pricingEnabled: args.enabled,
        updatedAt: Date.now(),
        updatedByOwnerId: admin._id,
      })
    } else {
      await ctx.db.insert("appSettings", {
        key: GLOBAL_SETTINGS_KEY,
        pricingEnabled: args.enabled,
        updatedAt: Date.now(),
        updatedByOwnerId: admin._id,
      })
    }

    return { pricingEnabled: args.enabled }
  },
})
