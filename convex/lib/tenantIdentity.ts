export const CODE_LENGTH = 8
export const CODE_PREFIX = "BK-"
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const CHALLENGE_TTL_MIN = 10
export const CONFIRM_TTL_MIN = 5
export const SESSION_TTL_DAYS = 14
export const MAX_FAILED_CODE_ATTEMPTS_PER_SENDER_PER_HOUR = 5
export const MAX_CHALLENGES_PER_HOUR_GLOBAL = 300
export const IDENTITY_NOTICE_VERSION = "2026-10-v1"

export const normalizeIndonesianPhone = (input: string) => {
  const value = input.trim()
  if (!value || /[a-z]/i.test(value)) return null
  const compact = value.replace(/[\s().-]/g, "")
  if (compact.startsWith("+")) {
    if (!/^\+\d{8,15}$/.test(compact)) return null
    return compact
  }
  if (!/^\d{8,15}$/.test(compact)) return null
  if (compact.startsWith("08")) return `+62${compact.slice(1)}`
  if (compact.startsWith("8")) return `+62${compact}`
  if (compact.startsWith("62")) return `+${compact}`
  return null
}

export const generateVerificationCode = () => {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return `${CODE_PREFIX}${Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("")}`
}

export const parseVerificationCode = (text: string) => {
  const normalized = text.toUpperCase().replace(/[\s-]/g, "")
  const prefix = CODE_PREFIX.replace("-", "")
  if (!normalized.startsWith(prefix) || normalized.length !== prefix.length + CODE_LENGTH) return null
  const body = normalized.slice(prefix.length)
  return [...body].every((char) => CODE_ALPHABET.includes(char)) ? `${CODE_PREFIX}${body}` : null
}

export type ChallengeStatus = "awaiting_message" | "awaiting_confirmation" | "verified" | "expired" | "cancelled"
export type ChallengeEvent = "message_received" | "confirm" | "cancel" | "expire"

export const transitionChallenge = (status: ChallengeStatus, event: ChallengeEvent): ChallengeStatus => {
  if (status === "awaiting_message" && event === "message_received") return "awaiting_confirmation"
  if (status === "awaiting_confirmation" && event === "confirm") return "verified"
  if (status === "awaiting_confirmation" && event === "cancel") return "cancelled"
  if ((status === "awaiting_message" || status === "awaiting_confirmation") && event === "expire") return "expired"
  throw new Error("Transisi challenge tidak valid.")
}
