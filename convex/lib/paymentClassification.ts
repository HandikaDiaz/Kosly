// Allow-list: only the existing full-payment type represents rent. New types
// must be added here deliberately before they can affect reviews or rapor.
export const RENT_PAYMENT_TYPES = ["full"] as const

const RENT_PAYMENT_PURPOSES = ["pelunasan", "sewa_bulanan"] as const

type PaymentLike = {
  status?: string
  paymentType?: string
  purpose?: string
  origin?: string
}

/**
 * Only confirmed rent payments count toward rent-based eligibility and reports.
 *
 * Legacy rows without paymentType are classified explicitly by their purpose:
 * pelunasan and sewa_bulanan were the rent purposes used by the existing
 * submission/payment flows; missing purpose is intentionally not inferred.
 */
export const isRentPayment = (payment: PaymentLike) => {
  if (payment.origin === "owner_import") return false
  if (payment.status !== "confirmed") return false
  if (payment.paymentType !== undefined) {
    return RENT_PAYMENT_TYPES.includes(payment.paymentType as (typeof RENT_PAYMENT_TYPES)[number]) &&
      (payment.purpose === undefined || RENT_PAYMENT_PURPOSES.includes(payment.purpose as (typeof RENT_PAYMENT_PURPOSES)[number]))
  }
  return RENT_PAYMENT_PURPOSES.includes(payment.purpose as (typeof RENT_PAYMENT_PURPOSES)[number])
}
