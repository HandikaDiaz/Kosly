import { describe, expect, it } from "vitest"
import { assertRaporEnabled, isRaporEnabled, RAPOR_DISABLED_MESSAGE } from "./raporGate"

describe("rapor gate", () => {
  it("only enables on the exact true value", () => {
    expect(isRaporEnabled("true")).toBe(true)
    expect(isRaporEnabled("TRUE")).toBe(false)
    expect(isRaporEnabled(undefined)).toBe(false)
  })

  it("returns the neutral disabled error", () => {
    expect(() => assertRaporEnabled(undefined)).toThrow(RAPOR_DISABLED_MESSAGE)
    expect(() => assertRaporEnabled("false")).toThrow(RAPOR_DISABLED_MESSAGE)
  })
})
