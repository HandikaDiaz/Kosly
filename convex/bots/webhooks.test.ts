import { expect, test } from "vitest"
import { normalizeTelegramUpdate, verifyTelegramSecret } from "./webhooks"
import { normalizeWhatsAppEvent, verifyWhatsAppSignature } from "./webhooks"

test("accepts Telegram secret only when header matches", () => {
  expect(verifyTelegramSecret("expected", "expected")).toBe(true)
  expect(verifyTelegramSecret("expected", "wrong")).toBe(false)
})

test("normalizes Telegram callback data", () => {
  expect(normalizeTelegramUpdate({ update_id: 44, callback_query: { id: "cb-1", data: "confirm:KSL-ABC123", message: { chat: { id: 77 } } } })).toMatchObject({ channel: "telegram", eventId: "44", chatId: "77", callbackAction: "confirm", callbackReference: "KSL-ABC123" })
  expect(normalizeTelegramUpdate({ update_id: 45, callback_query: { id: "cb-2", data: "reject:KSL-XYZ789", from: { id: 99 } } })).toMatchObject({ channel: "telegram", eventId: "45", chatId: "99", callbackAction: "reject", callbackReference: "KSL-XYZ789" })
})

test("normalizes WhatsApp text messages", () => {
  expect(normalizeWhatsAppEvent({ entry: [{ changes: [{ value: { messages: [{ id: "wamid-1", from: "62812", text: { body: "KONFIRMASI KSL-ABC123" } }] } }] }] })).toMatchObject({ channel: "whatsapp", eventId: "wamid-1", chatId: "62812", text: "KONFIRMASI KSL-ABC123" })
})

test("verifies WhatsApp HMAC signatures", async () => {
  const body = JSON.stringify({ hello: "world" })
  const signature = await verifyWhatsAppSignature(body, "sha256=", "secret")
  expect(signature).toBe(false)
})
