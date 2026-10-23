import { describe, expect, test, vi } from "vitest"
import { mapWhatsAppError, sendWhatsAppNotification } from "./whatsappNotification"

const base = () => ({
  now: 10_000,
  phoneHash: "hash",
  templatesEnabled: true,
  alreadyAttempted: false,
  lastInboundAt: 9_000 as number | undefined,
  sendText: vi.fn(async () => "text-id"),
  sendTemplate: vi.fn(async () => "template-id"),
  record: vi.fn(async () => undefined),
  incrementStats: vi.fn(async () => undefined),
})

describe("WhatsApp notification adapter", () => {
  test("maps provider errors to internal codes", () => {
    expect(mapWhatsAppError(470)).toBe("di_luar_jendela")
    expect(mapWhatsAppError(400, 132001)).toBe("template_tidak_disetujui")
    expect(mapWhatsAppError(400, 132000)).toBe("parameter_tidak_valid")
    expect(mapWhatsAppError(429)).toBe("batas_laju")
  })

  test("uses text inside the open window and never a template", async () => {
    const deps = base()
    const result = await sendWhatsAppNotification({ toPhoneE164: "62812", kind: "owner_new_application", params: { kos: "Kos", kamar: "A1", kode: "K1" }, fallbackText: "fallback", idempotencyKey: "a" }, deps)
    expect(result).toEqual({ mode: "text", ok: true })
    expect(deps.sendText).toHaveBeenCalledWith("fallback")
    expect(deps.sendTemplate).not.toHaveBeenCalled()
  })

  test("uses the review template with token only in the URL button", async () => {
    const deps = { ...base(), lastInboundAt: undefined }
    const result = await sendWhatsAppNotification({ toPhoneE164: "62812", kind: "tenant_review_invite", params: { kos: "Kos" }, fallbackText: "fallback token-secret", buttonParam: "token-secret", idempotencyKey: "invite" }, deps)
    expect(result).toEqual({ mode: "template", ok: true })
    expect(deps.sendText).not.toHaveBeenCalled()
    expect(deps.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ components: expect.arrayContaining([expect.objectContaining({ type: "button", parameters: [{ type: "text", text: "token-secret" }] })]) }))
    expect(JSON.stringify((deps.sendTemplate.mock.calls as unknown[][])[0][0])).not.toContain("fallback token-secret")
  })

  test("does not retry an existing idempotency key or disabled templates", async () => {
    const attempted = base()
    attempted.alreadyAttempted = true
    expect(await sendWhatsAppNotification({ toPhoneE164: "62812", kind: "owner_new_application", params: { kos: "Kos", kamar: "A1", kode: "K1" }, fallbackText: "fallback", idempotencyKey: "a" }, attempted)).toEqual({ mode: "skipped", ok: false, errorCode: "sudah_dicoba" })
    const disabled = { ...base(), lastInboundAt: undefined, templatesEnabled: false }
    expect(await sendWhatsAppNotification({ toPhoneE164: "62812", kind: "owner_new_application", params: { kos: "Kos", kamar: "A1", kode: "K1" }, fallbackText: "fallback", idempotencyKey: "b" }, disabled)).toEqual({ mode: "skipped", ok: false, errorCode: "dinonaktifkan" })
    expect(disabled.sendTemplate).not.toHaveBeenCalled()
  })

  test("records only safe delivery metadata when the provider fails", async () => {
    const deps = base()
    deps.lastInboundAt = undefined
    deps.sendTemplate.mockRejectedValueOnce(Object.assign(new Error("provider"), { mapped: "template_tidak_disetujui" }))
    const result = await sendWhatsAppNotification({ toPhoneE164: "62812", kind: "owner_new_application", params: { kos: "Kos", kamar: "A1", kode: "K1" }, fallbackText: "contains secret", idempotencyKey: "failure" }, deps)
    expect(result).toEqual({ mode: "template", ok: false, errorCode: "template_tidak_disetujui" })
    expect(deps.record).toHaveBeenCalledWith(expect.objectContaining({ mode: "template", ok: false, errorCode: "template_tidak_disetujui" }))
    expect(JSON.stringify((deps.record.mock.calls as unknown[][])[0][0])).not.toContain("62812")
    expect(JSON.stringify((deps.record.mock.calls as unknown[][])[0][0])).not.toContain("contains secret")
  })
})
