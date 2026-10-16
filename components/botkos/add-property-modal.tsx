"use client"

import { useEffect, useId, FormEvent, useState } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { X } from "lucide-react"
import { parseTierLimitError, type TierLimitInfo } from "./tier-limit-modal"
import { MultiImageUploadField } from "./multi-image-upload-field"

interface AddPropertyModalProps {
  onClose: () => void
  onSuccess: () => void
  onTierLimit: (info: TierLimitInfo) => void
}

export function AddPropertyModal({ onClose, onSuccess, onTierLimit }: AddPropertyModalProps) {
  const create = useMutation(api.properties.create)
  const generateUploadUrl = useMutation(api.propertyPhotos.generateUploadUrl)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propertyPhotos, setPropertyPhotos] = useState<File[]>([])
  const id = useId()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      if (propertyPhotos.length < 3) throw new Error("Minimal 3 foto properti wajib diunggah.")
      const propertyPhotoStorageIds: Id<"_storage">[] = []
      for (const file of propertyPhotos) {
        const uploadUrl = await generateUploadUrl()
        const uploadResponse = await fetch(uploadUrl, { method: "POST", headers: { "content-type": file.type }, body: file })
        if (!uploadResponse.ok) throw new Error(`Upload foto ${file.name} gagal.`)
        const uploaded = await uploadResponse.json() as { storageId: string }
        propertyPhotoStorageIds.push(uploaded.storageId as Id<"_storage">)
      }
      await create({
        name: String(form.get("name") ?? "").trim(),
        address: String(form.get("address") ?? "").trim(),
        slug: String(form.get("slug") ?? "").trim(),
        propertyPhotoStorageIds,
      })
      setPropertyPhotos([])
      onSuccess()
    } catch (reason) {
      const tierError = parseTierLimitError(reason)
      if (tierError) onTierLimit(tierError)
      else setError(reason instanceof Error ? reason.message : "Properti belum dapat ditambahkan. Periksa kembali data lalu coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="add-room-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="add-room-dialog max-w-2xl" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <div className="add-room-header">
          <div>
            <p className="add-room-eyebrow">Pengelolaan properti</p>
            <h2 id={`${id}-title`} className="add-room-title">Tambah Properti</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal tambah properti" className="add-room-close" disabled={submitting}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-name`} className="field-label">Nama properti</label>
              <input id={`${id}-name`} className="field-input" name="name" required placeholder="Contoh: Kos Melati" autoFocus />
            </div>
            <div>
              <label htmlFor={`${id}-slug`} className="field-label">Link properti</label>
              <input id={`${id}-slug`} className="field-input" name="slug" required placeholder="kos-melati" />
              <p className="mt-1 text-[11px] text-[var(--ink-muted)]">Dipakai pada halaman pendaftaran publik.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-address`} className="field-label">Alamat properti</label>
              <textarea id={`${id}-address`} className="field-input min-h-24 resize-y" name="address" required placeholder="Alamat lengkap properti" />
            </div>
            <div className="sm:col-span-2">
              <MultiImageUploadField
                label="Foto properti"
                hint="Unggah minimal tiga foto area properti yang jelas."
                files={propertyPhotos}
                onChange={setPropertyPhotos}
                error={error?.includes("foto") ? error : null}
              />
            </div>
          </div>

          {error && <div role="alert" className="add-room-server-error mt-5">{error}</div>}

          <div className="add-room-actions mt-5 px-0 pb-0">
            <button type="button" onClick={onClose} disabled={submitting} className="button-secondary">Batal</button>
            <button type="submit" disabled={submitting} className="button-primary">{submitting ? "Menyimpan…" : "Simpan properti"}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
