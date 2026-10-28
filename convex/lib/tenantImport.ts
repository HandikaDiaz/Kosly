import { dueDateForPeriod, dueDayFromTimestamp, jakartaParts, periodOf, startOfDayJakarta } from "../../lib/rent-date"

export type ImportPaidStatus = "unpaid_current" | "paid_current" | "paid_ahead"

export type TenantImportInput = {
  name: string
  phone?: string
  startedAt: number
  nextDueDate: number
  monthlyRent: number
  paidStatus: ImportPaidStatus
  paidThroughPeriod?: string
  lastPaymentAt?: number
  lastPaymentAmount?: number
}

export type ImportValidation = { ok: true; value: TenantImportInput } | { ok: false; error: string }

export const cleanTenantName = (value: string) => {
  const cleaned = value.trim().replace(/\s+/g, " ")
  if (cleaned.length < 2 || cleaned.length > 60 || /https?:\/\/|www\.|@/i.test(cleaned)) return null
  return cleaned
}

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/

const periodOffset = (period: string, offset: number) => {
  const [year, month] = period.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export const validateImportInput = (input: TenantImportInput, nowTs: number): ImportValidation => {
  const name = cleanTenantName(input.name)
  if (!name) return { ok: false, error: "Nama penyewa harus 2-60 karakter dan tidak boleh berupa URL." }
  if (!Number.isFinite(input.startedAt) || input.startedAt > nowTs || input.startedAt < nowTs - 20 * 366 * 86_400_000) return { ok: false, error: "Tanggal mulai sewa berada di luar rentang yang diizinkan." }
  if (!Number.isFinite(input.nextDueDate) || input.nextDueDate < nowTs - 62 * 86_400_000 || input.nextDueDate > nowTs + 62 * 86_400_000) return { ok: false, error: "Jatuh tempo berikutnya harus berada dalam rentang 62 hari dari hari ini." }
  if (!Number.isFinite(input.monthlyRent) || input.monthlyRent <= 0) return { ok: false, error: "Harga sewa per bulan harus lebih dari nol." }
  if (!periodPattern.test(periodOf(input.nextDueDate))) return { ok: false, error: "Periode jatuh tempo tidak valid." }
  if (input.paidStatus === "paid_ahead") {
    if (!input.paidThroughPeriod || !periodPattern.test(input.paidThroughPeriod)) return { ok: false, error: "Periode pembayaran di muka belum valid." }
    const current = periodOf(input.nextDueDate)
    const [currentYear, currentMonth] = current.split("-").map(Number)
    const [throughYear, throughMonth] = input.paidThroughPeriod.split("-").map(Number)
    const distance = (throughYear - currentYear) * 12 + throughMonth - currentMonth
    if (distance < 0 || distance > 12) return { ok: false, error: "Pembayaran di muka maksimal 12 periode dari periode berjalan." }
  }
  if (input.paidStatus !== "paid_ahead" && input.paidThroughPeriod) return { ok: false, error: "Periode lunas hanya boleh diisi untuk pembayaran di muka." }
  if (input.lastPaymentAt !== undefined && (!Number.isFinite(input.lastPaymentAt) || input.lastPaymentAt > nowTs)) return { ok: false, error: "Tanggal pembayaran terakhir tidak boleh di masa depan." }
  if (input.lastPaymentAmount !== undefined && (!Number.isFinite(input.lastPaymentAmount) || input.lastPaymentAmount <= 0)) return { ok: false, error: "Nominal pembayaran terakhir harus lebih dari nol." }
  return { ok: true, value: { ...input, name, phone: input.phone?.trim() || undefined } }
}

export const previewImport = (input: TenantImportInput, nowTs: number) => {
  const validation = validateImportInput(input, nowTs)
  if (!validation.ok) return validation
  const value = validation.value
  const currentPeriod = periodOf(value.nextDueDate)
  const through = value.paidStatus === "paid_ahead" ? value.paidThroughPeriod ?? currentPeriod : currentPeriod
  const periods: Array<{ period: string; dueDate: number; amount: number; status: "unpaid" | "paid" }> = []
  let period = currentPeriod
  while (true) {
    periods.push({ period, dueDate: dueDateForPeriod(period, dueDayFromTimestamp(value.nextDueDate)), amount: value.monthlyRent, status: value.paidStatus === "unpaid_current" ? "unpaid" : "paid" })
    if (period === through) break
    period = periodOffset(period, 1)
  }
  const paid = value.paidStatus !== "unpaid_current"
  return { ok: true as const, dueDay: dueDayFromTimestamp(value.nextDueDate), periods, nextDueDate: dueDateForPeriod(currentPeriod, dueDayFromTimestamp(value.nextDueDate)), ...(paid ? { payment: { amount: value.lastPaymentAmount ?? value.monthlyRent * periods.length, paidAt: value.lastPaymentAt ?? nowTs, billingPeriod: currentPeriod } } : {}) }
}

export const isTenantDataVerified = (tenant: { dataOrigin?: "registration" | "owner_import"; tenantConfirmedAt?: number }) => tenant.dataOrigin !== "owner_import" || tenant.tenantConfirmedAt !== undefined

export const importedStartedAt = (timestamp: number) => startOfDayJakarta(timestamp)

export const nextDueLabel = (timestamp: number) => jakartaParts(timestamp).day
