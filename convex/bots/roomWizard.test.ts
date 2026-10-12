import { expect, test } from "vitest"
import { parseRoomWizardInput } from "./roomWizard"

test("validates room number and monthly rent by wizard step", () => {
  expect(parseRoomWizardInput("room_number", " 12 ")).toEqual({ ok: true, value: "12" })
  expect(parseRoomWizardInput("room_number", "   ")).toEqual({ ok: false, message: "Nomor atau nama kamar wajib diisi." })
  expect(parseRoomWizardInput("monthly_rent", "Rp 1.500.000")).toEqual({ ok: true, value: 1500000 })
  expect(parseRoomWizardInput("monthly_rent", "seratus ribu")).toEqual({ ok: false, message: "Harga sewa harus berupa angka lebih dari 0, misalnya 1500000." })
})

test("accepts skip only at photo step", () => {
  expect(parseRoomWizardInput("photo", "lewati")).toEqual({ ok: true, value: "skip" })
  expect(parseRoomWizardInput("monthly_rent", "lewati")).toEqual({ ok: false, message: "Harga sewa harus berupa angka lebih dari 0, misalnya 1500000." })
})
