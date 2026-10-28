"use client"

import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  DoorOpen,
  Home,
  Loader2,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MultiImageUploadField } from "@/components/botkos/multi-image-upload-field"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { PageLoader } from "@/components/botkos/page-loader"

type ImportPaidStatus = "paid_current" | "unpaid_current"

const POPULAR_FACILITIES = [
  { id: "wifi", name: "WiFi Cepat", category: "shared" as const },
  { id: "ac", name: "AC", category: "shared" as const },
  { id: "km_dalam", name: "Kamar Mandi Dalam", category: "shared" as const },
  { id: "parkir", name: "Parkir Motor", category: "parking" as const },
  { id: "dapur", name: "Dapur Bersama", category: "shared" as const },
  { id: "cctv", name: "CCTV / Keamanan", category: "security" as const },
]

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

const getTodayStr = () => new Date().toISOString().split("T")[0]

const getNextMonthStr = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split("T")[0]
}

const jakartaDate = (value: string) => {
  if (!value) return Date.now()
  return new Date(`${value}T12:00:00+07:00`).getTime()
}

export default function OnboardingPage() {
  const router = useRouter()
  const setupState = useQuery(api.owners.getSetupState)
  const completeOnboarding = useMutation(api.owners.completeOnboarding)
  const generateUploadUrl = useMutation(api.propertyPhotos.generateUploadUrl)
  const createRoom = useMutation(api.rooms.create)
  const importTenant = useMutation(api.tenants.importExistingTenant)

  // Step 1: Kos Profile | Step 2: Kamar & Penghuni Perdana
  const [step, setStep] = useState<1 | 2>(1)
  const [createdPropertyId, setCreatedPropertyId] = useState<Id<"properties"> | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 Form States
  const [ownerName, setOwnerName] = useState("")
  const [propertyName, setPropertyName] = useState("")
  const [address, setAddress] = useState("")
  const [slug, setSlug] = useState("")
  const [isSlugCustomized, setIsSlugCustomized] = useState(false)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(["wifi", "km_dalam"])
  const [propertyPhotos, setPropertyPhotos] = useState<File[]>([])

  // Step 2 Form States
  const [roomNumber, setRoomNumber] = useState("101")
  const [monthlyRent, setMonthlyRent] = useState("1500000")
  const [isOccupied, setIsOccupied] = useState(true)
  const [tenantName, setTenantName] = useState("")
  const [tenantPhone, setTenantPhone] = useState("")
  const [startedAt, setStartedAt] = useState(getTodayStr)
  const [nextDueDate, setNextDueDate] = useState(getNextMonthStr)
  const [paidStatus, setPaidStatus] = useState<ImportPaidStatus>("paid_current")

  // Auto-fill owner name if available from Google / setupState
  useEffect(() => {
    if (setupState?.owner?.name && !ownerName) {
      setOwnerName(setupState.owner.name)
    }
  }, [setupState, ownerName])

  // Auto-generate slug when property name changes
  const handlePropertyNameChange = (name: string) => {
    setPropertyName(name)
    if (!isSlugCustomized) {
      setSlug(slugify(name))
    }
  }

  const toggleFacility = (facilityId: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facilityId)
        ? prev.filter((id) => id !== facilityId)
        : [...prev, facilityId]
    )
  }

  // Handle Submit Step 1: Create Property
  const handlePropertySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const finalSlug = slug.trim() ? slugify(slug) : slugify(propertyName)

    if (!ownerName.trim()) {
      setError("Nama pemilik wajib diisi.")
      setLoading(false)
      return
    }
    if (!propertyName.trim()) {
      setError("Nama kos wajib diisi.")
      setLoading(false)
      return
    }
    if (!address.trim()) {
      setError("Alamat kos wajib diisi.")
      setLoading(false)
      return
    }
    if (!finalSlug) {
      setError("Link pendaftaran publik wajib valid.")
      setLoading(false)
      return
    }

    try {
      // Upload photos if any (optional)
      const propertyPhotoStorageIds: Id<"_storage">[] = []
      for (const file of propertyPhotos) {
        const uploadUrl = await generateUploadUrl()
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "content-type": file.type },
          body: file,
        })
        if (!uploadResponse.ok) {
          throw new Error("Gagal mengunggah foto kos. Silakan coba kembali.")
        }
        const uploaded = (await uploadResponse.json()) as { storageId: string }
        propertyPhotoStorageIds.push(uploaded.storageId as Id<"_storage">)
      }

      // Map selected popular facilities
      const formattedFacilities = POPULAR_FACILITIES.filter((f) =>
        selectedFacilities.includes(f.id)
      ).map((f) => ({
        category: f.category,
        name: f.name,
      }))

      const res = await completeOnboarding({
        ownerName: ownerName.trim(),
        propertyName: propertyName.trim(),
        address: address.trim(),
        slug: finalSlug,
        facilities: formattedFacilities,
        rooms: [],
        propertyPhotoStorageIds,
      })

      setCreatedPropertyId(res.propertyId)
      setCreatedSlug(res.slug)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran properti gagal.")
    } finally {
      setLoading(false)
    }
  }

  // Handle Step 2: Create Room & Optional Tenant
  const handleRoomAndTenantSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!createdPropertyId) return
    setLoading(true)
    setError(null)

    const rentNumber = Number(monthlyRent)
    if (!roomNumber.trim()) {
      setError("Nomor kamar wajib diisi.")
      setLoading(false)
      return
    }
    if (isNaN(rentNumber) || rentNumber <= 0) {
      setError("Harga sewa bulanan harus berupa angka yang valid.")
      setLoading(false)
      return
    }

    if (isOccupied && !tenantName.trim()) {
      setError("Nama penyewa wajib diisi jika kamar sudah dihuni.")
      setLoading(false)
      return
    }

    try {
      // 1. Create Room
      const roomId = await createRoom({
        propertyId: createdPropertyId,
        roomNumber: roomNumber.trim(),
        monthlyRent: rentNumber,
      })

      // 2. If room already occupied, import tenant
      if (isOccupied) {
        await importTenant({
          propertyId: createdPropertyId,
          roomId,
          name: tenantName.trim(),
          phone: tenantPhone.trim() || undefined,
          startedAt: jakartaDate(startedAt),
          nextDueDate: jakartaDate(nextDueDate),
          monthlyRent: rentNumber,
          paidStatus,
        })
      }

      // 3. Navigate to Dashboard
      router.replace(
        `/dashboard?onboarding=complete&propertySlug=${encodeURIComponent(createdSlug)}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kamar.")
      setLoading(false)
    }
  }

  const handleSkipToDashboard = () => {
    if (!createdSlug) return
    router.replace(
      `/dashboard?onboarding=complete&propertySlug=${encodeURIComponent(createdSlug)}`
    )
  }

  if (setupState === undefined) {
    return (
      <PageLoader
        message="Menyiapkan sesi onboarding…"
        submessage="Memuat profil dan akun Anda"
      />
    )
  }

  return (
    <main className="min-h-svh bg-[var(--background)] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Top Branding & Progress Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)]/70 pb-5">
          <BotKosLogo
            size={32}
            textClassName="text-base font-extrabold text-[var(--ink)] tracking-tight"
          />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === 1
                  ? "bg-[var(--ink)] text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {step === 1 ? "1" : <Check size={14} />}
            </span>
            <span className="text-xs font-semibold text-[var(--ink-muted)]">
              {step === 1 ? "Data Kos" : "Kamar & Penghuni"}
            </span>
            <span className="text-xs text-[var(--ink-muted)]/50">•</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 2
                  ? "bg-[var(--ink)] text-white"
                  : "bg-[var(--line)] text-[var(--ink-muted)]"
              }`}
            >
              2
            </span>
          </div>
        </div>

        {/* ── STEP 1: Profil Kos ── */}
        {step === 1 && (
          <div className="mt-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/30 bg-[#fffbf2] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
                <Sparkles size={12} className="text-[var(--wood)]" />
                <span>Langkah 1 dari 2</span>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                Kenalkan Kos Anda
              </h1>
              <p className="mt-1.5 text-xs text-[var(--ink-muted)] sm:text-sm">
                Isi identitas kos Anda. Cukup informasi penting agar Anda bisa segera mengelola kamar dan penyewa.
              </p>
            </div>

            <form
              onSubmit={(e) => void handlePropertySubmit(e)}
              className="mt-6 space-y-6 rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Data Pemilik & Nama Kos */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ownerName"
                    className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                  >
                    Nama Pemilik / Pengelola <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    placeholder="Contoh: Pak Budi"
                    className="field-input mt-1.5 w-full"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="propertyName"
                    className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                  >
                    Nama Kos <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="propertyName"
                    value={propertyName}
                    onChange={(e) => handlePropertyNameChange(e.target.value)}
                    required
                    placeholder="Contoh: Kost Melati Asri"
                    className="field-input mt-1.5 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                >
                  Alamat Lengkap Kos <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={2}
                  placeholder="Contoh: Jl. Kaliurang KM 5, Gang Melati No. 12, Sleman, Yogyakarta"
                  className="field-input mt-1.5 w-full resize-none"
                  disabled={loading}
                />
              </div>

              {/* Link Publik Kos (Slug) */}
              <div>
                <label
                  htmlFor="slug"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                >
                  Link Publik Kos
                </label>
                <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--background)] focus-within:border-[var(--wood)]">
                  <span className="bg-[#f5efe6] px-3.5 py-2.5 text-xs font-medium text-[var(--ink-muted)] select-none">
                    botkos.online/
                  </span>
                  <input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setIsSlugCustomized(true)
                      setSlug(e.target.value)
                    }}
                    required
                    placeholder="kost-melati-asri"
                    className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-[var(--ink)] outline-none sm:text-sm"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                  Tautan khusus kos Anda untuk formulir pendaftaran calon penyewa.
                </p>
              </div>

              {/* Fasilitas Populer (Quick Checkbox Chips) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Fasilitas Utama (Opsional)
                </label>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  Pilih fasilitas yang sudah tersedia di kos Anda.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POPULAR_FACILITIES.map((facility) => {
                    const isSelected = selectedFacilities.includes(facility.id)
                    return (
                      <button
                        type="button"
                        key={facility.id}
                        onClick={() => toggleFacility(facility.id)}
                        disabled={loading}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-[var(--wood)] bg-[#fff7ea] text-[var(--gold-dark)] shadow-xs"
                            : "border-[var(--line)] bg-[#FFFFFF] text-[var(--ink-muted)] hover:border-[var(--wood)]/60"
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-md border text-[10px] ${
                            isSelected
                              ? "border-[var(--wood)] bg-[var(--wood)] text-white"
                              : "border-[var(--line)] bg-white"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span>{facility.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Foto Kos (Opsional) */}
              <div className="border-t border-[var(--line)]/60 pt-5">
                <MultiImageUploadField
                  files={propertyPhotos}
                  onChange={setPropertyPhotos}
                  label="Foto Kos"
                  hint="Opsional — Anda dapat mengunggah foto sekarang atau melengkapinya nanti dari Dashboard."
                  minFiles={0}
                  required={false}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="button-primary w-full justify-center py-3 text-sm disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-[var(--wood)]" />
                      <span>Menyimpan Properti Kos…</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut: Atur Kamar & Penghuni</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 2: Kamar & Penghuni Perdana ── */}
        {step === 2 && (
          <div className="mt-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Properti Berhasil Dibuat</span>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                Tambah Kamar & Penghuni Pertama
              </h1>
              <p className="mt-1.5 text-xs text-[var(--ink-muted)] sm:text-sm">
                Mulai catat satu kamar sekarang. Jika kamar ini sudah dihuni, Anda bisa langsung mengisi profil penyewa agar jatuh tempo otomatis tercatat.
              </p>
            </div>

            <form
              onSubmit={(e) => void handleRoomAndTenantSubmit(e)}
              className="mt-6 space-y-6 rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Data Kamar */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="roomNumber"
                    className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                  >
                    Nomor / Nama Kamar <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <DoorOpen
                      size={16}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-muted)]"
                    />
                    <input
                      id="roomNumber"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      required
                      placeholder="Contoh: 101 atau A-01"
                      className="field-input w-full pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="monthlyRent"
                    className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]"
                  >
                    Harga Sewa Bulanan (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="monthlyRent"
                    type="number"
                    min={0}
                    step={10000}
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    required
                    placeholder="Contoh: 1500000"
                    className="field-input mt-1.5 w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Status Kamar: Kosong vs Sudah Berpenghuni */}
              <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Apakah kamar ini sudah ada penyewanya?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOccupied(true)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                      isOccupied
                        ? "border-[var(--wood)] bg-[#fff7ea] text-[var(--gold-dark)] shadow-xs"
                        : "border-[var(--line)] bg-[#FFFFFF] text-[var(--ink-muted)] hover:border-[var(--wood)]/60"
                    }`}
                  >
                    <UserCheck size={18} className="shrink-0 text-[var(--wood)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--ink)]">Sudah Terisi</p>
                      <p className="text-[10px] text-[var(--ink-muted)]">Catat penyewa sekarang</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOccupied(false)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                      !isOccupied
                        ? "border-[var(--wood)] bg-[#fff7ea] text-[var(--gold-dark)] shadow-xs"
                        : "border-[var(--line)] bg-[#FFFFFF] text-[var(--ink-muted)] hover:border-[var(--wood)]/60"
                    }`}
                  >
                    <DoorOpen size={18} className="shrink-0 text-[var(--ink-muted)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--ink)]">Masih Kosong</p>
                      <p className="text-[10px] text-[var(--ink-muted)]">Siap untuk disewakan</p>
                    </div>
                  </button>
                </div>

                {/* Sub-form: Data Penyewa Jika Terisi */}
                {isOccupied && (
                  <div className="mt-5 space-y-4 border-t border-[var(--line)]/70 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="tenantName"
                          className="block text-xs font-bold text-[var(--ink)]"
                        >
                          Nama Penyewa <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="tenantName"
                          value={tenantName}
                          onChange={(e) => setTenantName(e.target.value)}
                          required={isOccupied}
                          placeholder="Contoh: Budi Santoso"
                          className="field-input mt-1 w-full"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="tenantPhone"
                          className="block text-xs font-bold text-[var(--ink)]"
                        >
                          Nomor WhatsApp Penyewa
                        </label>
                        <input
                          id="tenantPhone"
                          value={tenantPhone}
                          onChange={(e) => setTenantPhone(e.target.value)}
                          placeholder="Contoh: 081234567890"
                          className="field-input mt-1 w-full"
                          disabled={loading}
                        />
                        <span className="mt-0.5 block text-[10px] text-[var(--ink-muted)]">
                          Dipakai untuk pengingat sewa otomatis via bot.
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="startedAt"
                          className="block text-xs font-bold text-[var(--ink)]"
                        >
                          Tanggal Mulai Sewa
                        </label>
                        <input
                          id="startedAt"
                          type="date"
                          value={startedAt}
                          onChange={(e) => setStartedAt(e.target.value)}
                          className="field-input mt-1 w-full"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="nextDueDate"
                          className="block text-xs font-bold text-[var(--ink)]"
                        >
                          Jatuh Tempo Tagihan Berikutnya
                        </label>
                        <input
                          id="nextDueDate"
                          type="date"
                          value={nextDueDate}
                          onChange={(e) => setNextDueDate(e.target.value)}
                          className="field-input mt-1 w-full"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        Status Pembayaran Bulan Ini
                      </label>
                      <div className="mt-1.5 flex gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                          <input
                            type="radio"
                            name="paidStatus"
                            checked={paidStatus === "paid_current"}
                            onChange={() => setPaidStatus("paid_current")}
                            className="text-[var(--wood)]"
                          />
                          <span>Sudah Lunas Bulan Ini</span>
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                          <input
                            type="radio"
                            name="paidStatus"
                            checked={paidStatus === "unpaid_current"}
                            onChange={() => setPaidStatus("unpaid_current")}
                            className="text-[var(--wood)]"
                          />
                          <span>Belum Bayar Bulan Ini</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="button-primary w-full justify-center py-3 text-sm disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-[var(--wood)]" />
                      <span>Menyimpan Kamar & Penyewa…</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan & Buka Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkipToDashboard}
                  disabled={loading}
                  className="w-full text-center text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--wood)] hover:underline py-2"
                >
                  Lewati langkah ini, atur kamar nanti di Dashboard →
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
