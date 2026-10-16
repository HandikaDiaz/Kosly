"use client"

import { FormEvent, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { ImageUploadField } from "./image-upload-field"

export function IdentityVerificationForm({ status }: { status?: "not_submitted" | "pending_review" | "verified" | "rejected" }) {
  const generateUploadUrl = useMutation(api.verifications.generateUploadUrl)
  const submitIdentity = useMutation(api.verifications.submitIdentity)
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const upload = async (file: File) => {
    const uploadUrl = await generateUploadUrl()
    const response = await fetch(uploadUrl, { method: "POST", headers: { "content-type": file.type }, body: file })
    if (!response.ok) throw new Error("Upload dokumen gagal. Silakan coba lagi.")
    const result = (await response.json()) as { storageId: string }
    return result.storageId as Id<"_storage">
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    if (!ktpFile || !selfieFile) return setMessage("KTP dan selfie wajib diunggah.")
    if (!consent) return setMessage("Persetujuan pemrosesan dokumen wajib dicentang.")
    setLoading(true)
    try {
      await submitIdentity({ ktpStorageId: await upload(ktpFile), selfieStorageId: await upload(selfieFile) })
      setMessage("Dokumen berhasil dikirim dan menunggu review admin.")
      setKtpFile(null)
      setSelfieFile(null)
      setConsent(false)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Pengiriman dokumen gagal.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-12 border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
      <p className="text-sm text-[var(--ink-muted)]">Kepercayaan akun</p>
      <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">Verifikasi identitas</h2>
      {status !== "verified" && <p className="mt-3 border-l-2 border-[var(--gold)] bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]">Identitas belum terverifikasi. Tenant belum dapat mengirim pendaftaran, DP, maupun pembayaran sampai admin menyetujui dokumen Anda.</p>}
      {status === "verified" && <p className="mt-3 text-sm text-emerald-700">Identitas sudah terverifikasi. Tenant dapat melanjutkan transaksi.</p>}
      {status !== "verified" && (
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <ImageUploadField id="identity-ktp" name="identity-ktp" label="Foto KTP" hint="Pastikan seluruh bagian penting terlihat jelas." required value={ktpFile} onChange={setKtpFile} maxSizeMB={5} />
            <ImageUploadField id="identity-selfie" name="identity-selfie" label="Foto selfie" hint="Gunakan pencahayaan yang cukup dan wajah terlihat jelas." required value={selfieFile} onChange={setSelfieFile} maxSizeMB={5} />
          </div>
          <p className="border-l-2 border-[var(--gold)] bg-[var(--background)] px-4 py-3 text-xs leading-5 text-[var(--ink-muted)]">
            KTP dan selfie digunakan hanya untuk verifikasi identitas, disimpan maksimal 90 hari setelah keputusan verifikasi, dan hanya dapat dilihat admin untuk keperluan review.
          </p>
          <label className="flex items-start gap-3 text-sm text-[var(--ink-muted)]">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
            <span>Saya menyetujui pemrosesan dan penyimpanan KTP serta selfie sesuai penjelasan di atas.</span>
          </label>
          {message ? <p role="status" className="text-sm text-[var(--ink-muted)]">{message}</p> : null}
          <button type="submit" disabled={loading} className="button-primary disabled:opacity-60">{loading ? "Mengirim…" : "Kirim untuk review"}</button>
        </form>
      )}
    </section>
  )
}
