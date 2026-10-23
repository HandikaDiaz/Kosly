export const MIN_STAY_DAYS = 30
export const ACTIVE_INVITE_AFTER_DAYS = 90
export const INVITE_TTL_DAYS = 30
export const MAX_REVIEW_CHARS = 1000
export const MAX_REPLY_CHARS = 600
export const MAX_INVITES_PER_PROPERTY_PER_DAY = 5
export const BURST_REVIEWS = 5
export const BURST_WINDOW_DAYS = 7
export const REVIEW_INVITE_DELAY_AFTER_MOVEOUT_HOURS = 24
export const MIN_REVIEWS_FOR_AVERAGE = 3

export type EligibilityReason = "terlalu_singkat" | "belum_ada_pembayaran"

export const computeStayDays = (moveIn: number, moveOutOrNow: number) =>
  Math.max(0, Math.floor((moveOutOrNow - moveIn) / 86_400_000))

export const isTenancyEligible = ({ stayDays, hasConfirmedPayment }: { stayDays: number; hasConfirmedPayment: boolean }) => {
  if (stayDays < MIN_STAY_DAYS) return { eligible: false, reason: "terlalu_singkat" as const }
  if (!hasConfirmedPayment) return { eligible: false, reason: "belum_ada_pembayaran" as const }
  return { eligible: true, reason: null }
}

export const shouldInvite = ({
  status,
  stayDays,
  hasConfirmedPayment,
  now,
  lastInvitedAt,
}: {
  status: "active" | "akan_pindah" | "moved_out" | "inactive" | "pending"
  stayDays: number
  hasConfirmedPayment: boolean
  now: number
  lastInvitedAt?: number
}) => {
  const eligible = isTenancyEligible({ stayDays, hasConfirmedPayment }).eligible
  const statusEligible = status === "moved_out" || status === "akan_pindah" || status === "inactive" || (status === "active" && stayDays >= ACTIVE_INVITE_AFTER_DAYS)
  const cooldownPassed = lastInvitedAt === undefined || now - lastInvitedAt >= ACTIVE_INVITE_AFTER_DAYS * 86_400_000
  return eligible && statusEligible && cooldownPassed
}

export const generateToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export const buildStayLabel = (stayDays: number) => {
  if (stayDays >= 60) return `Penghuni, ${Math.floor(stayDays / 30)} bulan`
  return `Penghuni, ${Math.max(1, stayDays)} hari`
}

export const cleanReviewText = (text: string, maxChars = MAX_REVIEW_CHARS) => {
  const cleaned = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (!cleaned) throw new Error("Teks ulasan tidak boleh kosong.")
  return cleaned.slice(0, maxChars)
}

export const formatRatingSummary = ({ count, sum }: { count: number; sum: number }) => ({
  count,
  average: count >= MIN_REVIEWS_FOR_AVERAGE ? Math.round((sum / count) * 10) / 10 : null,
})

export const formatReviewMonthYear = (timestamp: number) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(timestamp))

export const truncateReviewText = (text: string, maxChars = 240) => text.length <= maxChars ? { text, truncated: false } : { text: `${text.slice(0, maxChars).trimEnd()}…`, truncated: true }
