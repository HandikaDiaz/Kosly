import type { Id } from "../_generated/dataModel"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type AuthCtx = QueryCtx | MutationCtx

export const requireIdentity = async (ctx: AuthCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Anda harus masuk untuk melanjutkan.")
  }
  return identity
}

export const requireOwner = async (ctx: AuthCtx) => {
  const identity = await requireIdentity(ctx)
  const owner = await ctx.db
    .query("owners")
    .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique()
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
