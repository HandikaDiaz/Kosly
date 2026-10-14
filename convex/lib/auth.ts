import type { Id } from "../_generated/dataModel"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

type AuthCtx = QueryCtx | MutationCtx

export const getLinkedUserId = async (ctx: AuthCtx) => {
  try {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await ctx.db.get("users", userId))) return null
    return userId
  } catch {
    return null
  }
}

export const requireIdentity = async (ctx: AuthCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Anda harus masuk untuk melanjutkan.")
  }
  return identity
}

const selectPreferredOwner = (owners: Doc<"owners">[]) => owners.sort((left, right) => {
  const adminScore = Number(right.role === "admin") - Number(left.role === "admin")
  if (adminScore !== 0) return adminScore
  const onboardingScore = Number(Boolean(right.onboardingCompleted)) - Number(Boolean(left.onboardingCompleted))
  if (onboardingScore !== 0) return onboardingScore
  return right._creationTime - left._creationTime
})[0] ?? null

export const findOwnerForIdentity = async (ctx: AuthCtx, identity: Awaited<ReturnType<typeof requireIdentity>>) => {
  const userId = await getLinkedUserId(ctx)
  if (userId) {
    const linkedOwners = await ctx.db.query("owners").withIndex("by_user_id", (q) => q.eq("userId", userId)).take(10)
    const linkedOwner = selectPreferredOwner(linkedOwners)
    if (linkedOwner) return linkedOwner
  }

  const tokenOwners = await ctx.db.query("owners").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).take(10)
  const tokenOwner = selectPreferredOwner(tokenOwners)
  if (tokenOwner) return tokenOwner

  if (identity.email) {
    const emailOwners = await ctx.db.query("owners").withIndex("by_email", (q) => q.eq("email", identity.email)).take(10)
    return selectPreferredOwner(emailOwners)
  }

  return null
}

export const requireOwner = async (ctx: AuthCtx) => {
  const identity = await requireIdentity(ctx)
  const owner = await findOwnerForIdentity(ctx, identity)
  if (!owner) {
    throw new Error("Profil pemilik belum tersedia.")
  }
  return owner
}

export const requireAdmin = async (ctx: AuthCtx): Promise<Doc<"owners">> => {
  const owner = await requireOwner(ctx)
  if (owner.role !== "admin") throw new Error("Akses admin ditolak.")
  return owner
}

export const requirePropertyOwner = async (ctx: AuthCtx, propertyId: Id<"properties">) => {
  const owner = await requireOwner(ctx)
  const property = await ctx.db.get("properties", propertyId)
  if (!property || property.ownerId !== owner._id) {
    throw new Error("Properti tidak ditemukan.")
  }
  return { owner, property }
}
