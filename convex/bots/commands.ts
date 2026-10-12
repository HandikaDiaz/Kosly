import type { BotCommand } from "./types"

const referencePattern = /^(?:KSL|VERIFY|BILL|REPORT)-[A-Z0-9]{4,32}$/
const maxReasonLength = 160

export const parseBotCommand = (text: string): BotCommand => {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return { kind: "invalid" }
  const upperNormalized = normalized.toUpperCase()
  if (upperNormalized === "/START" || upperNormalized === "/HELP") return { kind: "help" }
  if (upperNormalized === "YA" || upperNormalized === "YES") return { kind: "yes" }
  if (upperNormalized === "/STATUS") return { kind: "status" }
  if (upperNormalized === "/LANGGANAN") return { kind: "subscription" }
  if (upperNormalized === "/UPGRADE") return { kind: "upgrade" }
  if (upperNormalized === "/PENDING") return { kind: "pending" }
  if (upperNormalized === "/RINGKASAN") return { kind: "summary" }

  const [command, reference, ...reasonParts] = normalized.split(" ")
  const upperCommand = command.toUpperCase()
  const upperReference = reference?.toUpperCase()
  if (upperCommand === "/APPROVE" || upperCommand === "/REJECT") {
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
