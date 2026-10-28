import { describe, expect, test } from "vitest"
import { MAX_HINT_LOOKUPS_PER_HOUR_GLOBAL, parseRegistrationCode, registrationStatusText } from "./registrationLink"

describe("registration link rules", () => {
  test("parses application codes with spaces, hyphens, and lowercase", () => {
    expect(parseRegistrationCode("pj ab-c23e")).toBe("PJ-ABC23E")
    expect(parseRegistrationCode("not-a-code")).toBeNull()
  })

  test("defines the global lookup limit", () => {
    expect(MAX_HINT_LOOKUPS_PER_HOUR_GLOBAL).toBe(300)
  })

  test("uses neutral tenant-facing status copy", () => {
    expect(registrationStatusText("registration_submitted")).toBe(
      "Pendaftaranmu sudah diterima pemilik untuk diperiksa",
    )
    expect(registrationStatusText("booking_failed")).toBe(
      "Pendaftaran tidak dilanjutkan",
    )
  })
})
