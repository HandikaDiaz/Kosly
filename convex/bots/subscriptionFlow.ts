import { internalQuery } from "../_generated/server"
import { v } from "convex/values"

export const getSession = internalQuery({
  args: { sessionId: v.id("bot_sessions") },
  handler: async (ctx, args) => await ctx.db.get("bot_sessions", args.sessionId),
})
