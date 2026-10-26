"use client"

import { Copy, Eye, EyeOff, Save } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { LANDMARK_DISTANCE_MAX_M, LANDMARK_DISTANCE_MIN_M, MAX_LANDMARKS, type PublicRules } from "@/convex/lib/kosInfoRules"

type PropertyPhoto = {
  _id: Id<"property_photos">
  storageId: Id<"_storage">
  url: string | null
  caption?: string
}

interface PublicPropertySectionProps {
  propertyId: Id<"properties">
  propertyName: string
  photos: PropertyPhoto[]
}

export function PublicPropertySection({
  propertyId,
  propertyName,
  photos,
}: PublicPropertySectionProps) {
  const status = useQuery(api.properties.getPublicPublicationStatus, {
    propertyId,
  })
  const updateProfile = useMutation(api.properties.updatePublicProfile)
  const updateSlug = useMutation(api.properties.updatePublicSlug)
  const setPublishState = useMutation(api.properties.setPublishState)
  const [description, setDescription] = useState("")
  const [areaLabel, setAreaLabel] = useState("")
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<
    Id<"property_photos">[]
  >([])
  const [showPrice, setShowPrice] = useState(false)
  const [showFullAddress, setShowFullAddress] = useState(false)
  const [slug, setSlug] = useState("")
  const [kosType, setKosType] = useState<"putra" | "putri" | "campur" | "">("")
  const [rules, setRules] = useState<PublicRules>({})
  const [landmarks, setLandmarks] = useState<Array<{ name: string; distanceM: number }>>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!status) return
    setDescription(status.publicDescription ?? "")
    setAreaLabel(status.publicAreaLabel ?? "")
    setSelectedPhotoIds(status.publicPhotoIds)
    setShowPrice(status.publicShowPrice)
    setShowFullAddress(status.publicShowFullAddress)
    setSlug(status.publicSlug ?? "")
    setKosType((status.publicKosType as "putra" | "putri" | "campur" | null) ?? "")
    setRules((status.publicRules as PublicRules | null) ?? {})
    setLandmarks(status.publicLandmarks ?? [])
  }, [status])

  const missingRequirements = status?.missing ?? []
  const selectedAvailableCount = useMemo(
    () =>
      selectedPhotoIds.filter((id) => photos.some((photo) => photo._id === id))
        .length,
    [photos, selectedPhotoIds]
  )
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://domain-anda.com")
  const previewSlug = slug || "slug-kos-anda"
  const previewUrl = `${baseUrl.replace(/\/$/, "")}/kos/${previewSlug}`

  if (!status) return null

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateProfile({
        propertyId,
        publicDescription: description,
        publicAreaLabel: areaLabel,
        publicPhotoIds: selectedPhotoIds,
        publicShowPrice: showPrice,
        publicShowFullAddress: showFullAddress,
        publicKosType: kosType || null,
        publicRules: Object.keys(rules).length ? rules : null,
        publicLandmarks: landmarks.length ? landmarks : null,
      })
      if (slug && slug !== status.publicSlug)
        await updateSlug({ propertyId, publicSlug: slug })
      setMessage("Profil publik berhasil disimpan.")
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Profil publik belum dapat disimpan."
      setError(message)
      throw reason
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await saveProfile()
      await setPublishState({ propertyId, isPublished: !status.isPublished })
      setMessage(
        status.isPublished
          ? "Kos berhasil disembunyikan dari publik."
          : "Kos berhasil dipublikasikan."
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Status publikasi belum dapat diubah."
      )
    } finally {
      setSaving(false)
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl)
      setMessage("URL publik disalin.")
    } catch {
      setError("URL belum dapat disalin. Silakan salin secara manual.")
    }
  }

  return (
    <section className="mt-8 border border-[var(--line)] bg-[#fffefa] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">
            Jangkauan calon penyewa
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
            Halaman Publik
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
            Yang terlihat hanya profil kos, foto pilihan, kamar, fasilitas, dan
            data harga jika Anda mengaktifkannya. Data penyewa, identitas,
            keuangan, dan alamat lengkap tetap tersembunyi secara default.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void togglePublished()}
          disabled={
            saving || (!status.isPublished && missingRequirements.length > 0)
          }
          className={`inline-flex shrink-0 items-center gap-2 border px-3 py-2 text-xs font-semibold ${status.isPublished ? "border-[var(--sage)] bg-[#eff8f0] text-[var(--sage)]" : "border-[var(--line)] bg-[var(--background)] text-[var(--ink)]"}`}
        >
          {status.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
          {status.isPublished ? "Sembunyikan" : "Publikasikan kos"}
        </button>
      </div>

      {missingRequirements.length > 0 && (
        <div className="mt-5 border border-[var(--gold)] bg-[#fff8e8] p-4 text-sm text-[var(--ink)]">
          <p className="font-semibold">Lengkapi dulu sebelum publikasi</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missingRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {status.isPublished && missingRequirements.length > 0 && (
        <p className="mt-3 text-xs text-[var(--warn)]">
          Profil sedang dipublikasikan, tetapi checklist berubah. Lengkapi
          kembali agar kontrol publikasi dapat digunakan.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="field-label">Deskripsi publik</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            className="field-input min-h-28 resize-y"
            placeholder={`Ceritakan suasana ${propertyName} untuk calon penyewa…`}
          />
          <span className="mt-1 block text-right text-xs text-[var(--ink-muted)]">
            {description.length}/1000
          </span>
        </label>
        <label>
          <span className="field-label">Label area</span>
          <input
            value={areaLabel}
            onChange={(event) => setAreaLabel(event.target.value)}
            maxLength={120}
            className="field-input"
            placeholder="Contoh: Dago, Bandung"
          />
        </label>
        <label>
          <span className="field-label">Slug halaman publik</span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="field-input"
            placeholder="kos-melati-dago"
          />
        </label>
      </div>

      <a
        href="#verifikasi-lokasi"
        className="mt-5 inline-flex text-xs font-semibold text-[var(--wood)] hover:underline"
      >
        Tetapkan pin dan verifikasi lokasi di bagian bawah halaman →
      </a>

      <details className="mt-6 border-t border-[var(--line)] pt-5" open={!status.publicKosType && !status.publicRules && !status.publicLandmarks?.length}>
        <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">Info singkat</summary>
        <div className="mt-4 space-y-5">
          <div>
            <p className="field-label">Tipe kos</p>
            <div className="grid grid-cols-4 gap-2">
              {["", "putra", "putri", "campur"].map((value) => <button key={value || "none"} type="button" onClick={() => setKosType(value as typeof kosType)} className={`min-h-11 rounded-lg border px-2 text-xs font-semibold ${kosType === value ? "border-[var(--wood)] bg-[var(--wood)]/10" : "border-[var(--line)]"}`}>{value ? value[0].toUpperCase() + value.slice(1) : "Tidak ditampilkan"}</button>)}
            </div>
          </div>
          <div>
            <p className="field-label">Aturan ringkas</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['hewan', 'Hewan peliharaan'], ['merokok', 'Merokok'], ['tamu', 'Tamu lawan jenis'], ['masak', 'Memasak di kamar']] as const).map(([key, label]) => <label key={key} className="text-xs"><span className="mb-1 block font-semibold">{label}</span><select className="field-input min-h-11" value={rules[key] ?? ""} onChange={(event) => setRules((current) => ({ ...current, [key]: event.target.value ? event.target.value as "boleh" | "tidak" : undefined }))}><option value="">Tidak ditampilkan</option><option value="boleh">Boleh</option><option value="tidak">Tidak boleh</option></select></label>)}
              <label className="text-xs"><span className="mb-1 block font-semibold">Jam malam</span><select className="field-input min-h-11" value={rules.jamMalam?.value ?? ""} onChange={(event) => setRules((current) => ({ ...current, jamMalam: event.target.value ? { value: event.target.value as "boleh" | "tidak", ...(event.target.value === "tidak" && current.jamMalam?.time ? { time: current.jamMalam.time } : {}) } : undefined }))}><option value="">Tidak ditampilkan</option><option value="boleh">Boleh</option><option value="tidak">Ada jam malam</option></select>{rules.jamMalam?.value === "tidak" ? <input type="time" className="field-input mt-2 min-h-11" value={rules.jamMalam.time ?? ""} onChange={(event) => setRules((current) => ({ ...current, jamMalam: { value: "tidak", time: event.target.value } }))} /> : null}</label>
            </div>
          </div>
          <div>
            <p className="field-label">Landmark sekitar (maksimal {MAX_LANDMARKS})</p>
            <p className="mb-2 text-xs text-[var(--ink-muted)]">Jarak diisi dalam meter (1 km = 1.000 m). Jarak ini perkiraan menurut kamu. Jangan menulis alamat, nama jalan pribadi, atau nomor telepon.</p>
            <div className="space-y-2">{landmarks.map((landmark, index) => <div key={`${index}-${landmark.name}`} className="grid grid-cols-[1fr_7rem_auto] gap-2"><input className="field-input min-h-11" value={landmark.name} onChange={(event) => setLandmarks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Contoh: Kampus" /><input type="number" min={LANDMARK_DISTANCE_MIN_M} max={LANDMARK_DISTANCE_MAX_M} className="field-input min-h-11" value={landmark.distanceM} onChange={(event) => setLandmarks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, distanceM: Number(event.target.value) } : item))} aria-label="Jarak dalam meter" /><button type="button" className="min-h-11 px-2 text-xs text-[var(--warn)]" onClick={() => setLandmarks((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus</button></div>)}</div>
            {landmarks.length < MAX_LANDMARKS ? <button type="button" className="button-secondary mt-3 min-h-11" onClick={() => setLandmarks((current) => [...current, { name: "", distanceM: LANDMARK_DISTANCE_MIN_M }])}>Tambah landmark</button> : null}
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
            <p className="text-xs font-semibold">Pratinjau Info singkat</p>
            <p className="mt-2 text-sm">{kosType ? `Kos ${kosType}.` : "Tipe kos belum ditampilkan."}</p>
            {landmarks.filter((item) => item.name.trim()).slice(0, 3).map((item) => <p key={item.name} className="mt-1 text-xs text-[var(--ink-muted)]">{item.name} · sekitar {item.distanceM} m (perkiraan menurut pemilik)</p>)}
          </div>
        </div>
      </details>

      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Pilih foto yang ditampilkan
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Pilih minimal 3 foto untuk memenuhi prasyarat publikasi.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => {
            const selected = selectedPhotoIds.includes(photo._id)
            return (
              <button
                type="button"
                key={photo._id}
                onClick={() =>
                  setSelectedPhotoIds((current) =>
                    selected
                      ? current.filter((id) => id !== photo._id)
                      : [...current, photo._id]
                  )
                }
                className={`relative h-28 overflow-hidden border-2 text-left ${selected ? "border-[var(--wood)]" : "border-[var(--line)]"}`}
                aria-pressed={selected}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption ?? `Foto ${propertyName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="p-2 text-xs text-[var(--ink-muted)]">
                    Foto tidak tersedia
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-white">
                  {selected ? "Dipilih" : "Pilih foto"}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          {selectedAvailableCount} foto dipilih
        </p>
      </div>

      <div className="mt-6 grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
        <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={showPrice}
            onChange={(event) => setShowPrice(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Tampilkan harga kamar</span>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">
              Harga bulanan/tahunan hanya muncul jika ini diaktifkan.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={showFullAddress}
            onChange={(event) => setShowFullAddress(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Tampilkan alamat lengkap</span>
            <span className="mt-1 block text-xs text-[var(--warn)]">
              Pertimbangkan privasi dan keamanan sebelum mengaktifkan.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <p className="text-sm font-semibold text-[var(--ink)]">Preview URL</p>
        <div className="mt-2 flex items-center gap-2 border border-[var(--line)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--wood)]">
          <span className="truncate">{previewUrl}</span>
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="ml-auto shrink-0 text-[var(--wood)]"
            aria-label="Salin URL halaman publik"
          >
            <Copy size={15} />
          </button>
        </div>
      </div>

      {(message || error) && (
        <p
          role={error ? "alert" : undefined}
          className={`mt-4 text-sm ${error ? "text-[var(--warn)]" : "text-[var(--sage)]"}`}
        >
          {error ?? message}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={saving}
          className="button-secondary"
        >
          <Save size={15} />
          {saving ? "Menyimpan…" : "Simpan profil publik"}
        </button>
      </div>
    </section>
  )
}
