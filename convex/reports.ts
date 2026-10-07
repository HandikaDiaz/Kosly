import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin } from "./lib/auth"

const statusValidator = v.union(v.literal("open"), v.literal("reviewed"), v.literal("resolved"))

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").take(100)
  },
})

export const updateStatus = mutation({
  args: { reportId: v.id("reports"), status: statusValidator, resolutionNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const report = await ctx.db.get("reports", args.reportId)
    if (!report) throw new Error("Laporan tidak ditemukan.")
    if (report.status === "resolved") throw new Error("Laporan sudah selesai.")
    if (args.status === "open") throw new Error("Status laporan hanya dapat bergerak ke reviewed atau resolved.")
    await ctx.db.patch("reports", report._id, { status: args.status, reviewedByOwnerId: admin._id, reviewedAt: Date.now(), resolutionNote: args.resolutionNote?.trim() || undefined })
    return null
  },
})
