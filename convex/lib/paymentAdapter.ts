import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"
import type { PaymentPeriod } from "./raporRules"
import { isRentPayment } from "./paymentClassification"
import { isTenantDataVerified } from "./tenantImport"

export type PaymentAdapterCtx = QueryCtx | MutationCtx

export const toPaymentPeriod = (charge: Doc<"rent_charges">, payment: Doc<"payments"> | null): PaymentPeriod => ({
  periodId: String(charge._id),
  tenancyId: String(charge.tenantId),
  dueDate: charge.dueDate,
  paidAt: payment && isRentPayment(payment) ? charge.paidAt : undefined,
  confirmed: charge.status === "paid" && Boolean(payment && isRentPayment(payment)),
})

export const listPaymentPeriodsForTenancy = async (ctx: PaymentAdapterCtx, tenancyId: Id<"tenants">): Promise<PaymentPeriod[]> => {
  const tenant = await ctx.db.get("tenants", tenancyId)
  if (!tenant || !isTenantDataVerified(tenant)) return []
  const charges = await ctx.db.query("rent_charges").withIndex("by_tenant_and_period", (q) => q.eq("tenantId", tenancyId)).take(100)
  return Promise.all(charges.map(async (charge) => toPaymentPeriod(charge, charge.paymentId ? await ctx.db.get("payments", charge.paymentId) : null)))
}

