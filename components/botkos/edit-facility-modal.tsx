"use client"

import { useState, useEffect, useId, FormEvent } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { FieldLabel } from "./field-label"
import { X, Trash2 } from "lucide-react"

const facilityLabels = {
  shared: "Fasilitas bersama",
  services: "Komplementer & servis",
  parking: "Area parkir",
  security: "Keamanan & akses",
  sports: "Olahraga & hiburan",
  other: "Lainnya",
} as const

type FacilityCategory = keyof typeof facilityLabels

export type PropertyFacilityItem = {
  _id: Id<"property_facilities">
  category: FacilityCategory
  name: string
  description?: string
  isActive: boolean
}

interface EditFacilityModalProps {
  facility: PropertyFacilityItem
  onClose: () => void
  onSuccess: (message: string) => void
}

export function EditFacilityModal({
  facility,
  onClose,
  onSuccess,
}: EditFacilityModalProps) {
  const updateFacility = useMutation(api.propertyFacilities.update)
  const removeFacility = useMutation(api.propertyFacilities.remove)

  const [name, setName] = useState(facility.name)
  const [category, setCategory] = useState<FacilityCategory>(facility.category)
  const [description, setDescription] = useState(facility.description ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = useId()

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (!name.trim()) {
        throw new Error("Nama fasilitas tidak boleh kosong.")
      }

      await updateFacility({
        facilityId: facility._id,
        category,
        name: name.trim(),
        description: description.trim() || undefined,
      })

      onSuccess("Fasilitas berhasil diperbarui.")
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gagal memperbarui fasilitas."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus fasilitas "${facility.name}"?`)) {
      return
    }

    setError(null)
    setDeleting(true)

    try {
      await removeFacility({ facilityId: facility._id })
      onSuccess("Fasilitas telah dihapus.")
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gagal menghapus fasilitas."
      )
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <div
      className="add-room-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="add-room-dialog max-w-lg"
      >
        {/* ── Header ── */}
        <div className="add-room-header pb-4 border-b border-[var(--line)]">
          <div>
            <p className="add-room-eyebrow">Fasilitas Properti</p>
            <h2 id={`${id}-title`} className="add-room-title">
              Edit Fasilitas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal edit fasilitas"
            className="add-room-close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
          <div>
            <FieldLabel
              htmlFor={`${id}-name`}
              label="Nama Fasilitas"
              required
              hint="Nama fasilitas yang akan muncul pada link pendaftaran penyewa."
            />
            <input
              id={`${id}-name`}
              className="field-input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Wi-Fi Cepat 100Mbps"
            />
          </div>

          <div>
            <FieldLabel
              htmlFor={`${id}-category`}
              label="Kategori Fasilitas"
              required
              hint="Kelompokkan fasilitas agar rapi di halaman pendaftaran penyewa."
            />
            <select
              id={`${id}-category`}
              className="field-input mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value as FacilityCategory)}
            >
              {(Object.keys(facilityLabels) as FacilityCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {facilityLabels[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel
              htmlFor={`${id}-description`}
              label="Keterangan (Opsional)"
              hint="Detail tambahan mengenai fasilitas, misal: 'Tersedia di semua lantai' atau '24 jam'."
            />
            <input
              id={`${id}-description`}
              className="field-input mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Bebas kuota 24 jam"
            />
          </div>

          {error && (
            <div role="alert" className="text-sm text-[var(--warn)] pt-1">
              {error}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4 mt-6">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={submitting || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--warn)] hover:bg-red-50"
            >
              <Trash2 size={14} />
              {deleting ? "Menghapus…" : "Hapus Fasilitas"}
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || deleting}
                className="button-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                className="button-primary"
              >
                {submitting ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
