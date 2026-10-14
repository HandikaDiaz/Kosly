export type SubscriptionTier = "free" | "starter" | "growth" | "pro"
export type BillingCycle = "monthly" | "annual" | "none"
export type TierLimits = { maxRooms: number | null; maxProperties: number | null }

export const tierPrices: Record<SubscriptionTier, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 59000, annual: 590000 },
  growth: { monthly: 109000, annual: 1090000 },
  pro: { monthly: 199000, annual: 1990000 },
}

export const tierLimits: Record<SubscriptionTier, TierLimits> = {
  free: { maxRooms: 5, maxProperties: 1 },
  starter: { maxRooms: 10, maxProperties: 2 },
  growth: { maxRooms: 30, maxProperties: 3 },
  pro: { maxRooms: null, maxProperties: null },
}

export const getTierLimits = (tier: SubscriptionTier) => tierLimits[tier]

export const getTierForRoomCount = (roomCount: number): SubscriptionTier => {
  if (roomCount > 30) return "pro"
  if (roomCount > 10) return "growth"
  if (roomCount > 5) return "starter"
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
