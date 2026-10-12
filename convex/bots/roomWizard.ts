export type RoomWizardStep = "room_number" | "monthly_rent" | "photo"
export type RoomWizardInput =
  | { ok: true; value: string | number }
  | { ok: false; message: string }

export const parseRoomWizardInput = (step: RoomWizardStep, input: string): RoomWizardInput => {
  const normalized = input.trim()
  if (step === "room_number") {
    return normalized.length > 0 && normalized.length <= 80
      ? { ok: true, value: normalized }
      : { ok: false, message: "Nomor atau nama kamar wajib diisi." }
  }
  if (step === "monthly_rent") {
    const digits = normalized.replace(/[^0-9]/g, "")
    const value = Number(digits)
    return Number.isSafeInteger(value) && value > 0
      ? { ok: true, value }
      : { ok: false, message: "Harga sewa harus berupa angka lebih dari 0, misalnya 1500000." }
  }
  return normalized.toLowerCase() === "lewati"
    ? { ok: true, value: "skip" }
    : { ok: false, message: 'Kirim foto kamar atau ketik "lewati" untuk melanjutkan.' }
}
