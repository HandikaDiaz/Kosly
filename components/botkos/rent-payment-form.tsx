"use client"

import { ArrowUpRight, CheckCircle2, Search } from "lucide-react"
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
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Pemilik <strong className="text-[var(--ink)]">{propertyName}</strong>{" "}
          akan memeriksa bukti transfer Anda. Status sewa kamar akan otomatis
          diperbarui setelah diverifikasi.
        </p>
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
                defaultValue={tenant.monthlyRent}
                className="field-input field-input-prefixed font-mono font-semibold"
                required
              />
            </div>
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
