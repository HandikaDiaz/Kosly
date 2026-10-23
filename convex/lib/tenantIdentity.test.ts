import { describe, expect, test } from "vitest"
import { CODE_ALPHABET, generateVerificationCode, normalizeIndonesianPhone, parseVerificationCode, transitionChallenge } from "./tenantIdentity"

describe("tenant identity rules", () => {
  test("normalizes Indonesian phone formats without guessing", () => {
    expect(normalizeIndonesianPhone("0812 3456-7890")).toBe("+6281234567890")
    expect(normalizeIndonesianPhone("81234567890")).toBe("+6281234567890")
    expect(normalizeIndonesianPhone("6281234567890")).toBe("+6281234567890")
    expect(normalizeIndonesianPhone("+6281234567890")).toBe("+6281234567890")
    expect(normalizeIndonesianPhone("+14155552671")).toBe("+14155552671")
    expect(normalizeIndonesianPhone("123")).toBeNull()
    expect(normalizeIndonesianPhone("08abc")).toBeNull()
  })

  test("codes use the safe alphabet and parse common typing variations", () => {
    const codes = new Set(Array.from({ length: 20 }, generateVerificationCode))
    expect(codes.size).toBe(20)
    for (const code of codes) expect(code).toMatch(/^BK-[A-Z2-9]{8}$/)
    expect([...codes].join("")).not.toMatch(/[01ILＯ]/)
    const code = [...codes][0]
    expect(parseVerificationCode(code.toLowerCase().replace("-", " "))).toBe(code)
    expect(parseVerificationCode("BK-123")).toBeNull()
    expect(CODE_ALPHABET).not.toMatch(/[01IL]/)
  })

  test("challenge state machine rejects invalid and terminal transitions", () => {
    expect(transitionChallenge("awaiting_message", "message_received")).toBe("awaiting_confirmation")
    expect(transitionChallenge("awaiting_confirmation", "confirm")).toBe("verified")
    expect(transitionChallenge("awaiting_confirmation", "cancel")).toBe("cancelled")
    expect(() => transitionChallenge("verified", "confirm")).toThrow()
    expect(() => transitionChallenge("expired", "message_received")).toThrow()
  })
})
