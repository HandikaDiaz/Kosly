import { expect, test } from "vitest"
import { normalizeTelegramUpdate, verifyTelegramSecret } from "./webhooks"
import { normalizeWhatsAppEvent, normalizeWhatsAppStatuses, verifyWhatsAppSignature } from "./webhooks"

test("accepts Telegram secret only when header matches", () => {
  expect(verifyTelegramSecret("expected", "expected")).toBe(true)
  expect(verifyTelegramSecret("expected", "wrong")).toBe(false)
})

test("normalizes Telegram callback data", () => {
  expect(normalizeTelegramUpdate({ update_id: 44, callback_query: { id: "cb-1", data: "confirm:KSL-ABC123", message: { chat: { id: 77 } } } })).toMatchObject({ channel: "telegram", eventId: "44", chatId: "77", callbackAction: "confirm", callbackReference: "KSL-ABC123" })
  expect(normalizeTelegramUpdate({ update_id: 45, callback_query: { id: "cb-2", data: "reject:KSL-XYZ789", from: { id: 99 } } })).toMatchObject({ channel: "telegram", eventId: "45", chatId: "99", callbackAction: "reject", callbackReference: "KSL-XYZ789" })
  expect(normalizeTelegramUpdate({ update_id: 46, callback_query: { id: "cb-3", data: "upgrade:growth:annual", message: { chat: { id: 77 } } } })).toMatchObject({ channel: "telegram", eventId: "46", chatId: "77", callbackAction: "upgrade", callbackReference: "GROWTH:ANNUAL" })
  expect(normalizeTelegramUpdate({ update_id: 47, callback_query: { id: "cb-4", data: "cancel:upgrade", message: { chat: { id: 77 } } } })).toMatchObject({ channel: "telegram", eventId: "47", chatId: "77", callbackAction: "cancel", callbackReference: "UPGRADE" })
})

test("normalizes WhatsApp text messages", () => {
  expect(normalizeWhatsAppEvent({ entry: [{ changes: [{ value: { messages: [{ id: "wamid-1", from: "62812", text: { body: "KONFIRMASI KSL-ABC123" } }] } }] }] })).toMatchObject({ channel: "whatsapp", eventId: "wamid-1", chatId: "62812", text: "KONFIRMASI KSL-ABC123" })
})

test("normalizes WhatsApp reply button callbacks", () => {
  expect(normalizeWhatsAppEvent({ entry: [{ changes: [{ value: { messages: [{ id: "wamid-button-1", from: "62812", interactive: { button_reply: { id: "confirm:KSL-ABC123" } } }] } }] }] })).toMatchObject({ channel: "whatsapp", eventId: "wamid-button-1", chatId: "62812", senderPhone: "62812", callbackAction: "confirm", callbackReference: "KSL-ABC123" })
})

test("normalizes WhatsApp contact messages for window tracking", () => {
  expect(normalizeWhatsAppEvent({ entry: [{ changes: [{ value: { messages: [{ id: "wamid-contact-1", from: "62812", contacts: [{ phones: [{ phone: "+62813" }] }] }] } }] }] })).toMatchObject({ channel: "whatsapp", senderPhone: "62812", contactPhone: "+62813" })
})

test("normalizes WhatsApp delivery status callbacks without message content", () => {
  expect(normalizeWhatsAppStatuses({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid-1", status: "failed", errors: [{ code: 131047 }] }] } }] }] })).toEqual([{ externalMessageId: "wamid-1", ok: false, providerCode: 131047 }])
})

test("verifies WhatsApp HMAC signatures", async () => {
  const body = JSON.stringify({ hello: "world" })
  const signature = await verifyWhatsAppSignature(body, "sha256=", "secret")
  expect(signature).toBe(false)
})
