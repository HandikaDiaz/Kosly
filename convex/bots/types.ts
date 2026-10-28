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
  senderKey?: string
  senderPhone?: string
  contactPhone?: string
  contactUserId?: string
  fromUserId?: string
  location?: { latitude: number; longitude: number }
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
  | { kind: "chat_id" }
  | { kind: "status" | "subscription" | "upgrade" | "pending" | "summary" | "monthly_report" }
  | { kind: "admin_decision"; decision: "approve" | "reject"; reference: string }
  | { kind: "selection"; value: string }
  | { kind: "cancel"; value: string }
  | { kind: "add_room" }
  | { kind: "share" | "revoke_share" }
  | { kind: "privacy" }
  | { kind: "report_property"; value: string }
  | { kind: "search" | "detail"; value?: string }
  | { kind: "apply" }
  | { kind: "application_decision"; decision: "accept" | "decline" | "release"; code: string }
  | { kind: "edit_room"; roomNumber: string; field: "price" | "status"; value: string }
  | { kind: "yes" }
  | { kind: "invalid" }
