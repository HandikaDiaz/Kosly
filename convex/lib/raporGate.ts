export const RAPOR_DISABLED_MESSAGE = "Fitur ini belum dibuka."

export const isRaporEnabled = (value: string | undefined) => value === "true"

export const assertRaporEnabled = (value: string | undefined) => {
  if (!isRaporEnabled(value)) throw new Error(RAPOR_DISABLED_MESSAGE)
}
