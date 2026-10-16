import { v } from "convex/values"
import { internalQuery, internalMutation, httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

const fileTypeValidator = v.union(v.literal("ktp"), v.literal("selfie"), v.literal("ownership_proof"))
type SensitiveFileType = "ktp" | "selfie" | "ownership_proof"

export const resolveAccess = internalQuery({
  args: { tokenIdentifier: v.string(), storageId: v.id("_storage"), fileType: fileTypeValidator },
  handler: async (ctx, args) => {
    const requester = await ctx.db.query("owners").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique()
    if (!requester) return null
    if (args.fileType === "ktp" || args.fileType === "selfie") {
      const owner = args.fileType === "ktp"
        ? await ctx.db.query("owners").withIndex("by_ktp_storage", (q) => q.eq("ktpStorageId", args.storageId)).unique()
        : await ctx.db.query("owners").withIndex("by_selfie_storage", (q) => q.eq("selfieStorageId", args.storageId)).unique()
      if (!owner || (requester.role !== "admin" && requester._id !== owner._id)) return null
      return { ownerId: owner._id, accessedBy: requester._id }
    }
    const property = await ctx.db.query("properties").withIndex("by_ownership_proof_storage", (q) => q.eq("ownershipProofStorageId", args.storageId)).unique()
    if (!property || (requester.role !== "admin" && requester._id !== property.ownerId)) return null
    return { ownerId: property.ownerId, accessedBy: requester._id }
  },
})

export const logAccess = internalMutation({
  args: { accessedBy: v.id("owners"), fileType: fileTypeValidator, ownerId: v.id("owners"), accessedAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("sensitive_file_access_log", args)
    return null
  },
})

const responseHeaders = { "cache-control": "no-store, private", "x-content-type-options": "nosniff" }
const headersFor = (request: Request, contentType?: string) => ({
  ...responseHeaders,
  ...(request.headers.get("origin") ? { "access-control-allow-origin": request.headers.get("origin")!, "access-control-allow-credentials": "true", vary: "Origin" } : {}),
  ...(contentType ? { "content-type": contentType } : {}),
})

export const serve = httpAction(async (ctx, request) => {
  const url = new URL(request.url)
  const storageId = url.searchParams.get("storageId") as Id<"_storage"> | null
  const fileType = url.searchParams.get("fileType") as SensitiveFileType | null
  if (!storageId || !fileType || !["ktp", "selfie", "ownership_proof"].includes(fileType)) return new Response("Bad Request", { status: 400, headers: headersFor(request) })
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return new Response("Forbidden", { status: 403, headers: headersFor(request) })
  const access = await ctx.runQuery(internal.sensitiveFiles.resolveAccess, { tokenIdentifier: identity.tokenIdentifier, storageId, fileType })
  if (!access) return new Response("Forbidden", { status: 403, headers: headersFor(request) })
  const blob = await ctx.storage.get(storageId)
  if (!blob) return new Response("Not Found", { status: 404, headers: headersFor(request) })
  await ctx.runMutation(internal.sensitiveFiles.logAccess, { ...access, fileType, accessedAt: Date.now() })
  return new Response(blob, { status: 200, headers: headersFor(request, blob.type || "application/octet-stream") })
})
