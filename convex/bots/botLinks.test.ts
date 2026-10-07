import { expect, test } from "vitest"
import { normalizeChatId } from "../botLinks"

test("normalizes WhatsApp phone numbers while preserving Telegram chat ids", () => {
  expect(normalizeChatId("whatsapp", "+62 812-3456-7890")).toBe("6281234567890")
  expect(normalizeChatId("telegram", " 123456 ")).toBe("123456")
})
