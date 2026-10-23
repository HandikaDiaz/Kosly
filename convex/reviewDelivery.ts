"use node"

import { env, internalAction } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { buildReviewInvitationMessage, buildReviewUrl, type ReviewInvitationReason } from "./lib/reviewDelivery"

const botEnv = env as typeof env & Record<string, string | undefined>

export const sendReviewInvitation = internalAction({
  args: { tenancyId: v.id("tenants"), reason: v.union(v.literal("moveout"), v.literal("active90")) },
  handler: async (ctx, args) => {
    const state = await ctx.runQuery(internal.reviews.getReviewDeliveryStatus, { tenancyId: args.tenancyId })
    if (state.delivered || state.attempts >= 3) return { delivered: false, skipped: true }

    let created: { token: string; invitationId: Id<"reviewInvitations"> }
    try {
      created = await ctx.runMutation(internal.reviews.createReviewInvitation, { tenancyId: args.tenancyId })
    } catch {
      return { delivered: false, skipped: true }
    }

    try {
      const target = await ctx.runQuery(internal.reviews.getReviewDeliveryTarget, { tenancyId: args.tenancyId })
      if (!target) throw new Error("Kanal WhatsApp penyewa tidak tersedia.")
      const url = buildReviewUrl(botEnv.APP_BASE_URL, created.token)
      const message = buildReviewInvitationMessage({ propertyName: target.propertyName, reason: args.reason as ReviewInvitationReason, url })
      const result = await ctx.runAction(internal.whatsappDelivery.sendWhatsAppNotification, { toPhoneE164: target.phone, kind: "tenant_review_invite", params: { kos: target.propertyName }, fallbackText: message, idempotencyKey: `review:${created.invitationId}`, buttonParam: created.token })
      if (result.ok) {
        await ctx.runMutation(internal.reviews.recordReviewInvitationDelivery, { invitationId: created.invitationId, success: true, channel: "whatsapp" })
        return { delivered: true, skipped: false }
      }
      throw new Error(result.errorCode ?? "Pengiriman gagal.")
    } catch (error) {
      await ctx.runMutation(internal.reviews.revokeReviewInvitation, { invitationId: created.invitationId })
      await ctx.runMutation(internal.reviews.recordReviewInvitationDelivery, { invitationId: created.invitationId, success: false, channel: "whatsapp", error: error instanceof Error ? error.message : "Pengiriman gagal." })
      return { delivered: false, skipped: false }
    }
  },
})
