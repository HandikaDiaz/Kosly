import { describe, expect, test } from "vitest"
import { parseBotCommand } from "./commands"

describe("parseBotCommand", () => {
  test("parses a confirm command case-insensitively", () => {
    expect(parseBotCommand("  konfirmasi   KSL-ABC123  ")).toEqual({ kind: "confirm", reference: "KSL-ABC123" })
  })

  test("parses a reject command with a bounded reason", () => {
    expect(parseBotCommand("TOLAK KSL-ABC123 bukti belum jelas")).toEqual({ kind: "reject", reference: "KSL-ABC123", reason: "bukti belum jelas" })
  })

  test("rejects natural language and missing references", () => {
    expect(parseBotCommand("tolong cek pembayaran Nadia")).toEqual({ kind: "invalid" })
    expect(parseBotCommand("KONFIRMASI")).toEqual({ kind: "invalid" })
  })

  test("parses upgrade cancellation", () => {
    expect(parseBotCommand("BATAL")).toEqual({ kind: "cancel", value: "upgrade" })
  })

  test("parses room commands with structured fields", () => {
    expect(parseBotCommand("/tambahkamar")).toEqual({ kind: "add_room" })
    expect(parseBotCommand("/editkamar 12 harga 1600000")).toEqual({ kind: "edit_room", roomNumber: "12", field: "price", value: "1600000" })
    expect(parseBotCommand("/editkamar 12 status kosong")).toEqual({ kind: "edit_room", roomNumber: "12", field: "status", value: "kosong" })
  })
})
