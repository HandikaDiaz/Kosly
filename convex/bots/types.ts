export type BotChannel = "telegram" | "whatsapp"
export type BotAction = "confirm" | "reject"
export type BotCallbackAction = BotAction | "upgrade" | "cancel"

export type NormalizedBotEvent = {
  channel: BotChannel
  eventId: string
  chatId: string
  text?: string
  callbackAction?: BotCallbackAction
  callbackReference?: string
  callbackQueryId?: string
  photoFileId?: string
  photoMediaId?: string
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
  | { kind: "status" | "subscription" | "upgrade" | "pending" | "summary" }
  | { kind: "admin_decision"; decision: "approve" | "reject"; reference: string }
  | { kind: "selection"; value: string }
  | { kind: "cancel"; value: string }
  | { kind: "yes" }
  | { kind: "invalid" }
