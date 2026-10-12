import { expect, test } from "vitest"
import { buildTelegramReviewMessage, buildTelegramUpgradeMessage } from "./telegram"
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

test("builds Telegram upgrade buttons with cancel", () => {
  const message = buildTelegramUpgradeMessage([
    { tier: "starter", monthlyPrice: 99000, annualPrice: 990000 },
    { tier: "growth", monthlyPrice: 199000, annualPrice: 1990000 },
  ] as const)
  expect(message.text).toContain("Pilih tier upgrade")
  expect(message.reply_markup.inline_keyboard).toEqual([
    [
      { text: "Starter · Bulanan (Rp 99.000)", callback_data: "upgrade:starter:monthly" },
      { text: "Starter · Tahunan (Rp 990.000)", callback_data: "upgrade:starter:annual" },
    ],
    [
      { text: "Growth · Bulanan (Rp 199.000)", callback_data: "upgrade:growth:monthly" },
      { text: "Growth · Tahunan (Rp 1.990.000)", callback_data: "upgrade:growth:annual" },
    ],
    [{ text: "Batal", callback_data: "cancel:upgrade" }],
  ])
})
