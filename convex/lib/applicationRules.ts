export const OWNER_RESPONSE_HOURS = 48
export const OWNER_REMINDER_AFTER_HOURS = 24
export const HOLD_HOURS = 72
export const HOLD_REMINDER_BEFORE_HOURS = 12
export const MAX_ACTIVE_APPLICATIONS_PER_SENDER = 3
export const MAX_APPLICATIONS_PER_SENDER_PER_DAY = 5
export const MAX_ACTIVE_HOLDS_PER_SENDER = 2
export const MAX_PENDING_PER_ROOM = 5
export const MAX_MOVE_IN_DAYS_AHEAD = 90
export const MIN_DURATION_MONTHS = 1
export const MAX_DURATION_MONTHS = 24
export const NAME_MIN = 2
export const NAME_MAX = 60
export const NOTE_MAX = 200
export const FLOW_TTL_MIN = 30
export const PII_RETENTION_DAYS = 90
export const APPLY_CONSENT_VERSION = "apply-2026-10-v2"
export const APPLICATION_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

const jakartaParts = (value: Date | number) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value instanceof Date ? value : new Date(value))
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])) as { year: string; month: string; day: string }
}
const jakartaDate = (date: string) => new Date(`${date}T00:00:00+07:00`)
const normalizeText = (text: string) => text.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim()
const monthNames: Record<string, number> = { januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, may: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, september: 9, sep: 9, oktober: 10, okt: 10, november: 11, nov: 11, desember: 12, des: 12 }
const asDateString = (year: number, month: number, day: number) => { const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null }

export const parseIndonesianDate = (text: string, nowJakarta: Date | number) => {
  const value = normalizeText(text).toLowerCase()
  const today = jakartaParts(nowJakarta)
  const todayDate = `${today.year}-${today.month}-${today.day}`
  if (value === "hari ini") return todayDate
  if (value === "besok" || value === "lusa") { const date = jakartaDate(todayDate); date.setUTCDate(date.getUTCDate() + (value === "besok" ? 1 : 2)); return jakartaParts(date).year + "-" + jakartaParts(date).month + "-" + jakartaParts(date).day }
  let match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (match) return asDateString(Number(match[3]), Number(match[2]), Number(match[1]))
  match = value.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/)
  if (!match) return null
  const month = monthNames[match[2]]
  if (!month) return null
  const year = match[3] ? Number(match[3]) : Number(today.year)
  const day = Number(match[1])
  let result = asDateString(year, month, day)
  if (!match[3] && result && result < todayDate) result = asDateString(year + 1, month, day)
  return result
}

export const validateMoveInDate = (date: string, nowJakarta: Date | number) => {
  const today = jakartaParts(nowJakarta)
  const todayDate = `${today.year}-${today.month}-${today.day}`
  const max = new Date(`${todayDate}T00:00:00+07:00`); max.setUTCDate(max.getUTCDate() + MAX_MOVE_IN_DAYS_AHEAD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !asDateString(Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10)))) return { ok: false as const, error: "Tanggal masuk belum valid." }
  if (date < todayDate) return { ok: false as const, error: "Tanggal masuk tidak boleh sudah lewat." }
  if (date > `${jakartaParts(max).year}-${jakartaParts(max).month}-${jakartaParts(max).day}`) return { ok: false as const, error: `Tanggal masuk maksimal ${MAX_MOVE_IN_DAYS_AHEAD} hari dari hari ini.` }
  return { ok: true as const, date }
}

export const parseDurationMonths = (text: string) => { const value = normalizeText(text).toLowerCase(); const years = value.match(/^(\d+(?:[.,]\d+)?)\s*tahun$/); const months = value.match(/^(\d+)\s*(?:bulan)?$/); const result = years ? Number(years[1].replace(",", ".")) * 12 : months ? Number(months[1]) : null; return result !== null && Number.isInteger(result) && result >= MIN_DURATION_MONTHS && result <= MAX_DURATION_MONTHS ? result : null }
export const cleanApplicantName = (text: string) => { const value = normalizeText(text); if (!value || value.length < NAME_MIN || value.length > NAME_MAX || /https?:\/\/|www\.|@/i.test(value)) return null; return value }
export const cleanNote = (text: string) => { const value = normalizeText(text); if (value === "-") return ""; if (/https?:\/\/|www\.|@/i.test(value)) return null; return value.slice(0, NOTE_MAX) }
export const generateApplicationCode = () => { const bytes = new Uint8Array(6); crypto.getRandomValues(bytes); return `PJ-${Array.from(bytes, (byte) => APPLICATION_CODE_ALPHABET[byte % APPLICATION_CODE_ALPHABET.length]).join("")}` }
export const parseApplicationCode = (text: string) => { const value = text.toUpperCase().replace(/[\s-]/g, ""); if (!value.startsWith("PJ") || value.length !== 8) return null; const code = value.slice(2); return [...code].every((char) => APPLICATION_CODE_ALPHABET.includes(char)) ? `PJ-${code}` : null }

