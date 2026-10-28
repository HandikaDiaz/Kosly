import type { ApplicationStatus } from "./applicationRules"

export const MAX_LINK_ATTEMPTS_PER_APPLICATION = 10
export const MAX_HINT_LOOKUPS_PER_HOUR_GLOBAL = 300

export const parseRegistrationCode = (value: string) => {
  const normalized = value.toUpperCase().replace(/[\s-]/g, "")
  if (!/^PJ[A-Z2-9]{6}$/.test(normalized)) return null
  return `PJ-${normalized.slice(2)}`
}

export const registrationStatusText = (status: ApplicationStatus) => {
  if (status === "registration_submitted") return "Pendaftaranmu sudah diterima pemilik untuk diperiksa"
  if (status === "dp_confirmed") return "DP sudah dikonfirmasi pemilik"
  if (status === "converted") return "Pendaftaran selesai"
  if (status === "booking_failed") return "Pendaftaran tidak dilanjutkan"
  return status
}

export const buildRegistrationLink = (baseUrl: string, registrationSlug: string, code: string) => `${baseUrl.replace(/\/$/, "")}/${registrationSlug}/daftar?pj=${encodeURIComponent(code)}`
