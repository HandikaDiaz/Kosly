import { describe, expect, test } from "vitest"
import { buildHelpMessage, buildUnknownCommandMessage, buildWelcomeMessage } from "./help"

describe("bot help messages", () => {
  test("renders Telegram commands and chat ID guidance", () => {
    const message = buildHelpMessage("telegram", "123456789")
    expect(message).toContain("/chatid")
    expect(message).toContain("Chat ID Anda: <code>123456789</code>")
    expect(message).toContain("/tambahkamar")
  })

  test("renders WhatsApp owner commands with slash", () => {
    const message = buildHelpMessage("whatsapp")
    expect(message).toContain("`/help`")
    expect(message).toContain("`/status`")
    expect(message).not.toContain("`status`")
  })

  test("guides users after an unknown message", () => {
    expect(buildUnknownCommandMessage("telegram")).toContain("/help")
    expect(buildUnknownCommandMessage("whatsapp")).toContain("`/help`")
  })
})
