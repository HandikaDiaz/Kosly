import { describe, expect, test } from "vitest"
import {
  TEMPLATE_LANGUAGE,
  TEMPLATE_REGISTRY,
  WINDOW_MS,
  WINDOW_SAFETY_MS,
  buildTemplatePayload,
  isWindowOpen,
  sanitizeTemplateParam,
} from "./whatsappTemplates"

describe("WhatsApp template registry", () => {
  test("uses the safety window at the 24-hour boundary", () => {
    expect(isWindowOpen(1_000, 1_000 + WINDOW_MS - WINDOW_SAFETY_MS - 1)).toBe(true)
    expect(isWindowOpen(1_000, 1_000 + WINDOW_MS - WINDOW_SAFETY_MS + 1)).toBe(false)
    expect(isWindowOpen(undefined, 1_000)).toBe(false)
  })

  test("sanitizes whitespace and enforces non-empty values", () => {
    expect(sanitizeTemplateParam("  Kos\n\tA    nyaman  ", "kos")).toBe("Kos A nyaman")
    expect(sanitizeTemplateParam("x".repeat(70), "kode", 60)).toHaveLength(60)
    expect(() => sanitizeTemplateParam(" \n\t ", "kode")).toThrow("kode")
  })

  test("maps every kind to the approved Indonesian utility template", () => {
    expect(TEMPLATE_REGISTRY.owner_new_application).toMatchObject({ name: "bk_owner_new_application", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kos", "kamar", "kode"] })
    expect(TEMPLATE_REGISTRY.tenant_review_invite.params).toEqual(["kos"])
    expect(buildTemplatePayload("tenant_review_invite", { kos: "Kos A" }, "token-123")).toEqual({
      name: "bk_tenant_review_invite",
      language: { code: "id" },
      components: [
        { type: "body", parameters: [{ type: "text", text: "Kos A" }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "token-123" }] },
      ],
    })
  })
})
