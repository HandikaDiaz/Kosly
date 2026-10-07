"use client"

import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { type FormEvent, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MultiImageUploadField } from "@/components/botkos/multi-image-upload-field"
import { AddRoomForm } from "@/components/botkos/add-room-form"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

type FacilityDraft = {
  category: "shared" | "services" | "parking" | "security" | "sports" | "other"
  name: string
  description: string
}

const facilityLabels = {
  shared: "Fasilitas bersama",
  services: "Komplementer & servis",
  parking: "Area parkir",
  security: "Keamanan & akses",
  sports: "Olahraga & hiburan",
  other: "Lainnya",
} as const

export default function OnboardingPage() {
  const complete = useMutation(api.owners.completeOnboarding)
  const generateUploadUrl = useMutation(api.propertyPhotos.generateUploadUrl)
  const router = useRouter()

  // Onboarding Wizard Steps: 1 = Form Property, 2 = Choice/Room Setup, 3 = Quick Win Link
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [createdPropertyId, setCreatedPropertyId] = useState<Id<"properties"> | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string>("")
  const [propertyName, setPropertyName] = useState<string>("")

  const [facilities, setFacilities] = useState<FacilityDraft[]>([])
  const [propertyPhotos, setPropertyPhotos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Room modal state
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [roomCount, setRoomCount] = useState(0)
  const [copied, setCopied] = useState(false)

  // Handle Step 1 Property Creation
  const handlePropertySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const data = new FormData(event.currentTarget)
    const ownerName = String(data.get("ownerName") ?? "")
    const name = String(data.get("propertyName") ?? "")
    const address = String(data.get("address") ?? "")
    const slug = String(data.get("slug") ?? "")

    try {
      if (propertyPhotos.length < 3) throw new Error("Minimal 3 foto kos wajib diunggah.")
      const propertyPhotoStorageIds = []
      for (const file of propertyPhotos) {
        const uploadUrl = await generateUploadUrl()
        const uploadResponse = await fetch(uploadUrl, { method: "POST", headers: { "content-type": file.type }, body: file })
        if (!uploadResponse.ok) throw new Error("Upload foto kos gagal. Silakan coba lagi.")
        const uploaded = (await uploadResponse.json()) as { storageId: string }
        propertyPhotoStorageIds.push(uploaded.storageId as Id<"_storage">)
      }
      const res = await complete({
        ownerName,
        propertyName: name,
        address,
        slug,
        facilities: facilities
          .filter((facility) => facility.name.trim())
          .map((facility) => ({
            ...facility,
            name: facility.name.trim(),
            description: facility.description.trim() || undefined,
          })),
        rooms: [],
        propertyPhotoStorageIds,
      })

      setCreatedPropertyId(res.propertyId)
      setCreatedSlug(res.slug)
      setPropertyName(name)
      setStep(2)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pendaftaran properti gagal.")
    } finally {
      setLoading(false)
    }
  }

  const handleSkipToDashboard = () => {
    if (!createdSlug) return
    router.replace(`/dashboard?onboarding=complete&propertySlug=${encodeURIComponent(createdSlug)}`)
  }

  const handleRoomSuccess = () => {
    setRoomCount((prev) => prev + 1)
    setStep(3)
  }

  const copyRegistrationUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const registrationUrl = `${origin}/${createdSlug}/daftar`
    void navigator.clipboard.writeText(registrationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const registrationUrl = createdSlug ? `${origin}/${createdSlug}/daftar` : ""

  return (
    <main className="min-h-svh px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Brand Header */}
        <div>
          <BotKosLogo size={30} textClassName="text-base font-extrabold text-[var(--ink)] tracking-tight" />
        </div>

        {/* ── STEP 1: Buat Properti ── */}
        {step === 1 && (
          <div>
            <div className="mt-12">
              <p className="text-sm font-semibold text-[var(--gold-dark)]">Langkah 1 dari 2</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                Kenalkan kos Anda.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
                Isi informasi dasar properti Anda. Detail ini akan ditampilkan pada halaman pendaftaran calon penyewa.
              </p>
            </div>

            <form
              onSubmit={(event) => void handlePropertySubmit(event)}
              className="mt-9 space-y-8 border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-8 shadow-sm"
            >
              {/* Informasi Properti */}
              <section className="space-y-5">
                <h2 className="text-lg font-semibold text-[var(--ink)]">Informasi properti</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="ownerName">
                      Nama Anda
                    </label>
                    <input
                      className="field-input"
                      id="ownerName"
                      name="ownerName"
                      required
                      placeholder="Handika"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="propertyName">
                      Nama kos
                    </label>
                    <input
                      className="field-input"
                      id="propertyName"
                      name="propertyName"
                      required
                      placeholder="Kost Melati"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="address">
                    Alamat lengkap
                  </label>
                  <textarea
                    className="field-input min-h-24"
                    id="address"
                    name="address"
                    required
                    placeholder="Alamat lengkap kos"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="slug">
                    Link pendaftaran publik
                  </label>
                  <div className="flex items-center border border-[var(--line)] bg-[var(--background)]">
                    <span className="pl-3 text-sm text-[var(--ink-muted)]">/</span>
                    <input
                      className="field-input border-0 bg-transparent"
                      id="slug"
                      name="slug"
                      required
                      placeholder="kost-melati"
                    />
                  </div>
                </div>
              </section>

              {/* Fasilitas Properti */}
              <section className="space-y-4">
                <div><h2 className="text-lg font-semibold text-[var(--ink)]">Foto kos</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Foto ini akan ditampilkan kepada calon penyewa dan dapat ditinjau admin.</p></div>
                <MultiImageUploadField files={propertyPhotos} onChange={setPropertyPhotos} label="Foto properti" hint="Unggah minimal tiga foto area kos yang jelas." />
              </section>

              {/* Fasilitas Properti */}
              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--ink)]">Fasilitas properti</h2>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      Opsional, bisa dilengkapi lagi dari dashboard kapan saja.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFacilities((items) => [
                        ...items,
                        { category: "shared", name: "", description: "" },
                      ])
                    }
                    className="button-secondary"
                  >
                    <Plus size={15} />
                    Tambah
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {facilities.map((facility, index) => (
                    <div
                      className="grid gap-2 sm:grid-cols-[1fr_1.5fr_1.5fr_auto]"
                      key={index}
                    >
                      <select
                        className="field-input"
                        value={facility.category}
                        onChange={(event) =>
                          setFacilities((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    category: event.target.value as FacilityDraft["category"],
                                  }
                                : item
                            )
                          )
                        }
                      >
                        {Object.entries(facilityLabels).map(([key, label]) => (
                          <option value={key} key={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="field-input"
                        value={facility.name}
                        onChange={(event) =>
                          setFacilities((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, name: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Nama fasilitas"
                      />
                      <input
                        className="field-input"
                        value={facility.description}
                        onChange={(event) =>
                          setFacilities((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, description: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Keterangan"
                      />
                      <button
                        type="button"
                        aria-label="Hapus fasilitas"
                        onClick={() =>
                          setFacilities((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        className="px-3 text-[var(--warn)]"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {error && (
                <p role="alert" className="text-sm text-[var(--warn)]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full justify-center disabled:opacity-60"
              >
                {loading ? "Membuat properti…" : "Lanjut ke Tambah Kamar"}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Opsi Tambah Kamar Pertama ── */}
        {step === 2 && createdPropertyId && (
          <div className="mt-12">
            <p className="text-sm font-semibold text-[var(--gold-dark)]">Langkah 2 dari 2</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
              Tambah Kamar Pertama
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
              Properti <strong className="text-[var(--ink)]">{propertyName}</strong> berhasil dibuat! Tambahkan kamar pertama sekarang untuk langsung mendapatkan link pendaftaran calon penyewa.
            </p>

            <div className="mt-9 border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-start gap-4 p-5 border border-[var(--line)] bg-[var(--background)]">
                <div className="p-3 bg-[#FFFFFF] border border-[var(--line)] text-[var(--gold)]">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--ink)]">Input Detail Kamar</h3>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Gunakan form standar yang seragam dengan dashboard untuk mengisi nomor kamar, harga sewa, fasilitas, deposit, dan batas hari pelunasan DP.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomForm(true)}
                  className="button-primary flex-1 justify-center py-3"
                >
                  <Plus size={18} />
                  Tambah Kamar Sekarang
                </button>

                <button
                  type="button"
                  onClick={handleSkipToDashboard}
                  className="button-secondary flex-1 justify-center py-3"
                >
                  Lewati, tambah nanti dari dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Quick Win (Link Pendaftaran Unik) ── */}
        {step === 3 && (
          <div className="mt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--background)] border border-[var(--line)] font-mono text-xs text-[var(--gold-dark)] mb-3">
              <Check size={14} className="text-emerald-600" />
              {roomCount} Kamar Ditambahkan
            </div>

            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
              Siap Menerima Penyewa! 🎉
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
              Kamar pertama Anda berhasil didaftarkan. Bagikan link pendaftaran di bawah ini kepada calon penyewa untuk menerima booking secara online.
            </p>

            <div className="mt-8 border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-8 space-y-6 shadow-sm">
              <div>
                <label className="field-label">Link Pendaftaran Unik Kos Anda</label>
                <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 overflow-hidden border border-[var(--line)] bg-[var(--background)] p-3">
                  <span className="font-mono text-sm text-[var(--ink)] truncate flex-1">
                    {registrationUrl}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={copyRegistrationUrl}
                      className="button-secondary py-1.5 px-3 text-xs"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copied ? "Tersalin!" : "Salin Link"}
                    </button>
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="button-secondary py-1.5 px-3 text-xs"
                    >
                      <ExternalLink size={14} />
                      Buka
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 border-t border-[var(--line)] pt-6">
                <button
                  type="button"
                  onClick={handleSkipToDashboard}
                  className="button-primary flex-1 justify-center py-3"
                >
                  Buka Dashboard Properti
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowRoomForm(true)}
                  className="button-secondary flex-1 justify-center py-3"
                >
                  <Plus size={16} />
                  Tambah Kamar Lain
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reused AddRoomForm Component ── */}
        {showRoomForm && createdPropertyId && (
          <AddRoomForm
            propertyId={createdPropertyId}
            onClose={() => setShowRoomForm(false)}
            onSuccess={() => {
              setShowRoomForm(false)
              handleRoomSuccess()
            }}
          />
        )}
      </div>
    </main>
  )
}
