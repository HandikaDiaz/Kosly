"use client"

import { FormEvent, useEffect, useId, useState } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "convex/react"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import { ImageLightbox } from "./image-lightbox"
import { MultiImageUploadField } from "./multi-image-upload-field"
import { X, Trash2 } from "lucide-react"

export type EditablePropertyPhoto = { _id: Id<"property_photos">; storageId: Id<"_storage">; url: string | null; caption?: string }

interface EditPropertyModalProps {
  property: { _id: Id<"properties">; name: string; address: string; slug: string }
  photos: EditablePropertyPhoto[]
  onClose: () => void
  onSuccess: () => void
}

export function EditPropertyModal({ property, photos, onClose, onSuccess }: EditPropertyModalProps) {
  const update = useMutation(api.properties.update)
  const generateUploadUrl = useMutation(api.propertyPhotos.generateUploadUrl)
  const [keptPhotos, setKeptPhotos] = useState(photos)
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; alt: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    document.addEventListener("keydown", handleEscape)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleEscape) }
  }, [onClose])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (keptPhotos.length + newPhotos.length < 3) { setError("Minimal 3 foto properti wajib tersedia."); return }
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const storageIds = keptPhotos.map((photo) => photo.storageId)
      for (const file of newPhotos) {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, { method: "POST", headers: { "content-type": file.type }, body: file })
        if (!response.ok) throw new Error(`Upload foto ${file.name} gagal.`)
        const uploaded = await response.json() as { storageId: string }
        storageIds.push(uploaded.storageId as Id<"_storage">)
      }
      await update({ propertyId: property._id, name: String(form.get("name") ?? "").trim(), address: String(form.get("address") ?? "").trim(), slug: String(form.get("slug") ?? "").trim(), propertyPhotoStorageIds: storageIds })
      onSuccess()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Properti belum dapat diperbarui.")
    } finally { setSubmitting(false) }
  }

  return createPortal(
    <div className="add-room-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="add-room-dialog max-w-3xl" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <div className="add-room-header">
          <div><p className="add-room-eyebrow">Pengelolaan properti</p><h2 id={`${id}-title`} className="add-room-title">Edit Properti</h2></div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Tutup modal edit properti" className="add-room-close"><X size={18} /></button>
        </div>
        <form onSubmit={(event) => void handleSubmit(event)} className="max-h-[78vh] space-y-6 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`${id}-name`} className="field-label">Nama properti</label><input id={`${id}-name`} className="field-input" name="name" defaultValue={property.name} required /></div>
            <div><label htmlFor={`${id}-slug`} className="field-label">Link pendaftaran</label><input id={`${id}-slug`} className="field-input" name="slug" defaultValue={property.slug} required /></div>
            <div className="sm:col-span-2"><label htmlFor={`${id}-address`} className="field-label">Alamat properti</label><textarea id={`${id}-address`} className="field-input min-h-24 resize-y" name="address" defaultValue={property.address} required /></div>
          </div>

          <div className="border-t border-[var(--line)] pt-5">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-[var(--ink)]">Foto properti</h3><p className="mt-1 text-xs text-[var(--ink-muted)]">Minimal 3 foto harus tetap tersedia.</p></div><span className="text-xs text-[var(--ink-muted)]">{keptPhotos.length + newPhotos.length} foto</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {keptPhotos.map((photo) => photo.url ? <div key={photo._id} className="relative overflow-hidden border border-[var(--line)]"><button type="button" onClick={() => setPreviewPhoto({ url: photo.url!, alt: photo.caption ?? `Foto ${property.name}` })} className="block h-28 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wood)]"><img src={photo.url} alt={photo.caption ?? `Foto ${property.name}`} className="h-full w-full cursor-zoom-in object-cover" /></button><button type="button" onClick={() => setKeptPhotos((current) => current.filter((item) => item._id !== photo._id))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-red-600 text-white" aria-label="Hapus foto properti"><Trash2 size={12} /></button></div> : null)}
            </div>
            <div className="mt-4"><MultiImageUploadField label="Tambah foto" hint="Foto baru akan ditambahkan saat disimpan." files={newPhotos} onChange={setNewPhotos} minFiles={0} /></div>
          </div>

          {error && <div role="alert" className="add-room-server-error">{error}</div>}
          <div className="add-room-actions px-0 pb-0"><button type="button" onClick={onClose} disabled={submitting} className="button-secondary">Batal</button><button type="submit" disabled={submitting} className="button-primary">{submitting ? "Menyimpan…" : "Simpan perubahan"}</button></div>
        </form>
        {previewPhoto && <ImageLightbox src={previewPhoto.url} alt={previewPhoto.alt} title={`Foto ${property.name}`} onClose={() => setPreviewPhoto(null)} />}
      </div>
    </div>,
    document.body,
  )
}
