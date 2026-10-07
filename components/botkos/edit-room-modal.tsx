"use client"

import { useState, useEffect, useId, FormEvent } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { FieldLabel } from "./field-label"
import { X, Trash2, Upload, Image as ImageIcon, Film } from "lucide-react"

// ─── types & helpers ────────────────────────────────────────────────────────

export type RoomMediaItem = {
  _id: Id<"room_media">
  kind: "photo" | "video"
  url: string | null
  caption?: string
  storageId: Id<"_storage">
}

export type RoomItem = {
  _id: Id<"rooms">
  roomNumber: string
  monthlyRent: number
  status: "available" | "booked" | "occupied"
  floor?: string
  roomType?: string
  sizeSqm?: number
  maxOccupants?: number
  genderCategory?: "male" | "female" | "mixed"
  bathroomType?: "private" | "shared" | "none"
  bathroomFacilities?: string[]
  furnitureElectronics?: string[]
  bedSize?: string
  annualRent?: number
  depositFee?: number
  dpAmount?: number
  electricityStatus?: "included" | "metered" | "excluded"
  additionalFees?: string
  description?: string
  media?: RoomMediaItem[]
}

interface EditRoomModalProps {
  room: RoomItem
  mediaList: RoomMediaItem[]
  onClose: () => void
  onSuccess: (message: string) => void
}

const optionalText = (val: string) => val.trim() || undefined
const listToString = (arr?: string[]) => (arr ?? []).join(", ")
const stringToList = (str: string) =>
  str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

