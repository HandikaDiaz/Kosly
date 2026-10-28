"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { ArrowLeft, CheckCircle2, Users } from "lucide-react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { previewImport, type ImportPaidStatus } from "@/convex/lib/tenantImport"
import { PageLoader } from "./page-loader"

const jakartaDate = (value: string) => new Date(`${value}T12:00:00+07:00`).getTime()

export function TenantImportForm() {
  const params = useParams<{ propertyId: string; roomId: string }>()
  const router = useRouter()
  const propertyId = params.propertyId as Id<"properties">
  const roomId = params.roomId as Id<"rooms">

  const property = useQuery(api.properties.getMine, { propertyId })
  const room = useQuery(api.rooms.get, { roomId })
  const importTenant = useMutation(api.tenants.importExistingTenant)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [nextDueDate, setNextDueDate] = useState("")
  const [paidStatus, setPaidStatus] = useState<ImportPaidStatus>("unpaid_current")
  const [paidThroughPeriod, setPaidThroughPeriod] = useState("")
  const [lastPaymentAmount, setLastPaymentAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const preview = useMemo(
    () =>
      startedAt && nextDueDate
        ? previewImport(
            {
              name,
              phone: phone || undefined,
              startedAt: jakartaDate(startedAt),
              nextDueDate: jakartaDate(nextDueDate),
              monthlyRent: room?.monthlyRent ?? 0,
              paidStatus,
              paidThroughPeriod: paidStatus === "paid_ahead" ? paidThroughPeriod : undefined,
              lastPaymentAmount: lastPaymentAmount ? Number(lastPaymentAmount) : undefined,
            },
            Date.now()
          )
        : null,
    [name, phone, startedAt, nextDueDate, room?.monthlyRent, paidStatus, paidThroughPeriod, lastPaymentAmount]
  )

  if (!property || !room) return <PageLoader variant="inline" message="Memuat formulir…" />

  const submit = async () => {
    setError(null)
    setSuccess(null)
    if (!name.trim()) {
      setError("Nama penyewa wajib diisi.")
      return
    }
    if (!preview || !preview.ok) {
      setError(preview?.error ?? "Lengkapi tanggal mulai dan jatuh tempo.")
      return
    }

    setSubmitting(true)
    try {
      await importTenant({
        propertyId,
        roomId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        startedAt: jakartaDate(startedAt),
        nextDueDate: jakartaDate(nextDueDate),
        monthlyRent: room.monthlyRent,
        paidStatus,
        paidThroughPeriod: paidStatus === "paid_ahead" ? paidThroughPeriod : undefined,
        lastPaymentAmount: lastPaymentAmount ? Number(lastPaymentAmount) : undefined,
      })
      setSuccess("Data penyewa berhasil disimpan! Kamar otomatis berstatus terisi.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data penyewa gagal disimpan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 pb-28">
      {/* Header & Back link */}
      <div>
        <Link
          href={`/dashboard/properties/${propertyId}/penghuni`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--wood)]"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Daftar Penghuni</span>
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)]">
          Isi Data Penyewa · Kamar {room.roomNumber}
        </h1>
        <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
          Masukkan profil penyewa yang saat ini menempati kamar ini agar BotKos dapat mengelola jatuh tempo dan penagihan via bot.
        </p>
      </div>

      {/* Main Form Fields */}
      <section className="space-y-4 rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5 shadow-sm">
        <label className="block text-sm font-semibold text-[var(--ink)]">
          Nama Penyewa <span className="text-red-500">*</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field-input mt-1 min-h-11 w-full"
            placeholder="Contoh: Budi Santoso"
            disabled={submitting || !!success}
          />
        </label>

        <label className="block text-sm font-semibold text-[var(--ink)]">
          Nomor WhatsApp / HP
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="field-input mt-1 min-h-11 w-full"
            placeholder="Contoh: 081234567890"
            disabled={submitting || !!success}
          />
          {!phone ? (
            <span className="mt-1 block text-xs font-normal text-amber-700">
              * Disarankan diisi agar BotKos dapat mengirimkan notifikasi pengingat via bot WhatsApp.
            </span>
          ) : null}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[var(--ink)]">
            Tanggal Mulai Sewa <span className="text-red-500">*</span>
            <input
              type="date"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
              className="field-input mt-1 min-h-11 w-full"
              disabled={submitting || !!success}
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            Jatuh Tempo Berikutnya <span className="text-red-500">*</span>
            <input
              type="date"
              value={nextDueDate}
              onChange={(event) => setNextDueDate(event.target.value)}
              className="field-input mt-1 min-h-11 w-full"
              disabled={submitting || !!success}
            />
          </label>
        </div>

        <label className="block text-sm font-semibold text-[var(--ink)]">
          Status Pembayaran Saat Ini
          <select
            value={paidStatus}
            onChange={(event) => setPaidStatus(event.target.value as ImportPaidStatus)}
            className="field-input mt-1 min-h-11 w-full font-medium"
            disabled={submitting || !!success}
          >
            <option value="unpaid_current">Belum dibayar bulan ini</option>
            <option value="paid_current">Sudah dibayar bulan ini (Lunas)</option>
            <option value="paid_ahead">Sudah dibayar di muka sampai periode tertentu</option>
          </select>
        </label>

        {paidStatus === "paid_ahead" ? (
          <label className="block text-sm font-semibold text-[var(--ink)]">
            Dibayar Sampai Periode (Format YYYY-MM)
            <input
              value={paidThroughPeriod}
              onChange={(event) => setPaidThroughPeriod(event.target.value)}
              className="field-input mt-1 min-h-11 w-full"
              placeholder="Contoh: 2026-12"
              disabled={submitting || !!success}
            />
          </label>
        ) : null}

        <label className="block text-sm font-semibold text-[var(--ink)]">
          Nominal Pembayaran Terakhir (Opsional)
          <input
            type="number"
            value={lastPaymentAmount}
            onChange={(event) => setLastPaymentAmount(event.target.value)}
            className="field-input mt-1 min-h-11 w-full"
            placeholder={`Default sewa: Rp ${(room.monthlyRent || 0).toLocaleString("id-ID")}`}
            disabled={submitting || !!success}
          />
        </label>
      </section>

      {/* Preview Section */}
      {preview?.ok ? (
        <section className="rounded-2xl border border-[var(--line)] bg-stone-50/80 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Pratinjau Jadwal Tagihan
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
            Jatuh tempo setiap tanggal {preview.dueDay} per bulan.
          </p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            {preview.periods.length} catatan tagihan periode akan otomatis disiapkan di sistem.
          </p>
        </section>
      ) : null}

      {/* Error alert */}
      {error ? (
        <p className="rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm font-medium text-red-700 border border-red-200">
          {error}
        </p>
      ) : null}

      {/* Success alert */}
      {success ? (
        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-900 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 size={18} className="text-emerald-700" />
            <span>{success}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/dashboard/properties/${propertyId}/penghuni`}
              className="button-primary min-h-10 text-xs font-semibold px-4"
            >
              Lihat di Daftar Penghuni
            </Link>

            <Link
              href={`/dashboard/properties/${propertyId}/kamar`}
              className="button-secondary min-h-10 text-xs font-semibold px-4"
            >
              Kembali ke Kamar
            </Link>
          </div>
        </div>
      ) : null}

      {/* Sticky Bottom Submit Button */}
      {!success && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-white/95 p-3 backdrop-blur shadow-lg">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="button-primary mx-auto min-h-11 w-full max-w-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Users size={16} />
            <span>{submitting ? "Menyimpan data…" : "Simpan Data Penyewa"}</span>
          </button>
        </div>
      )}
    </main>
  )
}
