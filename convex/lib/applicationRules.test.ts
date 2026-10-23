import { describe, expect, test } from "vitest"
import { APPLY_CONSENT_VERSION, buildApplyConfirmation, cleanApplicantName, cleanNote, isRoomAvailable, parseApplicationCode, parseDurationMonths, parseIndonesianDate, transitionApplication, validateMoveInDate } from "./applicationRules"

describe("application rules", () => {
  const now = new Date("2026-10-23T16:30:00+07:00")
  test("parses Indonesian dates in Jakarta timezone", () => {
    expect(parseIndonesianDate("15 des 2026", now)).toBe("2026-12-15")
    expect(parseIndonesianDate("15 des", new Date("2026-12-20T01:00:00+07:00"))).toBe("2027-12-15")
    expect(parseIndonesianDate("besok", now)).toBe("2026-10-24")
    expect(parseIndonesianDate("12/15", now)).toBeNull()
    expect(parseIndonesianDate("29 februari 2027", now)).toBeNull()
  })
  test("validates duration and applicant text", () => {
    expect(parseDurationMonths("1 tahun")).toBe(12)
    expect(parseDurationMonths("6 bulan")).toBe(6)
    expect(parseDurationMonths("25")).toBeNull()
    expect(cleanApplicantName("  Ana   Putri ")).toBe("Ana Putri")
    expect(cleanApplicantName("https://example.com")).toBeNull()
    expect(cleanNote("-")).toBe("")
    expect(cleanNote("lihat https://example.com")).toBeNull()
  })
  test("status, codes, and availability are strict", () => {
    expect(parseApplicationCode("pj abc234")).toBe("PJ-ABC234")
    expect(transitionApplication("submitted", "accept")).toBe("accepted")
    expect(transitionApplication("submitted", "decline_auto")).toBe("declined_auto")
    expect(() => transitionApplication("declined", "accept")).toThrow()
    expect(isRoomAvailable({ status: "available" }, [{ status: "accepted", holdExpiresAt: now.getTime() + 1 }], now.getTime())).toBe(false)
    expect(isRoomAvailable({ status: "available" }, [{ status: "accepted", holdExpiresAt: now.getTime() - 1 }], now.getTime())).toBe(true)
  })
  test("move-in date bounds", () => {
    expect(validateMoveInDate("2026-10-22", now)).toMatchObject({ ok: false })
    expect(validateMoveInDate("2026-10-24", now)).toMatchObject({ ok: true })
  })
  test("uses v2 consent and explains tenant status delivery", () => {
    expect(APPLY_CONSENT_VERSION).toBe("apply-2026-10-v2")
    const text = buildApplyConfirmation({ propertyName: "Kos", roomLabel: "A", applicantName: "Ana", moveInDate: "2026-11-01", durationMonths: 6 })
    expect(text).toContain("BotKos akan mengirim kabar status pengajuanmu")
    expect(text).toContain("ID chat disimpan hanya selama pengajuan")
  })
})
