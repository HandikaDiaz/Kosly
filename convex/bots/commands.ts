import type { BotCommand } from "./types"

const referencePattern = /^KSL-[A-Z0-9]{6,32}$/
const maxReasonLength = 160

export const parseBotCommand = (text: string): BotCommand => {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return { kind: "invalid" }
  if (normalized.toUpperCase() === "/START" || normalized.toUpperCase() === "/HELP") return { kind: "help" }

  const [command, reference, ...reasonParts] = normalized.split(" ")
  const upperCommand = command.toUpperCase()
  const upperReference = reference?.toUpperCase()
  if (!upperReference || !referencePattern.test(upperReference)) return { kind: "invalid" }
  if (upperCommand === "KONFIRMASI" || upperCommand === "CONFIRM") return { kind: "confirm", reference: upperReference }
  if (upperCommand === "TOLAK" || upperCommand === "REJECT") {
    const reason = reasonParts.join(" ").trim().slice(0, maxReasonLength)
    return { kind: "reject", reference: upperReference, reason: reason || "Bukti belum dapat diverifikasi." }
  }
  return { kind: "invalid" }
}

export const createPaymentReference = (paymentId: string) => {
  const encoded = paymentId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return `KSL-${encoded.slice(-10).padStart(6, "0")}`
}

export const isPaymentReference = (reference: string) => referencePattern.test(reference.trim().toUpperCase())
