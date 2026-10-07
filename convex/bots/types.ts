export type BotChannel = "telegram" | "whatsapp"
export type BotAction = "confirm" | "reject"

export type NormalizedBotEvent = {
  channel: BotChannel
  eventId: string
  chatId: string
  text?: string
  callbackAction?: BotAction
  callbackReference?: string
  callbackQueryId?: string
}

export type PaymentReviewSummary = {
  propertyName: string
  roomNumber: string
  tenantName: string
  amount: string
  reference: string
}

export type BotCommand =
  | { kind: "confirm"; reference: string }
  | { kind: "reject"; reference: string; reason: string }
  | { kind: "help" }
  | { kind: "invalid" }
