import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAdmin } from "./lib/auth"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { cleanReportNote, MAX_REPORTS_GLOBAL_PER_HOUR, MAX_REPORTS_PER_PROPERTY_PER_DAY, isAdminPriority, ADMIN_PRIORITY_WINDOW_DAYS, REPORT_REASONS } from "./lib/ownerTrustRules"

const GENERIC_REPORT_FAILURE = "Laporan tidak dapat diproses."
const reasonValidator = v.string()

const statusValidator = v.union(v.literal("open"), v.literal("reviewed"), v.literal("resolved"))

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").take(100)
  },
})

export const listPropertyReports = query({
  args: { reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const rows = await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").take(100)
    const reports = []
    for (const row of rows) {
      if (row.reportType !== "property_report" || (args.reason && row.reason !== args.reason)) continue
      const property = row.propertyId ? await ctx.db.get("properties", row.propertyId) : null
      reports.push({ id: row._id, propertyId: row.propertyId, propertyName: property?.name ?? "Properti tidak ditemukan", reason: row.reason ?? "lainnya", note: row.note ?? null, createdAt: row.createdAt ?? row._creationTime, flaggedForAdmin: row.flaggedForAdmin === true, suspended: property?.publicSuspended === true })
    }
    return { reports, counts: { total: reports.length, priority: reports.filter((report) => report.flaggedForAdmin).length } }
  },
})

export const reportProperty = mutation({
  args: { slug: v.string(), reason: reasonValidator, note: v.optional(v.string()) },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    try {
      if (!REPORT_REASONS.includes(args.reason as (typeof REPORT_REASONS)[number])) throw new Error(GENERIC_REPORT_FAILURE)
      const property = await ctx.db.query("properties").withIndex("by_public_slug", (q) => q.eq("publicSlug", args.slug.trim().toLowerCase())).unique()
      if (!property || property.isPublished !== true || !property.isActive || property.lockedByTier || property.publicSuspended) throw new Error(GENERIC_REPORT_FAILURE)
      const now = Date.now()
      const propertyReports = await ctx.db.query("reports").withIndex("by_property_and_created", (q) => q.eq("propertyId", property._id).gte("createdAt", now - 86_400_000)).take(MAX_REPORTS_PER_PROPERTY_PER_DAY + 1)
      const globalReports = await ctx.db.query("reports").withIndex("by_type_and_created", (q) => q.eq("reportType", "property_report").gte("createdAt", now - 3_600_000)).take(MAX_REPORTS_GLOBAL_PER_HOUR + 1)
      if (propertyReports.length >= MAX_REPORTS_PER_PROPERTY_PER_DAY || globalReports.length >= MAX_REPORTS_GLOBAL_PER_HOUR) throw new Error(GENERIC_REPORT_FAILURE)
      const note = cleanReportNote(args.note)
      if (note === null) throw new Error(GENERIC_REPORT_FAILURE)
      const recentFraud = await ctx.db.query("reports").withIndex("by_type_and_created", (q) => q.eq("reportType", "property_report").gte("createdAt", now - ADMIN_PRIORITY_WINDOW_DAYS * 86_400_000)).take(1000)
      const fraudCount = recentFraud.filter((report) => report.propertyId === property._id && report.reason === "penipuan_dp").length + (args.reason === "penipuan_dp" ? 1 : 0)
      await ctx.db.insert("reports", { propertyId: property._id, description: "Laporan publik properti", status: "open", reportType: "property_report", reason: args.reason, note: note ?? undefined, createdAt: now, ...(isAdminPriority(fraudCount) ? { flaggedForAdmin: true, adminPriorityAt: now } : {}) })
      return { ok: true as const }
    } catch {
      throw new Error(GENERIC_REPORT_FAILURE)
    }
  },
})

export const adminSetPropertySuspension = mutation({
  args: { propertyId: v.id("properties"), suspended: v.boolean(), reason: v.optional(v.string()) },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const property = await ctx.db.get("properties", args.propertyId)
    if (!property) throw new Error("Properti tidak ditemukan.")
    const reason = args.reason?.trim().slice(0, 500) || undefined
    await ctx.db.patch("properties", property._id, { publicSuspended: args.suspended, publicSuspensionReason: args.suspended ? reason : undefined, publicSuspendedAt: args.suspended ? Date.now() : undefined })
    await ctx.db.insert("reports", { propertyId: property._id, description: args.suspended ? "Admin menangguhkan halaman publik properti." : "Admin membatalkan penangguhan halaman publik properti.", status: "resolved", reportType: "owner_report", reviewedByOwnerId: admin._id, reviewedAt: Date.now(), resolutionNote: reason })
    return { ok: true as const }
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
