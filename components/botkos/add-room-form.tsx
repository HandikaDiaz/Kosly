"use client"

import { type FormEvent, useEffect, useId, useState } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { FieldLabel } from "./field-label"
import { X } from "lucide-react"

// ─── tiny utilities ──────────────────────────────────────────────────────────

const optionalText = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim() || undefined

const listField = (form: FormData, name: string) =>
  String(form.get(name) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)

// ─── field-level validation ──────────────────────────────────────────────────

type FieldErrors = Partial<Record<string, string>>

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {}
  if (!String(form.get("roomNumber") ?? "").trim())
    errors.roomNumber = "Nomor kamar wajib diisi."
  const rent = Number(form.get("monthlyRent") ?? 0)
  if (!rent || rent < 1)
    errors.monthlyRent = "Harga sewa wajib diisi dan harus lebih dari 0."
  return errors
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FieldGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="add-room-group">
      <legend className="add-room-legend">{legend}</legend>
      <div className="add-room-fields">{children}</div>
    </fieldset>
  )
}

function FieldWrap({
  children,
  error,
  span,
}: {
  children: React.ReactNode
  error?: string
  span?: "full"
}) {
  return (
    <div className={`add-room-field-wrap${span === "full" ? " add-room-field-span-full" : ""}`}>
      {children}
      {error && <p role="alert" className="add-room-field-error">{error}</p>}
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

interface AddRoomFormProps {
  propertyId: Id<"properties">
  onClose: () => void
  onSuccess: (message: string) => void
}

export function AddRoomForm({ propertyId, onClose, onSuccess }: AddRoomFormProps) {
  const createRoom = useMutation(api.rooms.create)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const id = useId()
  const fid = (name: string) => `${id}-${name}`

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)
    const form = new FormData(event.currentTarget)
    const errors = validate(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      document.getElementById(fid(Object.keys(errors)[0]))?.focus()
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await createRoom({
        propertyId,
        roomNumber: String(form.get("roomNumber") ?? ""),
        monthlyRent: Number(form.get("monthlyRent") ?? 0),
        floor: optionalText(form, "floor"),
        roomType: optionalText(form, "roomType"),
        sizeSqm: Number(form.get("sizeSqm") ?? 0) || undefined,
        maxOccupants: Number(form.get("maxOccupants") ?? 0) || undefined,
        genderCategory: optionalText(form, "genderCategory") as "male" | "female" | "mixed" | undefined,
        bathroomType: optionalText(form, "bathroomType") as "private" | "shared" | "none" | undefined,
        bathroomFacilities: listField(form, "bathroomFacilities"),
        furnitureElectronics: listField(form, "furnitureElectronics"),
        bedSize: optionalText(form, "bedSize"),
        annualRent: Number(form.get("annualRent") ?? 0) || undefined,
        depositFee: Number(form.get("depositFee") ?? 0) || undefined,
        dpAmount: Number(form.get("dpAmount") ?? 0) || undefined,
        dp_max_days: Number(form.get("dp_max_days") ?? 0) || undefined,
        electricityStatus: optionalText(form, "electricityStatus") as "included" | "metered" | "excluded" | undefined,
        additionalFees: optionalText(form, "additionalFees"),
        description: optionalText(form, "description"),
      })
      onSuccess("Kamar berhasil ditambahkan.")
      onClose()
    } catch (reason) {
      setServerError(reason instanceof Error ? reason.message : "Kamar gagal ditambahkan.")
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="add-room-overlay"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="add-room-dialog"
      >
        {/* ── Header ── */}
        <div className="add-room-header">
          <div>
            <p className="add-room-eyebrow">Properti</p>
            <h2 id={`${id}-title`} className="add-room-title">Tambah Kamar</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form tambah kamar"
            className="add-room-close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={(e) => void handleSubmit(e)} noValidate>

          {/* Group 1 — Identitas kamar */}
          <FieldGroup legend="Identitas kamar">
            <FieldWrap error={fieldErrors.roomNumber}>
              <FieldLabel
                htmlFor={fid("roomNumber")}
                label="Nomor Kamar"
                required
                hint="Nomor atau nama kamar yang akan ditampilkan ke calon penyewa, misal: Kamar 5 atau A-12."
              />
              <input
                id={fid("roomNumber")}
                className={`field-input${fieldErrors.roomNumber ? " field-input-error" : ""}`}
                name="roomNumber"
                placeholder="Contoh: Kamar 5 atau A-12"
                aria-required="true"
                aria-invalid={!!fieldErrors.roomNumber}
              />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("roomType")}
                label="Tipe Kamar"
                hint="Jenis kamar, misal: Standar, AC, atau Kamar Mandi Dalam — membantu calon penyewa membandingkan kamar."
              />
              <input
                id={fid("roomType")}
                className="field-input"
                name="roomType"
                placeholder="Contoh: Standar, AC, atau KM Dalam"
              />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("floor")}
                label="Posisi Lantai"
                hint="Lantai tempat kamar berada, misal: 1, 2, atau Lantai Dasar."
              />
              <input
                id={fid("floor")}
                className="field-input"
                name="floor"
                placeholder="Contoh: 1 atau Lantai Dasar"
              />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("sizeSqm")}
                label="Ukuran (m²)"
                hint="Luas kamar dalam meter persegi. Informasi ini muncul di halaman kamar yang diakses penyewa."
              />
              <input
                id={fid("sizeSqm")}
                className="field-input"
                name="sizeSqm"
                type="number"
                min="0"
                step="0.1"
                placeholder="Contoh: 12"
              />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("maxOccupants")}
                label="Kapasitas Penghuni"
                hint="Jumlah maksimal penghuni yang diizinkan dalam satu kamar."
              />
              <input
                id={fid("maxOccupants")}
                className="field-input"
                name="maxOccupants"
                type="number"
                min="1"
                placeholder="Contoh: 1 atau 2"
              />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("genderCategory")}
                label="Gender Penghuni"
                hint="Batasan gender penghuni kamar ini: Pria, Wanita, atau Campur (tidak ada batasan)."
              />
              <select id={fid("genderCategory")} className="field-input" name="genderCategory" defaultValue="">
                <option value="">Tidak dibatasi</option>
                <option value="male">Pria</option>
                <option value="female">Wanita</option>
                <option value="mixed">Campur</option>
              </select>
            </FieldWrap>
          </FieldGroup>

          {/* Group 2 — Harga & ketentuan */}
          <FieldGroup legend="Harga &amp; ketentuan">
            <FieldWrap error={fieldErrors.monthlyRent}>
              <FieldLabel
                htmlFor={fid("monthlyRent")}
                label="Harga Sewa Bulanan"
                required
                hint="Harga sewa per bulan dalam Rupiah. Ini yang akan muncul di link pendaftaran penyewa."
              />
              <div className="field-input-prefix-wrap">
                <span className="field-input-prefix" aria-hidden="true">Rp</span>
                <input
                  id={fid("monthlyRent")}
                  className={`field-input field-input-prefixed${fieldErrors.monthlyRent ? " field-input-error" : ""}`}
                  name="monthlyRent"
                  type="number"
                  min="1"
                  placeholder="Contoh: 1500000"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.monthlyRent}
                />
              </div>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("annualRent")}
                label="Harga Sewa Tahunan"
                hint="Harga sewa jika penyewa membayar setahun penuh. Biasanya lebih murah dari 12× bulanan."
              />
              <div className="field-input-prefix-wrap">
                <span className="field-input-prefix" aria-hidden="true">Rp</span>
                <input
                  id={fid("annualRent")}
                  className="field-input field-input-prefixed"
                  name="annualRent"
                  type="number"
                  min="0"
                  placeholder="Contoh: 16000000"
                />
              </div>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("depositFee")}
                label="Uang Deposit"
                hint="Uang jaminan yang dibayar penyewa di awal. Dikembalikan saat penyewa keluar dalam kondisi baik."
              />
              <div className="field-input-prefix-wrap">
                <span className="field-input-prefix" aria-hidden="true">Rp</span>
                <input
                  id={fid("depositFee")}
                  className="field-input field-input-prefixed"
                  name="depositFee"
                  type="number"
                  min="0"
                  placeholder="Contoh: 1500000"
                />
              </div>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("dpAmount")}
                label="Nominal DP Booking"
                hint="Nominal tanda jadi (DP) minimal untuk mengunci kamar ini saat penyewa mendaftar secara online."
              />
              <div className="field-input-prefix-wrap">
                <span className="field-input-prefix" aria-hidden="true">Rp</span>
                <input
                  id={fid("dpAmount")}
                  className="field-input field-input-prefixed"
                  name="dpAmount"
                  type="number"
                  min="0"
                  placeholder="Contoh: 500000"
                />
              </div>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("dp_max_days")}
                label="Maks. Hari Pelunasan setelah DP"
                hint="Berapa hari maksimal yang diizinkan tenant memilih tanggal pelunasan setelah DP dikonfirmasi. Misal: 30 hari."
              />
              <input
                id={fid("dp_max_days")}
                className="field-input"
                name="dp_max_days"
                type="number"
                min="1"
                max="365"
                placeholder="Contoh: 30"
              />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("electricityStatus")}
                label="Status Listrik"
                hint="Cara tagihan listrik dikelola: Termasuk (sudah dalam harga sewa), Meteran (dihitung per pemakaian), atau Terpisah (penyewa bayar langsung ke PLN)."
              />
              <select id={fid("electricityStatus")} className="field-input" name="electricityStatus" defaultValue="">
                <option value="">Pilih status listrik</option>
                <option value="included">Termasuk dalam sewa</option>
                <option value="metered">Meteran (per pemakaian)</option>
                <option value="excluded">Terpisah (bayar sendiri)</option>
              </select>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("status")}
                label="Status Kamar"
                hint="Status kamar saat ini: Tersedia (bisa didaftar penyewa baru), Terisi (sudah ada penyewa), atau Dibooking (DP sudah masuk, menunggu pelunasan)."
              />
              <select id={fid("status")} className="field-input" name="status" defaultValue="available">
                <option value="available">Tersedia</option>
                <option value="occupied">Terisi</option>
                <option value="booked">Dibooking</option>
              </select>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("additionalFees")}
                label="Biaya Tambahan"
                hint="Biaya lain di luar sewa, misal: biaya kebersihan Rp50.000/bulan atau Wi-Fi Rp100.000/bulan."
              />
              <input
                id={fid("additionalFees")}
                className="field-input"
                name="additionalFees"
                placeholder="Contoh: Kebersihan 50rb/bulan"
              />
            </FieldWrap>
          </FieldGroup>

          {/* Group 3 — Fasilitas & kamar mandi */}
          <FieldGroup legend="Fasilitas &amp; kamar mandi">
            <FieldWrap>
              <FieldLabel
                htmlFor={fid("bathroomType")}
                label="Jenis Kamar Mandi"
                hint="Apakah kamar mandi berada di dalam kamar (Dalam/Privat), digunakan bersama penghuni lain (Bersama), atau tidak ada."
              />
              <select id={fid("bathroomType")} className="field-input" name="bathroomType" defaultValue="">
                <option value="">Pilih jenis kamar mandi</option>
                <option value="private">Dalam (Privat)</option>
                <option value="shared">Bersama</option>
                <option value="none">Tidak ada</option>
              </select>
            </FieldWrap>

            <FieldWrap>
              <FieldLabel
                htmlFor={fid("bedSize")}
                label="Ukuran Kasur"
                hint="Ukuran kasur yang tersedia di kamar, misal: Single, Double, Queen, atau King."
              />
              <input
                id={fid("bedSize")}
                className="field-input"
                name="bedSize"
                placeholder="Contoh: Single, Queen, atau Double"
              />
            </FieldWrap>

            <FieldWrap span="full">
              <FieldLabel
                htmlFor={fid("bathroomFacilities")}
                label="Fasilitas Kamar Mandi"
                hint="Fasilitas yang ada di kamar mandi, pisahkan dengan koma. Misal: shower, water heater, closet duduk."
              />
              <input
                id={fid("bathroomFacilities")}
                className="field-input"
                name="bathroomFacilities"
                placeholder="Contoh: shower, water heater, closet duduk"
              />
            </FieldWrap>

            <FieldWrap span="full">
              <FieldLabel
                htmlFor={fid("furnitureElectronics")}
                label="Furnitur &amp; Elektronik"
                hint="Fasilitas yang termasuk dalam kamar ini, pisahkan dengan koma. Misal: kasur, lemari, meja belajar, kipas angin, AC."
              />
              <input
                id={fid("furnitureElectronics")}
                className="field-input"
                name="furnitureElectronics"
                placeholder="Contoh: kasur, lemari, meja belajar, AC"
              />
            </FieldWrap>
          </FieldGroup>

          {/* Deskripsi */}
          <div className="add-room-group">
            <FieldWrap span="full">
              <FieldLabel
                htmlFor={fid("description")}
                label="Deskripsi Tambahan"
                hint="Informasi tambahan tentang kamar yang perlu diketahui penyewa. Akan muncul di halaman pendaftaran."
              />
              <textarea
                id={fid("description")}
                className="field-input add-room-textarea"
                name="description"
                placeholder="Contoh: Kamar di lantai 2 dengan pemandangan taman. Cocok untuk mahasiswa."
              />
            </FieldWrap>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="add-room-server-error" role="alert">{serverError}</div>
          )}

          {/* Actions */}
          <div className="add-room-actions">
            <button type="button" onClick={onClose} className="button-secondary" disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="button-primary" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Menyimpan…" : "Simpan Kamar"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
