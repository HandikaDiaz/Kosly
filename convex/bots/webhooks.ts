import type { NormalizedBotEvent } from "./types"

type UnknownRecord = Record<string, unknown>

export const verifyTelegramSecret = (expected: string | undefined, received: string | undefined) => !expected || expected === received

export const normalizeTelegramUpdate = (body: UnknownRecord): NormalizedBotEvent | null => {
  const updateId = body.update_id
  if (typeof updateId !== "number") return null
  const callback = body.callback_query as UnknownRecord | undefined
  if (callback) {
    const data = typeof callback.data === "string" ? callback.data.trim().split(":") : []
    const message = callback.message as UnknownRecord | undefined
    const chat = message?.chat as UnknownRecord | undefined
    const callbackFrom = callback.from as UnknownRecord | undefined
    const rawChatId = chat?.id ?? callbackFrom?.id
    const action = data[0]?.toLowerCase()
    const isPaymentAction = data.length === 2 && (action === "confirm" || action === "reject")
    const isUpgradeAction = data.length === 3 && action === "upgrade"
    const isCancelAction = data.length === 2 && action === "cancel"
    if ((isPaymentAction || isUpgradeAction || isCancelAction) && typeof callback.id === "string" && (typeof rawChatId === "number" || typeof rawChatId === "string")) {
      return { channel: "telegram", eventId: String(updateId), chatId: String(rawChatId), callbackAction: action as "confirm" | "reject" | "upgrade" | "cancel", callbackReference: data.slice(1).join(":").trim().toUpperCase(), callbackQueryId: callback.id, senderKey: String(rawChatId), fromUserId: typeof callbackFrom?.id === "number" || typeof callbackFrom?.id === "string" ? String(callbackFrom.id) : undefined }
    }
  }
  const message = body.message as UnknownRecord | undefined
  const chat = message?.chat as UnknownRecord | undefined
  if (message && chat && (typeof chat.id === "number" || typeof chat.id === "string")) {
    const from = message.from as UnknownRecord | undefined
    const contact = message.contact as UnknownRecord | undefined
    const base = { channel: "telegram" as const, eventId: String(updateId), chatId: String(chat.id), senderKey: String(chat.id), fromUserId: typeof from?.id === "number" || typeof from?.id === "string" ? String(from.id) : undefined, contactPhone: typeof contact?.phone_number === "string" ? contact.phone_number : undefined, contactUserId: typeof contact?.user_id === "number" || typeof contact?.user_id === "string" ? String(contact.user_id) : undefined }
    const location = message.location as UnknownRecord | undefined
    if (typeof location?.latitude === "number" && typeof location.longitude === "number") return { ...base, location: { latitude: location.latitude, longitude: location.longitude } }
    const photos = Array.isArray(message.photo) ? message.photo : []
    const lastPhoto = photos.at(-1) as UnknownRecord | undefined
    if (typeof lastPhoto?.file_id === "string") return { ...base, text: typeof message.caption === "string" ? message.caption : undefined, photoFileId: lastPhoto.file_id }
    if (typeof message.text === "string" || contact) return { ...base, text: typeof message.text === "string" ? message.text : "" }
  }
  return null
}

export const normalizeWhatsAppEvent = (body: UnknownRecord): NormalizedBotEvent | null => {
  const entries = Array.isArray(body.entry) ? body.entry : []
  const entry = entries[0] as UnknownRecord | undefined
  const changes = Array.isArray(entry?.changes) ? entry.changes : []
  const change = changes[0] as UnknownRecord | undefined
  const value = change?.value as UnknownRecord | undefined
  const messages = Array.isArray(value?.messages) ? value.messages : []
  const message = messages[0] as UnknownRecord | undefined
  const text = message?.text as UnknownRecord | undefined
  const image = message?.image as UnknownRecord | undefined
  if (!message || typeof message.id !== "string" || typeof message.from !== "string") return null
  const location = message.location as UnknownRecord | undefined
  if (typeof location?.latitude === "number" && typeof location.longitude === "number") return { channel: "whatsapp", eventId: message.id, chatId: message.from, senderKey: message.from, senderPhone: message.from, location: { latitude: location.latitude, longitude: location.longitude } }
  const interactive = message.interactive as UnknownRecord | undefined
  const buttonReply = interactive?.button_reply as UnknownRecord | undefined
  const templateButton = message.button as UnknownRecord | undefined
  const buttonId = buttonReply?.id ?? templateButton?.payload
  if (typeof buttonId === "string") {
    const [action, reference] = buttonId.trim().split(":")
    if ((action === "confirm" || action === "reject") && reference) {
      return { channel: "whatsapp", eventId: message.id, chatId: message.from, senderKey: message.from, senderPhone: message.from, callbackAction: action, callbackReference: reference.toUpperCase() }
    }
  }
  if (typeof image?.id === "string") return { channel: "whatsapp", eventId: message.id, chatId: message.from, text: typeof image.caption === "string" ? image.caption : undefined, photoMediaId: image.id, senderKey: message.from, senderPhone: message.from }
  const contacts = Array.isArray(message.contacts) ? message.contacts : []
  const firstContact = contacts[0] as UnknownRecord | undefined
  const contactPhones = Array.isArray(firstContact?.phones) ? firstContact.phones : []
  const contactPhone = contactPhones[0] && typeof contactPhones[0] === "object" ? (contactPhones[0] as UnknownRecord).phone : undefined
  if (typeof contactPhone === "string") return { channel: "whatsapp", eventId: message.id, chatId: message.from, senderKey: message.from, senderPhone: message.from, contactPhone }
  if (typeof text?.body === "string") return { channel: "whatsapp", eventId: message.id, chatId: message.from, text: text.body, senderKey: message.from, senderPhone: message.from }
  return null
}

export const normalizeWhatsAppStatuses = (body: UnknownRecord) => {
  const entries = Array.isArray(body.entry) ? body.entry : []
  const entry = entries[0] as UnknownRecord | undefined
  const changes = Array.isArray(entry?.changes) ? entry.changes : []
  const value = changes[0] && typeof changes[0] === "object" ? changes[0] as UnknownRecord : undefined
  const payload = value?.value as UnknownRecord | undefined
  const statuses = Array.isArray(payload?.statuses) ? payload.statuses : []
  return statuses.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const status = item as UnknownRecord
    if (typeof status.id !== "string") return []
    const errors = Array.isArray(status.errors) ? status.errors[0] as UnknownRecord | undefined : undefined
    const code = typeof errors?.code === "number" ? errors.code : undefined
    return [{ externalMessageId: status.id, ok: status.status !== "failed", providerCode: code }]
  })
}

const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("")

export const verifyWhatsAppSignature = async (body: string, signature: string | undefined, appSecret: string | undefined) => {
  if (!signature?.startsWith("sha256=") || !appSecret) return false
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const digest = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))
  return digest === signature.slice("sha256=".length)
}

export const verifyWhatsAppChallenge = (mode: string | null, token: string | null, challenge: string | null, expectedToken: string | undefined) => mode === "subscribe" && Boolean(expectedToken) && token === expectedToken && challenge ? challenge : null
