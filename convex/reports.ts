import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin } from "./lib/auth"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

const statusValidator = v.union(v.literal("open"), v.literal("reviewed"), v.literal("resolved"))

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").take(100)
  },
})

export const updateStatusForAdmin = async (ctx: MutationCtx, adminId: Id<"owners">, args: { reportId: Id<"reports">; status: "reviewed" | "resolved"; resolutionNote?: string }) => {
    const report = await ctx.db.get("reports", args.reportId)
    if (!report) throw new Error("Laporan tidak ditemukan.")
    if (report.status === "resolved") throw new Error("Laporan sudah selesai.")
    await ctx.db.patch("reports", report._id, { status: args.status, reviewedByOwnerId: adminId, reviewedAt: Date.now(), resolutionNote: args.resolutionNote?.trim() || undefined })
    return null
}

export const updateStatus = mutation({
  args: { reportId: v.id("reports"), status: statusValidator, resolutionNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status === "open") throw new Error("Status laporan hanya dapat bergerak ke reviewed atau resolved.")
    const admin = await requireAdmin(ctx)
    return await updateStatusForAdmin(ctx, admin._id, { ...args, status: args.status as "reviewed" | "resolved" })
  },
})
