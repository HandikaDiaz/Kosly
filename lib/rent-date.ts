export const periodOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

export const dueDateForPeriod = (period: string, dueDay: number) => {
  const [yearText, monthText] = period.split("-")
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(Math.max(dueDay, 1), lastDay), 23, 59, 59, 999).getTime()
}