export type ApplicationStatus = "submitted" | "accepted" | "registration_submitted" | "dp_confirmed" | "declined" | "cancelled_by_tenant" | "expired_no_response" | "declined_auto" | "hold_released" | "hold_expired" | "converted" | "booking_failed"
export type ApplicationEvent = "accept" | "decline" | "decline_auto" | "cancel" | "expire_response" | "release" | "expire_hold" | "convert"
export const transitionApplication = (status: ApplicationStatus, event: ApplicationEvent): ApplicationStatus => {
  if (status === "submitted" && event === "accept") return "accepted"
  if (status === "submitted" && event === "decline") return "declined"
  if (status === "submitted" && event === "cancel") return "cancelled_by_tenant"
  if (status === "submitted" && event === "expire_response") return "expired_no_response"
  if (status === "submitted" && event === "decline_auto") return "declined_auto"
  if (status === "accepted" && event === "release") return "hold_released"
  if (status === "accepted" && event === "cancel") return "cancelled_by_tenant"
  if (status === "accepted" && event === "expire_hold") return "hold_expired"
  if (status === "accepted" && event === "convert") return "converted"
  throw new Error("Transisi pengajuan tidak valid.")
}
export const isRoomAvailable = (room: { status: string; isActive?: boolean }, activeHoldsForRoom: Array<{ status: ApplicationStatus; holdExpiresAt?: number; bookingStatus?: string }>, now: number) => room.isActive !== false && room.status === "available" && !activeHoldsForRoom.some((hold) => (hold.status === "accepted" && (hold.holdExpiresAt ?? 0) > now) || (hold.status === "registration_submitted" && hold.bookingStatus === "pending"))
export const buildApplicationCodeLabel = (code: string) => code.toUpperCase()
export const buildApplyConfirmation = (data: { propertyName: string; roomLabel: string; applicantName: string; moveInDate: string; durationMonths: number; note?: string }) => `Periksa pengajuanmu:\n\n${data.propertyName} · Kamar ${data.roomLabel}\nNama: ${data.applicantName}\nMulai: ${data.moveInDate}\nDurasi: ${data.durationMonths} bulan${data.note ? `\nCatatan: ${data.note}` : ""}\n\nDengan mengirim, namamu, nomor HP, dan detail di atas akan dibagikan ke pemilik kos ini agar mereka bisa menanggapi pengajuanmu. Pemilik tidak melihat data lain. BotKos akan mengirim kabar status pengajuanmu (diterima, ditolak, kedaluwarsa, dan pengingat) ke chat ini. ID chat disimpan hanya selama pengajuan dan dihapus otomatis bersama data lainnya setelah 90 hari. Balas YA untuk mengirim atau TIDAK untuk membatalkan.`
export const buildOwnerApplicationNotice = (data: { code: string; propertyName: string; roomLabel: string; applicantName: string; phone: string; moveInDate: string; durationMonths: number; note?: string }) => `📥 Pengajuan sewa baru\n\nKode: ${data.code}\n${data.propertyName} · Kamar ${data.roomLabel}\nNama: ${data.applicantName}\nHP: ${data.phone}\nMulai: ${data.moveInDate}\nDurasi: ${data.durationMonths} bulan${data.note ? `\nCatatan: ${data.note}` : ""}\n\nTerima: /terima ${data.code}\nTolak: /tolak ${data.code}`
export const buildTenantApplicationNotice = (status: "accepted" | "declined" | "expired" | "released" | "reminder", code: string, detail?: string) => status === "accepted" ? `✅ Pengajuan ${code} diterima. Kamar ditahan sampai ${detail ?? "batas waktu hold"} WIB. Hubungi pemilik untuk kesepakatan berikutnya. BotKos tidak memproses pembayaran.` : status === "declined" ? `Pengajuan ${code} belum dapat diterima. Kamu bisa mencoba kos lain dengan /cari.` : status === "expired" ? `Pengajuan ${code} kedaluwarsa karena belum ada tanggapan pemilik. Kamu bisa mencoba lagi dengan /cari.` : status === "reminder" ? `⏰ Pengingat: penahanan untuk pengajuan ${code} akan segera berakhir${detail ? ` pada ${detail} WIB` : ""}. Hubungi pemilik bila ingin melanjutkan.` : `Penahanan untuk pengajuan ${code} sudah dilepas. Kamar dapat diajukan kembali.`
export const buildStatusLine = (code: string, propertyName: string, roomLabel: string, status: ApplicationStatus, deadline?: number) => `${code} · ${propertyName} · Kamar ${roomLabel} · ${status}${deadline ? ` · batas ${new Date(deadline).toLocaleString("id-ID")}` : ""}`
