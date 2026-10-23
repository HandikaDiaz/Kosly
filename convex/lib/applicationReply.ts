export type TenantReplyApplication = {
  channel: "telegram" | "whatsapp"
  replyChatId?: string
  applicantPhoneE164?: string
  anonymizedAt?: number
}

export type TenantReplyRoute = { channel: "telegram" | "whatsapp"; address: string }

export const resolveTenantReplyRoute = (application: TenantReplyApplication): TenantReplyRoute | null => {
  if (application.anonymizedAt !== undefined) return null
  if (application.channel === "telegram" && application.replyChatId?.trim()) return { channel: "telegram", address: application.replyChatId.trim() }
  if (application.channel === "whatsapp" && application.applicantPhoneE164?.trim()) return { channel: "whatsapp", address: application.applicantPhoneE164.trim() }
  return null
}
