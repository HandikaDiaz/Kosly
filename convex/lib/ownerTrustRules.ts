export const MIN_TENANCIES_TO_SHOW = 3
export const MIN_APPLICATIONS_FOR_RESPONSE = 5
export const RESPONSE_WINDOW_DAYS = 90
export const REPORT_NOTE_MAX = 500
export const MAX_REPORTS_PER_PROPERTY_PER_DAY = 10
export const MAX_REPORTS_GLOBAL_PER_HOUR = 200
export const REPORT_REASONS = ["penipuan_dp", "kos_tidak_sesuai", "pemilik_tidak_merespons", "informasi_tidak_akurat", "lainnya"] as const
export const ADMIN_PRIORITY_THRESHOLD = 3
export const ADMIN_PRIORITY_WINDOW_DAYS = 30

export type ResponseBucket = "kurang_dari_1_jam" | "beberapa_jam" | "dalam_sehari" | "lebih_dari_sehari"

export const computeResponseBucket = (hours: number[], sampleMinimum = MIN_APPLICATIONS_FOR_RESPONSE): ResponseBucket | undefined => {
  if (hours.length < sampleMinimum) return undefined
  const sorted = hours.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length < sampleMinimum) return undefined
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  if (median < 1) return "kurang_dari_1_jam"
  if (median < 6) return "beberapa_jam"
  if (median < 24) return "dalam_sehari"
  return "lebih_dari_sehari"
}

export const bucketLabel = (bucket?: ResponseBucket) => bucket === "kurang_dari_1_jam" ? "kurang dari 1 jam" : bucket === "beberapa_jam" ? "beberapa jam" : bucket === "dalam_sehari" ? "dalam sehari" : bucket === "lebih_dari_sehari" ? "lebih dari sehari" : undefined
export const tenancyDisplay = (count: number) => count < MIN_TENANCIES_TO_SHOW ? undefined : count >= 10 ? "10+" : count >= 5 ? "5+" : "3+"
export const cleanReportNote = (note?: string) => {
  const value = note?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, REPORT_NOTE_MAX) || undefined
  if (!value) return undefined
  if (/https?:\/\/|www\.|(?:\+?62|0)\d[\d\s().-]{7,}/i.test(value)) return null
  return value
}
export const isAdminPriority = (fraudReportsInWindow: number) => fraudReportsInWindow >= ADMIN_PRIORITY_THRESHOLD
