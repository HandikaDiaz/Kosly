import { describe, expect, test } from "vitest"
import { buildReviewInvitationMessage, buildReviewUrl, deliverReviewMessage } from "./reviewDelivery"

describe("review delivery helpers", () => {
  test("normalizes base URL and requires APP_BASE_URL", () => {
    expect(buildReviewUrl("https://botkos.id///", "abc token")).toBe("https://botkos.id/ulasan/abc%20token")
    expect(() => buildReviewUrl(undefined, "token")).toThrow("APP_BASE_URL")
  })

  test("builds both invitation variants without owner identity or contact data", () => {
    const moveout = buildReviewInvitationMessage({ propertyName: "Kos Melati", reason: "moveout", url: "https://botkos.id/ulasan/token" })
    const active = buildReviewInvitationMessage({ propertyName: "Kos Melati", reason: "active90", url: "https://botkos.id/ulasan/token" })
    expect(moveout).toContain("Kos Melati")
    expect(moveout).toContain("https://botkos.id/ulasan/token")
    expect(moveout).toContain("tinggal")
    expect(active).toContain("3 bulan")
    expect(moveout).not.toContain("@")
    expect(moveout).not.toMatch(/08\d{7,}/)
    expect(moveout).toContain("hanya bisa dipakai sekali")
  })

  test("supports a fake sender adapter without network access", async () => {
    const sent: Array<{ phone: string; message: string }> = []
    await deliverReviewMessage({ phone: "+62 812-3456-7890", message: "pesan", send: async (phone, message) => { sent.push({ phone, message }) } })
    expect(sent).toEqual([{ phone: "6281234567890", message: "pesan" }])
    await expect(deliverReviewMessage({ phone: "123", message: "pesan", send: async () => undefined })).rejects.toThrow("Kanal WhatsApp")
  })
})
