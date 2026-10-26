"use client"

import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  DoorOpen,
  ExternalLink,
  Globe,
  Home,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { propertyTabUrl } from "@/lib/propertyTabs"
import { PageLoader } from "./page-loader"
import { AddPropertyModal } from "./add-property-modal"
import { EditPropertyModal } from "./edit-property-modal"
import { TierLimitModal, type TierLimitInfo } from "./tier-limit-modal"

export function PropertiesStatusPage() {
  const properties = useQuery(api.dashboard.listPropertiesWithStatus, {})
  const [showForm, setShowForm] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<Id<"properties"> | null>(null)
  const [tierLimitInfo, setTierLimitInfo] = useState<TierLimitInfo | null>(null)
  const editingProperty = useQuery(
    api.properties.getMine,
    editingPropertyId ? { propertyId: editingPropertyId } : "skip"
  )
  const editingPhotos = useQuery(
    api.propertyPhotos.listMine,
    editingPropertyId ? { propertyId: editingPropertyId } : "skip"
  )

  if (!properties) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat daftar properti…"
        submessage="Mengambil data kos, kamar, dan status publikasi"
      />
    )
  }

  // Calculate summary metrics across all properties
  const totalProperties = properties.length
  const totalRooms = properties.reduce((acc, p) => acc + p.roomTotal, 0)
  const totalOccupied = properties.reduce((acc, p) => acc + p.roomOccupied, 0)
  const totalAvailable = properties.reduce((acc, p) => acc + p.roomAvailable, 0)
  const totalActions = properties.reduce(
    (acc, p) => acc + (p.applicationsOpen + p.reviewsUnreplied),
    0
  )

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-8 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold-pale)] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
            <Building2 size={13} />
            <span>Manajemen Kos</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Properti &amp; Kamar
          </h1>
          <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
            Pantau status keterisian kamar, verifikasi lokasi, dan kelola calon penyewa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm sm:w-auto"
        >
          <Plus size={16} />
          <span>Tambah Properti</span>
        </button>
      </header>

      {/* ── Quick Summary Stats Bar ── */}
      {totalProperties > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Total Properti
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[var(--ink)]">
              {totalProperties}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Bangunan aktif</p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Total Kamar
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[var(--ink)]">
              {totalRooms}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Semua unit</p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Terisi
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-700">
              {totalOccupied}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
              {totalRooms > 0 ? `${Math.round((totalOccupied / totalRooms) * 100)}% keterisian` : "0%"}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold text-[var(--gold-dark)] uppercase tracking-wider">
              Kosong (Tersedia)
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[var(--wood)]">
              {totalAvailable}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Siap dihuni</p>
          </div>
        </div>
      )}

      {/* ── Global Action Banner (if any property needs attention) ── */}
      {totalActions > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-sm sm:text-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-950">
              Ada {totalActions} hal yang perlu perhatian Anda
            </p>
            <p className="text-amber-800/80 text-[11px] sm:text-xs">
              Calon penyewa baru atau ulasan menunggu balasan Anda.
            </p>
          </div>
        </div>
      )}

      {/* ── Property Cards Grid ── */}
      {properties.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const actionCount = property.applicationsOpen + property.reviewsUnreplied
            const occupancyPct =
              property.roomTotal > 0
                ? Math.round((property.roomOccupied / property.roomTotal) * 100)
                : 0
            const publicUrl = `/kos/${property.publicSlug ?? property.slug}`

            return (
              <div
                key={property.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[#fffefa] shadow-sm transition hover:border-[var(--wood)] hover:shadow-md"
              >
                {/* ── Card Cover Media ── */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#8B5E34]/10 via-[var(--gold)]/10 to-stone-100">
                  {property.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={property.coverPhotoUrl}
                      alt={property.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-[var(--wood)]/40">
                      <Building2 size={44} strokeWidth={1.5} />
                      <span className="mt-1 text-[11px] font-semibold tracking-wider uppercase text-[var(--ink-muted)]">
                        Belum Ada Foto
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay for badges readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/25" />

                  {/* Status Badges Overlay (Top-Left) */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                        property.isPublished
                          ? "bg-emerald-600/90 text-white"
                          : "bg-stone-800/80 text-stone-200"
                      }`}
                    >
                      <Globe size={10} />
                      {property.isPublished ? "Dipublikasikan" : "Draft"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                        property.locationVerified
                          ? "bg-sky-600/90 text-white"
                          : "bg-amber-600/90 text-white"
                      }`}
                    >
                      <ShieldCheck size={10} />
                      {property.locationVerified ? "Lokasi Valid" : "Cek Lokasi"}
                    </span>
                  </div>

                  {/* Action Badge (Top-Right) */}
                  {actionCount > 0 && (
                    <div className="absolute right-3 top-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black shadow-md animate-pulse">
                        <AlertCircle size={11} />
                        {actionCount} Perlu Tindakan
                      </span>
                    </div>
                  )}

                  {/* Edit button in media overlay */}
                  <button
                    type="button"
                    onClick={() => setEditingPropertyId(property.id)}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-sm backdrop-blur-md transition hover:bg-white"
                    title={`Edit data ${property.name}`}
                  >
                    <Pencil size={12} />
                    <span>Edit Info</span>
                  </button>
                </div>

                {/* ── Card Body ── */}
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                  <div>
                    {/* Property Title & Address */}
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-bold tracking-tight text-[var(--ink)] group-hover:text-[var(--wood)] transition-colors sm:text-xl">
                        {property.name}
                      </h2>
                    </div>

                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                      <MapPin size={13} className="shrink-0 text-[var(--wood)]" />
                      <span className="truncate">{property.address}</span>
                    </p>

                    {/* Room Occupancy Progress Bar */}
                    <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--ink)]">Keterisian Kamar</span>
                        <span className="font-mono font-bold text-[var(--wood)]">
                          {occupancyPct}%
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--wood)] to-[var(--gold)] transition-all duration-500"
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>

                      {/* Room Stats Pill Breakdown */}
                      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="rounded-lg bg-white p-1.5 border border-[var(--line)]">
                          <p className="font-mono font-bold text-[var(--ink)]">
                            {property.roomTotal}
                          </p>
                          <p className="text-[10px] text-[var(--ink-muted)]">Total</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-1.5 border border-emerald-100">
                          <p className="font-mono font-bold text-emerald-700">
                            {property.roomOccupied}
                          </p>
                          <p className="text-[10px] text-emerald-800">Terisi</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-1.5 border border-amber-100">
                          <p className="font-mono font-bold text-amber-800">
                            {property.roomAvailable}
                          </p>
                          <p className="text-[10px] text-amber-900">Kosong</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Card Action Links ── */}
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--line)]">
                    <Link
                      href={propertyTabUrl(String(property.id), "summary")}
                      className="button-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold"
                    >
                      <span>Kelola Properti</span>
                      <ArrowRight size={14} />
                    </Link>

                    {property.isPublished && (
                      <Link
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--ink-muted)] shadow-sm transition hover:bg-[var(--background)] hover:text-[var(--ink)]"
                        title="Lihat halaman kos publik"
                      >
                        <ExternalLink size={14} />
                        <span className="hidden sm:inline">Publik</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="rounded-3xl border-2 border-dashed border-[var(--line)] bg-white/70 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold-pale)] text-[var(--gold-dark)] shadow-inner">
            <Building2 size={32} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--ink)] sm:text-xl">
            Belum Ada Properti Terdaftar
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--ink-muted)] sm:text-sm">
            Mulai kelola kos Anda dengan menambahkan data bangunan pertama. Anda bisa menambahkan
            kamar, mengatur tarif sewa, dan menerbitkan halaman publik.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="button-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm"
            >
              <Plus size={16} />
              <span>Tambah Properti Pertama</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showForm && (
        <AddPropertyModal
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
          onTierLimit={(info) => {
            setShowForm(false)
            setTierLimitInfo(info)
          }}
        />
      )}

      {editingProperty && editingPhotos && (
        <EditPropertyModal
          property={editingProperty}
          photos={editingPhotos}
          onClose={() => setEditingPropertyId(null)}
          onSuccess={() => setEditingPropertyId(null)}
        />
      )}

      {tierLimitInfo && (
        <TierLimitModal info={tierLimitInfo} onDismiss={() => setTierLimitInfo(null)} />
      )}
    </div>
  )
}
