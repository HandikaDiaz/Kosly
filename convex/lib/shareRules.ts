export const SHARE_TTL_DAYS = 7
export const REVEAL_VIEW_TTL_MIN = 30
export const MAX_ACTIVE_SHARES_PER_IDENTITY = 3
export const MAX_SHARES_CREATED_PER_DAY = 5
export const SHARE_ROW_RETENTION_DAYS = 30
export const FOR_LABEL_MAX_CHARS = 40

export const buildShareUrl = (baseUrl: string, token: string) => {
  const base = baseUrl.trim().replace(/\/+$/, "")
  if (!base) throw new Error("APP_BASE_URL belum dikonfigurasi.")
  if (!token.trim()) throw new Error("Token tautan kosong.")
  return `${base}/rapor/${encodeURIComponent(token)}`
}
export const maskedPhoneSuffix = (phone: string) => `••••${phone.replace(/\D/g, "").slice(-4).padStart(4, "•")}`
export const cleanForLabel = (value?: string) => value?.trim().replace(/\s+/g, " ").slice(0, FOR_LABEL_MAX_CHARS) || undefined
export const deriveShareStatus = (share: { status: "active" | "revealed" | "revoked" | "expired"; expiresAt: number }, now: number) => share.status === "active" && share.expiresAt <= now ? "expired" as const : share.status
export const buildBagikanReply = ({ url }: { url: string }) => `Tautan Rapor Penghuni siap dibagikan: ${url}`
export const buildNeutralShareFailure = () => "Rapor belum tersedia dari catatanmu saat ini."
