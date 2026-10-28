export const BUSINESS_TZ = "Asia/Jakarta"

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export const jakartaParts = (timestamp: number | Date) => {
  const value = timestamp instanceof Date ? timestamp.getTime() : timestamp
  const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]))
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) }
}

export const periodOf = (timestamp: number | Date) => {
  const { year, month } = jakartaParts(timestamp)
  return `${year}-${String(month).padStart(2, "0")}`
}

export const jakartaDateKey = (timestamp: number | Date) => {
  const { year, month, day } = jakartaParts(timestamp)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export const periodOffset = (period: string, offset: number) => {
  const [yearText, monthText] = period.split("-")
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export const dueDateForPeriod = (period: string, dueDay: number) => {
  const [yearText, monthText] = period.split("-")
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(Math.max(Math.floor(dueDay), 1), lastDay)
  return Date.UTC(year, month, day, 16, 59, 59, 999)
}

export const dueDayFromTimestamp = (timestamp: number) => jakartaParts(timestamp).day

export const startOfDayJakarta = (timestamp: number) => {
  const { year, month, day } = jakartaParts(timestamp)
  return Date.UTC(year, month - 1, day, -7, 0, 0, 0)
}

export const jakartaDayDistance = (fromTimestamp: number, toTimestamp: number) => Math.floor((startOfDayJakarta(toTimestamp) - startOfDayJakarta(fromTimestamp)) / 86_400_000)
