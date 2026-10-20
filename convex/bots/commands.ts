import type { BotCommand } from "./types"

export const OWNER_COMMANDS = [
  { command: "status", description: "Lihat ringkasan properti" },
  { command: "belum_bayar", description: "Lihat tagihan yang belum dibayar" },
  { command: "kamar_kosong", description: "Lihat kamar yang siap disewakan" },
  { command: "langganan", description: "Lihat info paket langganan aktif" },
  { command: "upgrade", description: "Lihat pilihan upgrade paket" },
  { command: "laporan", description: "Minta laporan bulanan (Growth & Pro)" },
  { command: "tambahkamar", description: "Tambah kamar baru lewat chat (Growth & Pro)" },
  { command: "editkamar", description: "Ubah harga/status kamar lewat chat (Growth & Pro)" },
  { command: "help", description: "Lihat daftar command BotKos" },
] as const

const referencePattern = /^(?:KSL|VERIFY|BILL|REPORT)-[A-Z0-9]{4,32}$/
const maxReasonLength = 160
const isCommand = (value: string, name: string) => value === `/${name}` || value === name

export const parseBotCommand = (text: string): BotCommand => {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return { kind: "invalid" }
  const upperNormalized = normalized.toUpperCase()
  if (isCommand(upperNormalized, "START") || isCommand(upperNormalized, "HELP")) return { kind: "help" }
  if (isCommand(upperNormalized, "CHATID") || isCommand(upperNormalized, "CHAT_ID")) return { kind: "chat_id" }
  if (upperNormalized === "YA" || upperNormalized === "YES") return { kind: "yes" }
  if (upperNormalized === "BATAL" || upperNormalized === "CANCEL") return { kind: "cancel", value: "upgrade" }
  if (isCommand(upperNormalized, "STATUS")) return { kind: "status" }
  if (isCommand(upperNormalized, "LANGGANAN")) return { kind: "subscription" }
  if (isCommand(upperNormalized, "UPGRADE")) return { kind: "upgrade" }
  if (isCommand(upperNormalized, "PENDING")) return { kind: "pending" }
  if (isCommand(upperNormalized, "RINGKASAN")) return { kind: "summary" }
  if (isCommand(upperNormalized, "LAPORAN")) return { kind: "monthly_report" }
  if (isCommand(upperNormalized, "TAMBAHKAMAR")) return { kind: "add_room" }

  const [command, reference, ...reasonParts] = normalized.split(" ")
  const upperCommand = command.toUpperCase()
  const upperReference = reference?.toUpperCase()
  if (isCommand(upperCommand, "APPROVE") || isCommand(upperCommand, "REJECT")) {
    if (!upperReference || !referencePattern.test(upperReference)) return { kind: "invalid" }
    return { kind: "admin_decision", decision: upperCommand === "/APPROVE" ? "approve" : "reject", reference: upperReference }
  }
  if (upperCommand === "KONFIRMASI" || upperCommand === "CONFIRM") {
    if (!upperReference || !referencePattern.test(upperReference)) return { kind: "invalid" }
    return { kind: "confirm", reference: upperReference }
  }
  if (upperCommand === "TOLAK" || upperCommand === "REJECT") {
    if (!upperReference || !referencePattern.test(upperReference)) return { kind: "invalid" }
    const reason = reasonParts.join(" ").trim().slice(0, maxReasonLength)
    return { kind: "reject", reference: upperReference, reason: reason || "Bukti belum dapat diverifikasi." }
  }
  if (isCommand(upperCommand, "EDITKAMAR")) {
    const field = reasonParts[0]?.toLowerCase()
    const value = reasonParts.slice(1).join(" ").trim()
    if (!reference || !value || (field !== "harga" && field !== "price" && field !== "status")) return { kind: "invalid" }
    return { kind: "edit_room", roomNumber: reference.trim(), field: field === "harga" || field === "price" ? "price" : "status", value }
  }
  if (upperCommand.startsWith("/")) return { kind: "invalid" }
  if (/^(STARTER|GROWTH|PRO|1|2|3)(?:\s+(MONTHLY|ANNUAL|BULANAN|TAHUNAN))?$/.test(upperNormalized)) return { kind: "selection", value: upperNormalized }
  return { kind: "invalid" }
}

export const createPaymentReference = (paymentId: string) => {
  const encoded = paymentId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return `KSL-${encoded.slice(-10).padStart(6, "0")}`
}

export const createQueueReference = (prefix: "VERIFY" | "BILL" | "REPORT", id: string) => {
  const encoded = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return `${prefix}-${encoded.slice(-10).padStart(4, "0")}`
}

export const isPaymentReference = (reference: string) => referencePattern.test(reference.trim().toUpperCase())
