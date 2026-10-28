export const RAPOR_DISABLED_MESSAGE = "Fitur Rapor Penghuni belum dibuka."

export const isRaporEnabled = (value = process.env.NEXT_PUBLIC_RAPOR_ENABLED) => value === "true"
