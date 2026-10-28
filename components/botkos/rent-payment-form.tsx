"use client"

import { ArrowUpRight, Check, CheckCircle2, Copy, CreditCard, Search } from "lucide-react"
import { FormEvent, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { FieldLabel } from "./field-label"
import { ImageUploadField } from "./image-upload-field"

export function RentPaymentForm({
  propertyName,
  slug,
}: {
  propertyName: string
  slug: string
}) {
  const [phone, setPhone] = useState("")
  const [lookupPhone, setLookupPhone] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)

  const tenant = useQuery(
    api.rentals.getTenantForPayment,
    lookupPhone ? { slug, phone: lookupPhone } : "skip"
  )
  const generateUploadUrl = useMutation(api.publicRegistration.generateUploadUrl)
  const submitRentPayment = useMutation(api.rentals.submitRentPayment)

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitted(false)
    setLookupPhone(phone.trim())
  }

  const handleCopyAccount = () => {
    if (tenant?.bankAccountNumber) {
      void navigator.clipboard.writeText(tenant.bankAccountNumber)
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2000)
    }
  }

  const handleCopyAmount = () => {
    if (tenant?.amountDue) {
      void navigator.clipboard.writeText(String(tenant.amountDue))
      setCopiedAmount(true)
      setTimeout(() => setCopiedAmount(false), 2000)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!tenant) {
        throw new Error("Cari data penyewa terlebih dahulu.")
      }

      if (!proofFile) {
        throw new Error("Unggah gambar bukti pembayaran terlebih dahulu.")
      }

      const form = new FormData(event.currentTarget)
      const numAmount = Number(form.get("amount") ?? tenant.monthlyRent)
      if (!numAmount || numAmount <= 0) {
        throw new Error("Nominal pembayaran wajib lebih dari 0.")
      }

      const uploadUrl = await generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": proofFile.type },
        body: proofFile,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload bukti pembayaran gagal. Silakan coba lagi.")
      }

      const uploaded = (await uploadResponse.json()) as { storageId: string }

      await submitRentPayment({
        slug,
        tenantId: tenant.tenantId as Id<"tenants">,
        bookingId: tenant.bookingId as Id<"bookings"> | undefined,
        amount: numAmount,
        dueDate: tenant.dueDate,
        billingPeriod: tenant.period,
        proofStorageId: uploaded.storageId as Id<"_storage">,
      })

      setSubmitted(true)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Pembayaran gagal dikirim."
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="border border-[var(--line)] bg-[#fffefa] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wood)]/10 text-[var(--wood)]">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Bukti Pembayaran Terkirim
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
          Terima kasih. Bukti pembayaran Anda untuk <strong>{propertyName}</strong>{" "}
          telah kami teruskan ke pemilik kos untuk diverifikasi.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false)
            setProofFile(null)
          }}
          className="button-secondary mt-6"
        >
          Kirim Bukti Lain
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Search Form ── */}
      <form
        onSubmit={handleLookup}
        className="border border-[var(--line)] bg-[#fffefa] p-6 sm:p-8"
      >
        <FieldLabel
          htmlFor="phone"
          label="Nomor WhatsApp terdaftar"
          required
          hint="Gunakan nomor WhatsApp yang Anda daftarkan saat awal masuk kos."
        />
        <div className="mt-1.5 flex gap-2">
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            className="field-input"
            placeholder="Contoh: 081234567890"
          />
          <button type="submit" className="button-primary shrink-0">
            <Search size={16} />
            Cari
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          Sistem akan mencari data penyewa aktif berdasarkan nomor telepon.
        </p>
      </form>

      {/* ── Not Found Warning ── */}
      {lookupPhone && tenant === null && (
        <div
          role="alert"
          className="border border-[var(--warn)] bg-red-50/40 p-5 text-sm text-[var(--warn)]"
        >
          Data penyewa aktif tidak ditemukan untuk nomor <strong>{lookupPhone}</strong>. Periksa kembali nomor WhatsApp Anda.
        </div>
      )}

      {/* ── Rent Payment Upload Form ── */}
      {tenant && (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-6 border border-[var(--line)] bg-[#fffefa] p-6 sm:p-8"
          noValidate
        >
          {/* Tenant summary info header */}
          <div className="border-b border-[var(--line)] pb-5">
            <span className="inline-block border border-[var(--line)] bg-[var(--background)] px-2.5 py-0.5 text-xs font-medium text-[var(--wood)]">
              Data Penyewa Ditemukan
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              {tenant.name} · Kamar {tenant.roomNumber}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)] font-mono">
              Periode: {tenant.period} · Jatuh tempo:{" "}
              {new Date(tenant.dueDate).toLocaleDateString("id-ID")}
            </p>
          </div>

          {/* Rekening Tujuan Pembayaran Card */}
          <div className="rounded-2xl border border-[var(--wood)]/40 bg-[#fffdf8] p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <CreditCard size={15} />
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                Rekening Tujuan Pembayaran
              </h3>
            </div>

            {tenant.bankAccountNumber ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[var(--line)] bg-white p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--ink-muted)]">Bank / Metode</span>
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-[var(--ink)] uppercase">
                      {tenant.bankName || "Transfer Bank"}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-[var(--ink-muted)]">Nomor Rekening</p>
                      <p className="font-mono text-base font-bold tracking-wider text-[var(--ink)]">
                        {tenant.bankAccountNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#fffdfa] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--wood)] hover:bg-[#fff7ea]"
                    >
                      {copiedAccount ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="text-[var(--ink-muted)]" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>

                  {tenant.bankAccountHolder && (
                    <div className="mt-2 border-t border-[var(--line)]/60 pt-2 text-xs text-[var(--ink-muted)]">
                      Atas Nama: <strong className="text-[var(--ink)]">{tenant.bankAccountHolder}</strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white p-3.5">
                  <div>
                    <p className="text-[11px] text-[var(--ink-muted)]">Nominal yang Harus Ditransfer</p>
                    <p className="font-mono text-base font-bold text-[var(--wood)]">
                      Rp {tenant.amountDue.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAmount}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#fffdfa] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--wood)] hover:bg-[#fff7ea]"
                  >
                    {copiedAmount ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-[var(--ink-muted)]" />
                        <span>Salin Nominal</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] leading-relaxed text-[var(--ink-muted)]">
                  💡 <em>Silakan transfer sesuai nominal ke rekening di atas, lalu unggah foto resi / tangkapan layar bukti transfer pada formulir di bawah.</em>
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                <p>
                  Nomor rekening kos belum diatur di sistem oleh pemilik. Silakan hubungi pemilik kos untuk konfirmasi nomor rekening pembayaran sebelum mengunggah bukti transfer.
                </p>
              </div>
            )}
          </div>

          {/* 1. Nominal pembayaran */}
          <div>
            <FieldLabel
              htmlFor="amount"
              label="Nominal pembayaran / perpanjangan"
              required
              hint="Masukkan total nominal sewa yang Anda transfer."
            />
            <div className="field-input-prefix-wrap mt-1">
              <span className="field-input-prefix" aria-hidden="true">
                Rp
              </span>
              <input
                id="amount"
                name="amount"
                type="number"
                min="1"
                defaultValue={tenant.amountDue}
                className="field-input field-input-prefixed font-mono font-semibold"
                required
              />
            </div>
            {tenant.isSettlement ? (
              <div className="mt-4 border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
                <div className="flex justify-between gap-4 text-[var(--ink-muted)]"><span>Sewa + deposit</span><span className="font-mono text-[var(--ink)]">Rp {tenant.initialTotal.toLocaleString("id-ID")}</span></div>
                <div className="mt-2 flex justify-between gap-4 text-[var(--ink-muted)]"><span>DP sudah dibayar</span><span className="font-mono text-[var(--ink)]">-Rp {tenant.dpPaid.toLocaleString("id-ID")}</span></div>
                <div className="mt-3 flex justify-between gap-4 border-t border-[var(--line)] pt-3 font-semibold text-[var(--ink)]"><span>Sisa pelunasan</span><span className="font-mono">Rp {tenant.amountDue.toLocaleString("id-ID")}</span></div>
              </div>
            ) : tenant.isFirstPayment ? (
              <div className="mt-4 border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
                <div className="flex justify-between gap-4 text-[var(--ink-muted)]"><span>Sewa bulan pertama</span><span className="font-mono text-[var(--ink)]">Rp {tenant.monthlyRent.toLocaleString("id-ID")}</span></div>
                <div className="mt-2 flex justify-between gap-4 text-[var(--ink-muted)]"><span>Deposit</span><span className="font-mono text-[var(--ink)]">Rp {tenant.depositAmount.toLocaleString("id-ID")}</span></div>
                <div className="mt-3 flex justify-between gap-4 border-t border-[var(--line)] pt-3 font-semibold text-[var(--ink)]"><span>Total pembayaran pertama</span><span className="font-mono">Rp {tenant.initialTotal.toLocaleString("id-ID")}</span></div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--ink-muted)]">Pembayaran bulan berikutnya hanya mencakup sewa bulanan. Deposit tidak ditarik ulang.</p>
            )}
          </div>

          {/* 2. Bukti Pembayaran (ImageUploadField with preview) */}
          <div>
            <ImageUploadField
              id="proof"
              name="proof"
              label="Bukti pembayaran"
              hint="Unggah foto/tangkapan layar resi transfer bank atau e-wallet."
              required
              value={proofFile}
              onChange={(file) => setProofFile(file)}
              maxSizeMB={5}
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="border border-[var(--warn)] bg-red-50/40 p-3 text-sm text-[var(--warn)]"
            >
              {error}
            </div>
          )}

          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            Pembayaran akan masuk ke review manual pemilik. Anda dapat menggunakan
            form ini untuk tagihan bulan berjalan atau perpanjangan kontrak sewa.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full justify-center py-3.5 text-base font-semibold disabled:opacity-60"
          >
            {loading ? "Mengirim Bukti Pembayaran…" : "Kirim Bukti Pembayaran"}{" "}
            <ArrowUpRight size={18} />
          </button>
        </form>
      )}
    </div>
  )
}
