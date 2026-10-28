"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DoorOpen,
  Layers,
  Lock,
  MapPin,
  Maximize2,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Wifi,
  Wind,
  Zap,
  Car,
  Coffee,
  Bath,
  BedDouble,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { RegistrationForm } from "@/components/botkos/registration-form"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { PageLoader } from "@/components/botkos/page-loader"
import { IdentityVerificationNotice } from "@/components/botkos/identity-verification-notice"
import { ImageLightbox } from "@/components/botkos/image-lightbox"
import type { PublicRoom } from "@/components/botkos/room-detail-card"

type PublicFacility = {
  _id: string
  category: string
  name: string
  description?: string
}

type PublicPhoto = {
  _id: string
  caption?: string
  url: string | null
}

const categoryMeta: Record<string, { label: string; icon: typeof Coffee }> = {
  shared: { label: "Fasilitas Bersama", icon: Coffee },
  services: { label: "Layanan & Servis", icon: Sparkles },
  parking: { label: "Area Parkir", icon: Car },
  security: { label: "Keamanan & Akses", icon: ShieldCheck },
  sports: { label: "Olahraga & Hiburan", icon: Sparkles },
  other: { label: "Fasilitas Tambahan", icon: Layers },
}

export default function PublicRegistrationPage() {
  const params = useParams<{ propertySlug: string }>()
  const searchParams = useSearchParams()
  const applicationCode = searchParams.get("pj") ?? undefined
  const property = useQuery(api.properties.getPublicBySlug, { slug: params.propertySlug, ...(applicationCode ? { applicationCode } : {}) })
  const recordHintLookup = useMutation(api.publicRegistration.recordRegistrationHintLookup)
  const [hintLookupAllowed, setHintLookupAllowed] = useState(!applicationCode)
  const registrationHint = useQuery(api.publicRegistration.getRegistrationHint, hintLookupAllowed && applicationCode ? { registrationSlug: params.propertySlug, applicationCode } : "skip")
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; caption?: string } | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!applicationCode) return
    let active = true
    void recordHintLookup().then((allowed) => { if (active) setHintLookupAllowed(allowed) }).catch(() => { if (active) setHintLookupAllowed(false) })
    return () => { active = false }
  }, [applicationCode, recordHintLookup])

  // Auto select first room
  useEffect(() => {
    if (property?.rooms?.length && !selectedRoomId) {
      setSelectedRoomId(property.rooms[0]._id)
    }
  }, [property?.rooms, selectedRoomId])

  useEffect(() => {
    if (registrationHint?.valid) setSelectedRoomId(registrationHint.roomId)
  }, [registrationHint])

  const propertyGender = useMemo(() => {
    if (!property?.rooms.length) return null
    const genders = new Set(property.rooms.map((r) => r.genderCategory).filter(Boolean))
    if (genders.size === 1) {
      const g = Array.from(genders)[0]
      if (g === "female") return "Kos Putri"
      if (g === "male") return "Kos Putra"
      return "Kos Campur"
    }
    return "Kos Campur"
  }, [property?.rooms])

  const minPrice = useMemo(() => {
    if (!property?.rooms.length) return null
    return Math.min(...property.rooms.map((r) => r.monthlyRent))
  }, [property?.rooms])

  const activeRoom = useMemo(() => {
    return property?.rooms.find((r) => r._id === selectedRoomId) ?? property?.rooms[0]
  }, [property?.rooms, selectedRoomId])

  const groupedFacilities = useMemo(() => {
    if (!property?.facilities) return {}
    const groups: Record<string, PublicFacility[]> = {}
    for (const f of property.facilities as PublicFacility[]) {
      const cat = f.category || "other"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(f)
    }
    return groups
  }, [property?.facilities])

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        // clipboard fallback
      }
    }
  }

  const handleSelectRoomAndScroll = (roomId: string) => {
    setSelectedRoomId(roomId)
    const el = document.getElementById("form-pendaftaran")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // ── Loading State ────────────────────────────────────────────────────────
  if (property === undefined) {
    return (
      <PageLoader
        message="Memuat detail properti & ketersediaan kamar…"
        submessage="Menyiapkan data kamar dan fasilitas untuk Anda"
      />
    )
  }

  // ── Not Found / Inactive State ───────────────────────────────────────────
  if (!property) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--background)] px-5 py-12 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--warn)]/10 text-[var(--warn)]">
            <Building2 size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink)]">Properti Tidak Tersedia</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            Halaman pendaftaran untuk kos ini sedang tidak aktif, dinonaktifkan sementara oleh pemilik, atau tautannya telah diperbarui.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/" className="button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold">
              <ArrowLeft size={16} /> Ke Beranda BotKos
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] pb-24 lg:pb-16">
      {/* ── Top Navbar ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-80"
            >
              <BotKosLogo size={28} showText={true} />
            </Link>
            <span className="text-[var(--line)] hidden sm:inline">/</span>
            <span className="hidden sm:inline-block max-w-[200px] truncate text-xs font-medium text-[var(--ink-muted)]">
              {property.name}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow-xs transition hover:bg-[var(--secondary)]"
              title="Bagikan tautan kos ini"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} className="text-[var(--ink-muted)]" />
                  <span>Bagikan</span>
                </>
              )}
            </button>

            <Link
              href={`/${property.slug}/bayar`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--wood)]/30 bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-semibold text-[var(--wood)] shadow-xs transition hover:bg-[var(--wood)] hover:text-white"
            >
              <CreditCard size={14} />
              <span className="hidden sm:inline">Sudah Penghuni?</span> Bayar Sewa
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ── Property Header & Hero Meta ─────────────────────────────────── */}
        <section className="space-y-4">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {propertyGender ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wood)]/10 px-3 py-1 text-xs font-semibold text-[var(--wood)]">
                <UserCheck size={13} />
                {propertyGender}
              </span>
            ) : null}

            {property.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                <ShieldCheck size={13} />
                Properti Terverifikasi
              </span>
            ) : null}

            {property.ownerIdentityVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200/60">
                <CheckCircle2 size={13} />
                Identitas Pemilik Valid
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFFFF] px-3 py-1 text-xs font-medium text-[var(--ink-muted)] border border-[var(--line)]">
              <DoorOpen size={13} className="text-[var(--wood)]" />
              {property.rooms.length > 0
                ? `${property.rooms.length} Kamar Tersedia`
                : "Kamar Penuh"}
            </span>
          </div>

          {/* Title & Location Row */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink)]">
                {property.name}
              </h1>
              <p className="mt-2.5 flex items-start gap-1.5 text-sm text-[var(--ink-muted)]">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--wood)]" />
                <span>{property.address}</span>
              </p>
            </div>

            {minPrice !== null ? (
              <div className="shrink-0 rounded-xl border border-[var(--line)] bg-[#FFFFFF] p-3.5 sm:text-right shadow-xs">
                <span className="text-xs text-[var(--ink-muted)] block">Tarif sewa mulai dari</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-[var(--wood)]">
                  Rp {minPrice.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-[var(--ink-muted)] ml-1">/bulan</span>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Photo Gallery Showcase ──────────────────────────────────────── */}
        <section className="mt-6">
          {property.photos.length > 0 ? (
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[#FFFFFF] shadow-sm">
              {property.photos.length === 1 ? (
                /* Single Hero Photo */
                <div
                  onClick={() => setPreviewPhoto({ url: property.photos[0].url!, caption: property.photos[0].caption })}
                  className="relative h-72 sm:h-96 w-full cursor-zoom-in overflow-hidden"
                >
                  <img
                    src={property.photos[0].url!}
                    alt={property.photos[0].caption ?? `Foto ${property.name}`}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-102"
                  />
                  <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1.5">
                    <ImageIcon size={14} /> Lihat Foto
                  </div>
                </div>
              ) : property.photos.length === 2 ? (
                /* 2 Photos Grid */
                <div className="grid grid-cols-2 gap-1.5 h-72 sm:h-96">
                  {property.photos.slice(0, 2).map((photo, i) => (
                    <div
                      key={photo._id}
                      onClick={() => setPreviewPhoto({ url: photo.url!, caption: photo.caption })}
                      className="relative h-full cursor-zoom-in overflow-hidden"
                    >
                      <img
                        src={photo.url!}
                        alt={photo.caption ?? `Foto ${property.name} ${i + 1}`}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-103"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Bento Luxury Grid (3+ Photos) */
                <div className="grid grid-cols-1 sm:grid-cols-4 sm:grid-rows-2 gap-1.5 h-[340px] sm:h-[420px]">
                  {/* Featured Main Photo (spans 2 cols, 2 rows) */}
                  <div
                    onClick={() => setPreviewPhoto({ url: property.photos[0].url!, caption: property.photos[0].caption })}
                    className="sm:col-span-2 sm:row-span-2 relative h-full cursor-zoom-in overflow-hidden"
                  >
                    <img
                      src={property.photos[0].url!}
                      alt={property.photos[0].caption ?? `Foto Utama ${property.name}`}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-102"
                    />
                    <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      Foto Utama
                    </div>
                  </div>

                  {/* Secondary Photos */}
                  {property.photos.slice(1, 5).map((photo, idx) => {
                    const isLast = idx === 3 || (idx === property.photos.length - 2 && property.photos.length <= 4)
                    const remainingCount = property.photos.length - 5

                    return (
                      <div
                        key={photo._id}
                        onClick={() => setPreviewPhoto({ url: photo.url!, caption: photo.caption })}
                        className="relative h-full cursor-zoom-in overflow-hidden hidden sm:block"
                      >
                        <img
                          src={photo.url!}
                          alt={photo.caption ?? `Foto ${property.name} ${idx + 2}`}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-104"
                        />
                        {isLast && remainingCount > 0 ? (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2 text-center transition-colors hover:bg-black/45">
                            <ImageIcon size={22} className="mb-1" />
                            <span className="text-sm font-bold">+{remainingCount} Foto</span>
                            <span className="text-[11px] text-white/80">Lihat Semua</span>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* View All Floating Button */}
              <button
                type="button"
                onClick={() => setPreviewPhoto({ url: property.photos[0].url!, caption: property.photos[0].caption })}
                className="absolute bottom-3.5 right-3.5 rounded-xl border border-[var(--line)] bg-[#FFFFFF]/90 px-3.5 py-2 text-xs font-semibold text-[var(--ink)] shadow-md backdrop-blur-md transition hover:bg-[#FFFFFF] flex items-center gap-1.5"
              >
                <ImageIcon size={15} className="text-[var(--wood)]" />
                <span>Lihat Semua ({property.photos.length} Foto)</span>
              </button>
            </div>
          ) : (
            /* Empty Photo Fallback */
            <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[#FFFFFF] p-6 text-center shadow-xs">
              <Building2 size={36} className="text-[var(--wood)]/50" />
              <p className="mt-3 text-sm font-medium text-[var(--ink)]">Foto Properti Belum Diunggah</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Pemilik kos belum menambahkan foto showcase untuk properti ini.
              </p>
            </div>
          )}

          {/* Lightbox Modal */}
          {previewPhoto ? (
            <ImageLightbox
              src={previewPhoto.url}
              alt={previewPhoto.caption ?? `Foto ${property.name}`}
              title={previewPhoto.caption ?? `Foto ${property.name}`}
              onClose={() => setPreviewPhoto(null)}
            />
          ) : null}
        </section>

        {/* ── 2-Column Responsive Layout ──────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* ── Left Column: Details & Catalogue (~7 cols) ────────────────── */}
          <div className="space-y-10 lg:col-span-7">
            {/* 1. Katalog Kamar yang Tersedia */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                    Pilihan Kamar Tersedia
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    Pilih kamar untuk melihat rincian biaya dan langsung mengunci pendaftaran.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--wood)]/10 px-3 py-1 font-mono text-xs font-bold text-[var(--wood)]">
                  {property.rooms.length} unit
                </span>
              </div>

              {property.rooms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[#FFFFFF] p-8 text-center text-sm text-[var(--ink-muted)]">
                  Saat ini seluruh kamar di kos ini sedang terisi atau belum tersedia untuk disewa.
                </div>
              ) : (
                <div className="space-y-4">
                  {(property.rooms as PublicRoom[]).map((room: PublicRoom) => {
                    const isSelected = selectedRoomId === room._id
                    const dpAmt = room.dpAmount ?? Math.round(room.monthlyRent * 0.3)
                    const roomPhoto = room.media?.find((m: { kind: string; url: string | null; caption?: string }) => m.url && m.kind === "photo")

                    return (
                      <article
                        key={room._id}
                        onClick={() => setSelectedRoomId(room._id)}
                        className={`group relative cursor-pointer rounded-2xl border transition-all duration-200 p-5 ${isSelected
                          ? "border-[var(--wood)] bg-[#FFFDF9] ring-2 ring-[var(--wood)]/50 shadow-md"
                          : "border-[var(--line)] bg-[#FFFFFF] hover:border-[var(--wood)]/60 hover:shadow-sm"
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-5">
                          {/* Room Photo Thumbnail (if available) */}
                          {roomPhoto?.url ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewPhoto({
                                  url: roomPhoto.url!,
                                  caption: roomPhoto.caption ?? `Kamar ${room.roomNumber}`,
                                })
                              }}
                              className="relative h-36 w-full sm:w-44 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--background)] cursor-zoom-in"
                            >
                              <img
                                src={roomPhoto.url}
                                alt={`Foto Kamar ${room.roomNumber}`}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-xs">
                                Foto Kamar
                              </div>
                            </div>
                          ) : null}

                          {/* Room Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-bold text-[var(--ink)]">
                                    Kamar {room.roomNumber}
                                  </h3>
                                  {room.roomType ? (
                                    <span className="rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--wood)]">
                                      {room.roomType}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                                  {room.description ?? "Kamar nyaman dan terawat, siap huni."}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono text-lg font-bold text-[var(--wood)]">
                                  Rp {room.monthlyRent.toLocaleString("id-ID")}
                                </span>
                                <span className="block text-[11px] text-[var(--ink-muted)]">/bulan</span>
                              </div>
                            </div>

                            {/* Specs Chips */}
                            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                              {room.floor ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--background)] px-2 py-1 text-[var(--ink)] border border-[var(--line)]/60">
                                  <Layers size={13} className="text-[var(--wood)]" />
                                  Lantai {room.floor}
                                </span>
                              ) : null}

                              {room.sizeSqm ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--background)] px-2 py-1 text-[var(--ink)] border border-[var(--line)]/60">
                                  <Maximize2 size={13} className="text-[var(--wood)]" />
                                  {room.sizeSqm} m²
                                </span>
                              ) : null}

                              {room.bathroomType ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--background)] px-2 py-1 text-[var(--ink)] border border-[var(--line)]/60">
                                  <Bath size={13} className="text-[var(--wood)]" />
                                  {room.bathroomType === "private"
                                    ? "Kamar Mandi Dalam"
                                    : room.bathroomType === "shared"
                                      ? "Kamar Mandi Luar"
                                      : "Tanpa K. Mandi"}
                                </span>
                              ) : null}

                              {room.bedSize ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--background)] px-2 py-1 text-[var(--ink)] border border-[var(--line)]/60">
                                  <BedDouble size={13} className="text-[var(--wood)]" />
                                  Kasur {room.bedSize}
                                </span>
                              ) : null}

                              {room.electricityStatus ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--background)] px-2 py-1 text-[var(--ink)] border border-[var(--line)]/60">
                                  <Zap size={13} className="text-[var(--wood)]" />
                                  {room.electricityStatus === "included"
                                    ? "Listrik Termasuk"
                                    : room.electricityStatus === "metered"
                                      ? "Listrik Meteran"
                                      : "Listrik Terpisah"}
                                </span>
                              ) : null}
                            </div>

                            {/* Amenities summary */}
                            {room.furnitureElectronics?.length ? (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {room.furnitureElectronics.slice(0, 5).map((item: string, i: number) => (
                                  <span
                                    key={i}
                                    className="rounded bg-[#F5EFE6] px-2 py-0.5 text-[11px] text-[var(--ink)]"
                                  >
                                    {item}
                                  </span>
                                ))}
                                {room.furnitureElectronics.length > 5 ? (
                                  <span className="text-[11px] text-[var(--ink-muted)] self-center">
                                    +{room.furnitureElectronics.length - 5} lainnya
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            {/* Card Action Row */}
                            <div className="mt-4 flex items-center justify-between border-t border-[var(--line)]/60 pt-3">
                              <span className="text-xs text-[var(--ink-muted)]">
                                DP Booking:{" "}
                                <strong className="font-mono text-[var(--ink)]">
                                  Rp {dpAmt.toLocaleString("id-ID")}
                                </strong>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectRoomAndScroll(room._id)
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${isSelected
                                  ? "bg-[var(--wood)] text-white shadow-xs"
                                  : "border border-[var(--line)] bg-[#FFFFFF] text-[var(--ink)] hover:border-[var(--wood)]"
                                  }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check size={14} /> Kamar Dipilih
                                  </>
                                ) : (
                                  <>Pilih Kamar Ini</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {/* 2. Fasilitas Properti */}
            {property.facilities.length > 0 ? (
              <section className="space-y-5 rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-7 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                    Fasilitas Properti
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Fasilitas umum dan layanan bersama yang dapat dinikmati oleh seluruh penghuni.
                  </p>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedFacilities).map(([catKey, items]) => {
                    const meta = categoryMeta[catKey] || categoryMeta.other
                    const IconComponent = meta.icon

                    return (
                      <div key={catKey}>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--gold-dark)] mb-3">
                          <IconComponent size={15} />
                          <span>{meta.label}</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {items.map((facility: PublicFacility) => (
                            <div
                              key={facility._id}
                              className="rounded-xl border border-[var(--line)]/70 bg-[#FCFBF9] p-3.5"
                            >
                              <div className="flex items-center gap-2 font-medium text-sm text-[var(--ink)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--wood)] shrink-0" />
                                <span>{facility.name}</span>
                              </div>
                              {facility.description ? (
                                <p className="mt-1 pl-3.5 text-xs text-[var(--ink-muted)] leading-5">
                                  {facility.description}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {/* 3. Ketentuan & Keamanan Pemesanan */}
            <section className="rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                Informasi Transaksi
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--line)]/60 bg-[#FCFBF9] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                    <Lock size={18} />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Kunci Kamar dengan DP</h3>
                  <p className="text-xs text-[var(--ink-muted)] leading-5">
                    DP booking resmi mengunci kamar pilihan Anda agar tidak dialihkan ke calon penyewa lain.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)]/60 bg-[#FCFBF9] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Verifikasi Langsung</h3>
                  <p className="text-xs text-[var(--ink-muted)] leading-5">
                    Bukti pembayaran ditinjau dan dikonfirmasi langsung oleh pemilik properti tanpa potongan biaya calo.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)]/60 bg-[#FCFBF9] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Konfirmasi WhatsApp</h3>
                  <p className="text-xs text-[var(--ink-muted)] leading-5">
                    Status penerimaan dan detail check-in dikirimkan langsung ke nomor WhatsApp yang Anda daftarkan.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Alur 4 Langkah Mudah Booking */}
            <section className="rounded-2xl border border-[var(--line)] bg-[#FCFBF9] p-6 sm:p-7 space-y-4">
              <h2 className="text-base font-bold text-[var(--ink)]">
                4 Langkah Mudah Booking Kos
              </h2>
              <div className="grid gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-lg bg-white border border-[var(--line)] p-3">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">01</span>
                  <p className="mt-1 font-semibold text-[var(--ink)]">Pilih Kamar</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Tentukan nomor kamar yang Anda minati.</p>
                </div>
                <div className="rounded-lg bg-white border border-[var(--line)] p-3">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">02</span>
                  <p className="mt-1 font-semibold text-[var(--ink)]">Isi Data & Nominal</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Pilih opsi DP atau bayar lunas.</p>
                </div>
                <div className="rounded-lg bg-white border border-[var(--line)] p-3">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">03</span>
                  <p className="mt-1 font-semibold text-[var(--ink)]">Upload Resi</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Lampirkan bukti transfer bank / e-wallet.</p>
                </div>
                <div className="rounded-lg bg-white border border-[var(--line)] p-3">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">04</span>
                  <p className="mt-1 font-semibold text-[var(--ink)]">Konfirmasi</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Pemilik menyetujui & kamar terkunci.</p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right Column: Sticky Booking Form (~5 cols) ───────────────── */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
            {!property.ownerIdentityVerified ? (
              <IdentityVerificationNotice action="pendaftaran" />
            ) : property.rooms.length > 0 ? (
              <>
                {registrationHint?.valid ? <div className="border border-[var(--wood)] bg-[#fff8e8] p-4 text-sm leading-6 text-[var(--ink)]">
                  Melanjutkan pengajuan <strong>{applicationCode}</strong> untuk
                  <strong> Kamar {registrationHint.roomLabel}</strong> di
                  <strong> {registrationHint.kosName}</strong>.
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">Transfer hanya ke pemilik kos yang sudah kamu hubungi. Pastikan nama rekening sesuai. BotKos tidak memproses pembayaran dan tidak pernah meminta transfer ke rekening BotKos.</p>
                </div> : null}
                <RegistrationForm
                  propertyName={property.name}
                  slug={property.slug}
                  rooms={property.rooms}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={(roomId) => setSelectedRoomId(roomId)}
                  applicationCode={applicationCode}
                  lockedRoomId={registrationHint?.valid ? registrationHint.roomId : undefined}
                  bankName={property.bankName}
                  bankAccountNumber={property.bankAccountNumber}
                  bankAccountHolder={property.bankAccountHolder}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[#FFFFFF] p-8 text-center text-sm text-[var(--ink-muted)]">
                Belum ada kamar yang tersedia saat ini.
              </div>
            )}

            {/* Banner Khusus Tenant Terdaftar */}
            <Link
              href={`/${property.slug}/bayar`}
              className="group flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-5 shadow-xs transition hover:border-[var(--wood)] hover:shadow-sm"
            >
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--wood)]">
                  <CreditCard size={14} /> Sudah Menjadi Tenant?
                </span>
                <p className="text-sm font-bold text-[var(--ink)] group-hover:text-[var(--wood)]">
                  Bayar Tagihan atau Perpanjang Sewa
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  Masukkan nomor WhatsApp terdaftar untuk melanjutkan pembayaran.
                </p>
              </div>
              <ChevronRight
                size={18}
                className="text-[var(--line)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--wood)] shrink-0 ml-3"
              />
            </Link>

            <p className="text-center text-xs text-[var(--ink-muted)]">
              Data pribadi dan dokumen Anda hanya dibagikan kepada pemilik kos {property.name}.
            </p>
          </div>
        </div>
      </main>

      {/* ── Mobile Fixed Sticky Bottom Action Bar ─────────────────────────── */}
      {property.rooms.length > 0 ? (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--line)] bg-[#FFFFFF]/95 px-4 py-3 backdrop-blur-md shadow-lg flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-[var(--ink-muted)] block">
              {activeRoom ? `Kamar ${activeRoom.roomNumber}` : "Pilihan Kamar"}
            </span>
            <span className="font-mono text-base font-bold text-[var(--wood)]">
              Rp {activeRoom ? activeRoom.monthlyRent.toLocaleString("id-ID") : "-"}
            </span>
            <span className="text-[10px] text-[var(--ink-muted)]">/bln</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("form-pendaftaran")
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            }}
            className="button-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold"
          >
            Bayar Sekarang <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
