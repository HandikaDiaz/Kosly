import { internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { OWNER_RESPONSE_HOURS } from "./lib/applicationRules"
import { computeResponseBucket, RESPONSE_WINDOW_DAYS } from "./lib/ownerTrustRules"

const monthLabel = (timestamp: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date(timestamp))

export const recomputeAll = internalMutation({
  args: {},
  returns: v.object({ processed: v.number() }),
  handler: async (ctx) => {
    const now = Date.now()
    const since = now - RESPONSE_WINDOW_DAYS * 86_400_000
    const owners = await ctx.db.query("owners").take(500)
    let processed = 0
    for (const owner of owners) {
      const properties = await ctx.db.query("properties").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).take(100)
      const tenants = (await Promise.all(properties.map((property) => ctx.db.query("tenants").withIndex("by_property", (q) => q.eq("propertyId", property._id)).take(100)))).flat()
      const applications = (await Promise.all(properties.map((property) => ctx.db.query("rentalApplications").withIndex("by_property_and_created", (q) => q.eq("propertyId", property._id).gte("createdAt", since)).take(200)))).flat()
      const decided = applications.filter((application) => application.createdAt >= since && application.ownerRespondedAt !== undefined)
      const expired = applications.filter((application) => application.createdAt >= since && application.status === "expired_no_response")
      const responseHours = [...decided.map((application) => Math.max(0, (application.ownerRespondedAt! - application.createdAt) / 3_600_000)), ...expired.map(() => OWNER_RESPONSE_HOURS)]
      const existing = await ctx.db.query("ownerPublicStats").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).unique()
      const responseBucket = computeResponseBucket(responseHours)
      const value = { ownerId: owner._id, joinedMonth: monthLabel(owner.createdAt ?? owner._creationTime), tenancyCount: tenants.filter((tenant) => tenant.status === "active" || tenant.status === "inactive").length, responseSampleCount: responseHours.length, updatedAt: now, ...(responseBucket ? { responseBucket } : {}) }
      if (existing) await ctx.db.replace("ownerPublicStats", existing._id, value)
      else await ctx.db.insert("ownerPublicStats", value)
      processed += 1
    }
    return { processed }
  },
})
