import { expect, test } from "vitest"
import { buildTelegramReviewMessage } from "./telegram"
import { buildWhatsAppReviewMessage } from "./whatsapp"

const summary = { propertyName: "Kost Melati", roomNumber: "05", tenantName: "Nadia Putri", amount: "Rp 1.650.000", reference: "KSL-ABC123" }

test("builds Telegram review message with opaque callback actions", () => {
  const message = buildTelegramReviewMessage(summary)
  expect(message.text).toContain("Nadia Putri")
  expect(message.reply_markup.inline_keyboard[0][0].callback_data).toBe("confirm:KSL-ABC123")
})

test("builds WhatsApp review text with strict commands", () => {
  const message = buildWhatsAppReviewMessage(summary)
  expect(message).toContain("KONFIRMASI KSL-ABC123")
  expect(message).toContain("TOLAK KSL-ABC123")
})
