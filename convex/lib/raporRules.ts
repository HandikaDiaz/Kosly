export const GRACE_DAYS = 3
export const MIN_CONSIDERED_MONTHS = 3
export const TIER_ALWAYS_RATIO = 1.0
export const TIER_USUALLY_RATIO = 0.9
export const DISPUTE_RESPONSE_DAYS = 14
export const MAX_DISPUTES_PER_TENANCY = 6
export const MAX_OPEN_DISPUTES_PER_IDENTITY = 5
export const DISPUTE_AUDIT_THRESHOLD = 3
export const MAX_DISPUTE_NOTE_CHARS = 300
export const IDENTITY_INACTIVE_DELETE_MONTHS = 24
export const SHARE_CONSENT_VERSION = "share-rapor-2026-10-v2"

export type PaymentPeriod = { periodId: string; tenancyId: string; dueDate: number; paidAt?: number; confirmed: boolean }
export type PeriodClassification = "excluded" | "not_due" | "on_time" | "late"
export type RaporTier = "always" | "usually"

export const classifyPeriod = (period: PaymentPeriod, now: number, excludedPeriodIds: ReadonlySet<string>): PeriodClassification => {
  if (excludedPeriodIds.has(period.periodId)) return "excluded"
  if (period.dueDate > now) return "not_due"
  if (!period.confirmed || period.paidAt === undefined) return now > period.dueDate + GRACE_DAYS * 86_400_000 ? "late" : "not_due"
  return period.paidAt <= period.dueDate + GRACE_DAYS * 86_400_000 ? "on_time" : "late"
}

const bucketTenancies = (count: number) => count <= 1 ? "1" as const : count <= 3 ? "2-3" as const : "4+" as const
const bucketMonths = (count: number) => count <= 5 ? "3-5" as const : count <= 11 ? "6-11" as const : count <= 23 ? "12-23" as const : "24+" as const

export const computeRaporSummary = (periodsByTenancy: PaymentPeriod[], now: number, excludedPeriodIds: ReadonlySet<string>) => {
  const considered = periodsByTenancy.filter((period) => { const classification = classifyPeriod(period, now, excludedPeriodIds); return classification === "on_time" || classification === "late" })
  if (considered.length < MIN_CONSIDERED_MONTHS) return { available: false as const }
  const onTime = considered.filter((period) => classifyPeriod(period, now, excludedPeriodIds) === "on_time").length
  const ratio = onTime / considered.length
  const tier: RaporTier | null = ratio >= TIER_ALWAYS_RATIO ? "always" : ratio >= TIER_USUALLY_RATIO ? "usually" : null
  if (!tier) return { available: false as const }
  return { available: true as const, tier, tenancyBucket: bucketTenancies(new Set(considered.map((period) => period.tenancyId)).size), monthsBucket: bucketMonths(considered.length), generatedMonth: formatMonthLabel(new Date(now)) }
}

export const labelForTier = (tier: RaporTier) => tier === "always" ? "Selalu tepat waktu" : "Umumnya tepat waktu"
export const formatMonthLabel = (date: Date) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date)
