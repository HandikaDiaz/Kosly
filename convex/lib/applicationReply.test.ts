import { describe, expect, it } from "vitest"
import { resolveTenantReplyRoute } from "./applicationReply"

describe("resolveTenantReplyRoute", () => {
  it("uses Telegram replyChatId only", () => {
    expect(resolveTenantReplyRoute({ channel: "telegram", replyChatId: "12345", applicantPhoneE164: "+62812" })).toEqual({ channel: "telegram", address: "12345" })
  })
  it("uses WhatsApp phone and never a missing Telegram id", () => {
    expect(resolveTenantReplyRoute({ channel: "whatsapp", applicantPhoneE164: "+62812" })).toEqual({ channel: "whatsapp", address: "+62812" })
    expect(resolveTenantReplyRoute({ channel: "telegram" })).toBeNull()
  })
  it("returns null after anonymization", () => {
    expect(resolveTenantReplyRoute({ channel: "telegram", replyChatId: "12345", anonymizedAt: Date.now() })).toBeNull()
  })
})