export function EditRoomModal({
  room,
  mediaList,
  onClose,
  onSuccess,
}: EditRoomModalProps) {
  const updateRoom = useMutation(api.rooms.update)
  const removeRoom = useMutation(api.rooms.remove)
  const generateUploadUrl = useMutation(api.roomMedia.generateUploadUrl)
  const attachMedia = useMutation(api.roomMedia.attach)
  const removeMedia = useMutation(api.roomMedia.remove)

  // Form state initialization
  const [roomNumber, setRoomNumber] = useState(room.roomNumber)
  const [roomType, setRoomType] = useState(room.roomType ?? "")
  const [floor, setFloor] = useState(room.floor ?? "")
  const [sizeSqm, setSizeSqm] = useState(room.sizeSqm ? String(room.sizeSqm) : "")
  const [maxOccupants, setMaxOccupants] = useState(
    room.maxOccupants ? String(room.maxOccupants) : ""
  )
  const [genderCategory, setGenderCategory] = useState(room.genderCategory ?? "")
  const [monthlyRent, setMonthlyRent] = useState(String(room.monthlyRent))
  const [annualRent, setAnnualRent] = useState(
    room.annualRent ? String(room.annualRent) : ""
  )
  const [depositFee, setDepositFee] = useState(
    room.depositFee ? String(room.depositFee) : ""
  )
  const [dpAmount, setDpAmount] = useState(
    room.dpAmount ? String(room.dpAmount) : ""
  )
  const [electricityStatus, setElectricityStatus] = useState(
    room.electricityStatus ?? ""
  )
  const [status, setStatus] = useState(room.status)
  const [additionalFees, setAdditionalFees] = useState(
    room.additionalFees ?? ""
  )
  const [bathroomType, setBathroomType] = useState(room.bathroomType ?? "")
  const [bedSize, setBedSize] = useState(room.bedSize ?? "")
  const [bathroomFacilities, setBathroomFacilities] = useState(
    listToString(room.bathroomFacilities)
  )
  const [furnitureElectronics, setFurnitureElectronics] = useState(
    listToString(room.furnitureElectronics)
  )
  const [description, setDescription] = useState(room.description ?? "")

  // Media upload state
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
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

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Save Room Details
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (!roomNumber.trim()) {
        throw new Error("Nomor kamar wajib diisi.")
      }
      const rentNum = Number(monthlyRent)
      if (!rentNum || rentNum <= 0) {
        throw new Error("Harga sewa bulanan wajib lebih dari 0.")
      }

      await updateRoom({
        roomId: room._id,
        roomNumber: roomNumber.trim(),
        monthlyRent: rentNum,
        status,
        floor: optionalText(floor),
        roomType: optionalText(roomType),
        sizeSqm: Number(sizeSqm) || undefined,
        maxOccupants: Number(maxOccupants) || undefined,
        genderCategory: (genderCategory as "male" | "female" | "mixed") || undefined,
        bathroomType: (bathroomType as "private" | "shared" | "none") || undefined,
        bathroomFacilities: stringToList(bathroomFacilities),
        furnitureElectronics: stringToList(furnitureElectronics),
        bedSize: optionalText(bedSize),
        annualRent: Number(annualRent) || undefined,
        depositFee: Number(depositFee) || undefined,
        dpAmount: Number(dpAmount) || undefined,
        electricityStatus:
          (electricityStatus as "included" | "metered" | "excluded") || undefined,
        additionalFees: optionalText(additionalFees),
        description: optionalText(description),
      })

      onSuccess(`Kamar ${roomNumber} berhasil diperbarui.`)
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gagal memperbarui kamar."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Upload Media
  const handleUploadMedia = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!mediaFile) return
    setError(null)
    setUploadingMedia(true)

    try {
      const kind = mediaFile.type.startsWith("video/") ? "video" : "photo"
      const url = await generateUploadUrl()

      const uploadResponse = await fetch(url, {
        method: "POST",
        headers: { "content-type": mediaFile.type },
        body: mediaFile,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload file media gagal.")
      }

      const uploaded = (await uploadResponse.json()) as { storageId: string }
      await attachMedia({
        roomId: room._id,
        storageId: uploaded.storageId as Id<"_storage">,
        kind,
        sortOrder: Date.now(),
        caption: optionalText(caption),
      })

      setMediaFile(null)
      setCaption("")
      onSuccess("Media kamar berhasil diunggah.")
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Media gagal diunggah."
      )
    } finally {
      setUploadingMedia(false)
    }
  }

  // Delete Media
  const handleDeleteMedia = async (mediaId: Id<"room_media">) => {
    setError(null)
    setDeletingMediaId(mediaId)

    try {
      await removeMedia({ mediaId })
      onSuccess("Media kamar berhasil dihapus.")
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gagal menghapus media."
      )
    } finally {
      setDeletingMediaId(null)
    }
  }

  // Delete Room
  const handleDeleteRoom = async () => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus Kamar ${room.roomNumber}? Seluruh media kamar ini juga akan dihapus.`
      )
    ) {
      return
    }

    setError(null)
    setDeletingRoom(true)

    try {
      await removeRoom({ roomId: room._id })
      onSuccess(`Kamar ${room.roomNumber} telah dihapus.`)
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gagal menghapus kamar."
      )
    } finally {
      setDeletingRoom(false)
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
        className="add-room-dialog max-w-2xl"
      >
        {/* ── Header ── */}
        <div className="add-room-header pb-4 border-b border-[var(--line)]">
          <div>
            <p className="add-room-eyebrow">Pengaturan Kamar</p>
            <h2 id={`${id}-title`} className="add-room-title">
              Edit Kamar {room.roomNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal edit kamar"
            className="add-room-close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* ── Section 1: Kelola Foto & Video ── */}
          <div className="border border-[var(--line)] bg-[var(--background)] p-4">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Foto &amp; Video Kamar ({mediaList.length})
            </h3>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Media ini akan ditampilkan sebagai slide show di card kamar &amp; pendaftaran publik.
            </p>

            {/* List existing media with thumbnails & delete buttons */}
            {mediaList.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {mediaList.map((item) => (
                  <div
                    key={item._id}
                    className="group relative overflow-hidden border border-[var(--line)] bg-[#fffefa]"
                  >
                    {item.kind === "photo" && item.url ? (
                      <img
                        src={item.url}
                        alt={item.caption ?? `Foto kamar`}
                        className="h-24 w-full object-cover"
                      />
                    ) : item.url ? (
                      <video
                        src={item.url}
                        className="h-24 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-slate-100 text-xs text-[var(--ink-muted)]">
                        No URL
                      </div>
                    )}

                    {item.caption && (
                      <p className="truncate px-1.5 py-1 text-[10px] text-[var(--ink-muted)]">
                        {item.caption}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDeleteMedia(item._id)}
                      disabled={deletingMediaId === item._id}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-red-600 text-white opacity-90 transition-opacity hover:opacity-100"
                      title="Hapus media"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload form inside modal */}
            <form
              onSubmit={(e) => void handleUploadMedia(e)}
              className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3"
            >
              <label className="button-secondary cursor-pointer py-1.5 text-xs">
                <Upload size={13} />
                {mediaFile ? mediaFile.name : "Pilih foto/video"}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                  required
                />
              </label>

              <input
                className="field-input min-w-0 flex-1 py-1.5 text-xs"
                placeholder="Caption media (opsional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />

              <button
                type="submit"
                disabled={!mediaFile || uploadingMedia}
                className="button-primary py-1.5 text-xs disabled:opacity-60"
              >
                {uploadingMedia ? "Mengunggah…" : "Unggah"}
              </button>
            </form>
          </div>

          {/* ── Section 2: Form Edit Detail Kamar ── */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Group 1: Identitas kamar */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--wood)] border-b border-[var(--line)] pb-1">
                Identitas Kamar
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor={`${id}-roomNumber`}
                    label="Nomor Kamar"
                    required
                  />
                  <input
                    id={`${id}-roomNumber`}
                    className="field-input mt-1"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-roomType`} label="Tipe Kamar" />
                  <input
                    id={`${id}-roomType`}
                    className="field-input mt-1"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    placeholder="Contoh: AC, Deluxe"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-floor`} label="Posisi Lantai" />
                  <input
                    id={`${id}-floor`}
                    className="field-input mt-1"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Contoh: 1"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-sizeSqm`} label="Ukuran (m²)" />
                  <input
                    id={`${id}-sizeSqm`}
                    type="number"
                    step="0.1"
                    className="field-input mt-1"
                    value={sizeSqm}
                    onChange={(e) => setSizeSqm(e.target.value)}
                    placeholder="Contoh: 12"
                  />
                </div>

                <div>
                  <FieldLabel
                    htmlFor={`${id}-maxOccupants`}
                    label="Kapasitas Penghuni"
                  />
                  <input
                    id={`${id}-maxOccupants`}
                    type="number"
                    className="field-input mt-1"
                    value={maxOccupants}
                    onChange={(e) => setMaxOccupants(e.target.value)}
                    placeholder="Contoh: 1"
                  />
                </div>

                <div>
                  <FieldLabel
                    htmlFor={`${id}-genderCategory`}
                    label="Gender Penghuni"
                  />
                  <select
                    id={`${id}-genderCategory`}
                    className="field-input mt-1"
                    value={genderCategory}
                    onChange={(e) => setGenderCategory(e.target.value)}
                  >
                    <option value="">Tidak dibatasi</option>
                    <option value="male">Pria</option>
                    <option value="female">Wanita</option>
                    <option value="mixed">Campur</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Group 2: Harga & Ketentuan */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--wood)] border-b border-[var(--line)] pb-1">
                Harga &amp; Status Kamar
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor={`${id}-monthlyRent`}
                    label="Harga Sewa Bulanan"
                    required
                  />
                  <div className="field-input-prefix-wrap mt-1">
                    <span className="field-input-prefix">Rp</span>
                    <input
                      id={`${id}-monthlyRent`}
                      type="number"
                      className="field-input field-input-prefixed font-mono font-semibold"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel
                    htmlFor={`${id}-status`}
                    label="Status Kamar"
                    required
                  />
                  <select
                    id={`${id}-status`}
                    className="field-input mt-1 font-semibold"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "available" | "booked" | "occupied")
                    }
                  >
                    <option value="available">Tersedia</option>
                    <option value="booked">Dibooking (DP)</option>
                    <option value="occupied">Terisi</option>
                  </select>
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-dpAmount`} label="Nominal DP Booking" />
                  <div className="field-input-prefix-wrap mt-1">
                    <span className="field-input-prefix">Rp</span>
                    <input
                      id={`${id}-dpAmount`}
                      type="number"
                      className="field-input field-input-prefixed"
                      value={dpAmount}
                      onChange={(e) => setDpAmount(e.target.value)}
                      placeholder="Contoh: 500000"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-depositFee`} label="Uang Deposit" />
                  <div className="field-input-prefix-wrap mt-1">
                    <span className="field-input-prefix">Rp</span>
                    <input
                      id={`${id}-depositFee`}
                      type="number"
                      className="field-input field-input-prefixed"
                      value={depositFee}
                      onChange={(e) => setDepositFee(e.target.value)}
                      placeholder="Contoh: 1500000"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-annualRent`} label="Harga Sewa Tahunan" />
                  <div className="field-input-prefix-wrap mt-1">
                    <span className="field-input-prefix">Rp</span>
                    <input
                      id={`${id}-annualRent`}
                      type="number"
                      className="field-input field-input-prefixed"
                      value={annualRent}
                      onChange={(e) => setAnnualRent(e.target.value)}
                      placeholder="Contoh: 16000000"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel
                    htmlFor={`${id}-electricityStatus`}
                    label="Status Listrik"
                  />
                  <select
                    id={`${id}-electricityStatus`}
                    className="field-input mt-1"
                    value={electricityStatus}
                    onChange={(e) => setElectricityStatus(e.target.value)}
                  >
                    <option value="">Pilih status listrik</option>
                    <option value="included">Termasuk dalam sewa</option>
                    <option value="metered">Meteran (per pemakaian)</option>
                    <option value="excluded">Terpisah (bayar sendiri)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Group 3: Fasilitas */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--wood)] border-b border-[var(--line)] pb-1">
                Fasilitas &amp; Ketentuan Tambahan
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor={`${id}-bathroomType`}
                    label="Jenis Kamar Mandi"
                  />
                  <select
                    id={`${id}-bathroomType`}
                    className="field-input mt-1"
                    value={bathroomType}
                    onChange={(e) => setBathroomType(e.target.value)}
                  >
                    <option value="">Pilih jenis kamar mandi</option>
                    <option value="private">Dalam (Privat)</option>
                    <option value="shared">Bersama</option>
                    <option value="none">Tidak ada</option>
                  </select>
                </div>

                <div>
                  <FieldLabel htmlFor={`${id}-bedSize`} label="Ukuran Kasur" />
                  <input
                    id={`${id}-bedSize`}
                    className="field-input mt-1"
                    value={bedSize}
                    onChange={(e) => setBedSize(e.target.value)}
                    placeholder="Contoh: Single, Queen"
                  />
                </div>
              </div>

              <div>
                <FieldLabel
                  htmlFor={`${id}-furnitureElectronics`}
                  label="Furnitur &amp; Elektronik (Pisahkan koma)"
                />
                <input
                  id={`${id}-furnitureElectronics`}
                  className="field-input mt-1"
                  value={furnitureElectronics}
                  onChange={(e) => setFurnitureElectronics(e.target.value)}
                  placeholder="Contoh: AC, Lemari, Meja belajar"
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor={`${id}-bathroomFacilities`}
                  label="Fasilitas Kamar Mandi (Pisahkan koma)"
                />
                <input
                  id={`${id}-bathroomFacilities`}
                  className="field-input mt-1"
                  value={bathroomFacilities}
                  onChange={(e) => setBathroomFacilities(e.target.value)}
                  placeholder="Contoh: Shower, Water heater, Closet duduk"
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor={`${id}-description`}
                  label="Deskripsi Kamar"
                />
                <textarea
                  id={`${id}-description`}
                  rows={2}
                  className="field-input mt-1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan tambahan kamar"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-[var(--warn)] pt-1">
                {error}
              </div>
            )}

            {/* ── Actions ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                onClick={() => void handleDeleteRoom()}
                disabled={submitting || deletingRoom}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--warn)] hover:bg-red-50"
              >
                <Trash2 size={14} />
                {deletingRoom ? "Menghapus…" : "Hapus Kamar"}
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting || deletingRoom}
                  className="button-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || deletingRoom}
                  className="button-primary"
                >
                  {submitting ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
