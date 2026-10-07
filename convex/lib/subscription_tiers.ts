export type SubscriptionTier = "free" | "starter" | "growth" | "pro"
export type BillingCycle = "monthly" | "annual" | "none"

const tierPrices: Record<SubscriptionTier, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 59000, annual: 590000 },
  growth: { monthly: 109000, annual: 1090000 },
  pro: { monthly: 199000, annual: 1990000 },
}

export const getTierForRoomCount = (roomCount: number): SubscriptionTier => {
  if (roomCount >= 41) return "pro"
  if (roomCount >= 21) return "growth"
  if (roomCount >= 6) return "starter"
  return "free"
}

export const getTierPrice = (tier: SubscriptionTier, billingCycle: BillingCycle) => {
  if (billingCycle === "none") return 0
  return tierPrices[tier][billingCycle]
}

export const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
}
