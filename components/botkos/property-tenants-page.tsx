"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  DoorOpen,
  ExternalLink,
  FileText,
  MessageCircle,
  Phone,
  Plus,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { RentalApplicationsSection } from "./rental-applications-section"
import { OwnerDisputesSection } from "./owner-disputes-section"
import { PageLoader } from "./page-loader"

export function PropertyTenantsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const id = propertyId as Id<"properties">

  const property = useQuery(api.properties.getMine, { propertyId: id })
  const tenants = useQuery(api.tenants.listForPropertyWithDetails, { propertyId: id })
  const rooms = useQuery(api.rooms.listForProperty, { propertyId: id })
  const occupiedWithoutTenant = useQuery(api.tenants.getOccupiedRoomsWithoutTenant, { propertyId: id })
  const badges = useQuery(api.dashboard.getPropertyTabBadges, { propertyId: id })

  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [showApplications, setShowApplications] = useState(false)

  if (
    property === undefined ||
    tenants === undefined ||
    rooms === undefined ||
    occupiedWithoutTenant === undefined ||
    badges === undefined
  ) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat data penghuni…"
        submessage="Mengambil daftar penyewa dan status kamar"
      />
    )
  }

  if (!property) return null

  // Rooms that can have a new tenant added:
  // 1. Available rooms
  // 2. Occupied rooms that don't have an active tenant record yet
  const activeTenantRoomIds = new Set(
    tenants.filter((t) => t.status === "active").map((t) => t.roomId)
  )
  const roomsReadyForTenant = rooms.filter(
    (r) => !activeTenantRoomIds.has(r._id)
  )

  const activeTenants = tenants.filter((t) => t.status === "active")
  const inactiveTenants = tenants.filter((t) => t.status !== "active")

  return (
    <div className="space-y-6">
      {/* ── Top Header with Action Button ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
            Daftar Penghuni
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
            {activeTenants.length} penghuni aktif dari total {rooms.length} kamar
          </p>
        </div>

        {/* Primary CTA: Add Tenant */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoomPicker((prev) => !prev)}
            className="button-primary inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 text-sm font-semibold sm:w-auto"
          >
            <UserPlus size={16} />
            <span>+ Tambah Penghuni</span>
            <ChevronDown size={14} className={`transition-transform ${showRoomPicker ? "rotate-180" : ""}`} />
          </button>

          {/* Room Selector Dropdown */}
          {showRoomPicker && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowRoomPicker(false)}
              />
              <div className="absolute right-0 top-full z-40 mt-2 w-full min-w-[280px] sm:w-80 rounded-2xl border border-[var(--line)] bg-[#fffefa] p-3 shadow-xl">
                <div className="px-2 py-1.5 border-b border-[var(--line)]">
                  <p className="text-xs font-bold text-[var(--ink)]">Pilih Kamar yang Diisi:</p>
                  <p className="text-[11px] text-[var(--ink-muted)]">Pilih nomor kamar untuk memasukkan data penyewa</p>
                </div>

                <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                  {roomsReadyForTenant.length > 0 ? (
                    roomsReadyForTenant.map((room) => {
                      const isOccupiedWithoutData = occupiedWithoutTenant.some(
                        (o) => o.roomId === room._id
                      )
                      return (
                        <Link
                          key={room._id}
                          href={`/dashboard/properties/${id}/kamar/${room._id}/isi-penyewa`}
                          onClick={() => setShowRoomPicker(false)}
                          className="flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs transition hover:bg-[var(--background)]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)] font-bold text-xs">
                              {room.roomNumber}
                            </span>
                            <div>
                              <p className="font-semibold text-[var(--ink)]">Kamar {room.roomNumber}</p>
                              <p className="text-[10px] text-[var(--ink-muted)]">
                                Rp {(room.monthlyRent / 1000).toLocaleString("id-ID")}/bln
                              </p>
                            </div>
                          </div>

                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              isOccupiedWithoutData
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isOccupiedWithoutData ? "Perlu Data" : "Kosong"}
                          </span>
                        </Link>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center">
                      <DoorOpen size={24} className="mx-auto text-[var(--ink-muted)] opacity-50 mb-1" />
                      <p className="text-xs font-semibold text-[var(--ink)]">Semua Kamar Sudah Terisi</p>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-1">
                        Tambahkan kamar baru di tab Kamar jika kos memiliki penambahan unit.
                      </p>
                      <Link
                        href={`/dashboard/properties/${id}/kamar`}
                        onClick={() => setShowRoomPicker(false)}
                        className="mt-2 inline-block text-xs font-semibold text-[var(--wood)] underline"
                      >
                        Buka Tab Kamar
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Alert: Occupied Rooms Missing Tenant Data ── */}
      {occupiedWithoutTenant.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
              <AlertCircle size={18} />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                {occupiedWithoutTenant.length} Kamar Berstatus Terisi Belum Ada Data Penyewa
              </h3>
              <p className="mt-0.5 text-xs text-amber-800">
                Lengkapi nama & nomor WhatsApp penyewa agar bot dapat mulai mengirimkan tagihan otomatis.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {occupiedWithoutTenant.map((room) => (
                  <Link
                    key={room.roomId}
                    href={`/dashboard/properties/${id}/kamar/${room.roomId}/isi-penyewa`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                  >
                    <span>+ Isi Data Kamar {room.roomNumber}</span>
                    <ArrowRight size={12} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Tenants List ── */}
      {activeTenants.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {activeTenants.map((tenant) => {
            const waNumber = tenant.phone ? tenant.phone.replace(/\D/g, "") : null
            const waLink = waNumber ? `https://wa.me/${waNumber}` : null

            return (
              <article
                key={tenant._id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5 shadow-sm transition hover:border-[var(--wood)]/40 hover:shadow-md"
              >
                <div>
                  {/* Top: Room & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--wood)]/10 px-2.5 py-1 text-xs font-bold text-[var(--wood)]">
                      <DoorOpen size={13} />
                      <span>Kamar {tenant.roomNumber}</span>
                    </span>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      Aktif
                    </span>
                  </div>

                  {/* Tenant Name & Details */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-[var(--ink)]">
                      {tenant.name}
                    </h3>

                    {/* Phone Number with WhatsApp quick action */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                      <Phone size={13} className="shrink-0 text-[var(--wood)]" />
                      {tenant.phone ? (
                        <span>{tenant.phone}</span>
                      ) : (
                        <span className="text-amber-700 italic">Belum ada nomor HP</span>
                      )}
                    </div>

                    {/* Rent Due Date */}
                    <div className="mt-2.5 rounded-xl bg-stone-50 border border-stone-200/60 p-2.5 text-xs">
                      <div className="flex justify-between items-center text-[var(--ink-muted)]">
                        <span>Jatuh Tempo:</span>
                        <strong className="text-[var(--ink)]">Setiap Tgl {tenant.dueDay}</strong>
                      </div>
                      <div className="mt-1 flex justify-between items-center text-[var(--ink-muted)]">
                        <span>Siklus Sewa:</span>
                        <span className="capitalize">{tenant.payment_type ?? "bulanan"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      <MessageCircle size={13} />
                      <span>Chat WA</span>
                    </a>
                  ) : (
                    <span />
                  )}

                  <Link
                    href={`/dashboard/tenants/${tenant._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wood)] hover:underline"
                  >
                    <span>Detail & Tagihan</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[#fffefa] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wood)]/10 text-[var(--wood)]">
            <Users size={28} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">
            Belum Ada Data Penghuni
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--ink-muted)] sm:text-sm">
            Jika kamar kos Anda saat ini sudah ada penghuninya, masukkan data mereka sekarang.
            BotKos akan otomatis menjadwalkan pengingat jatuh tempo dan memfasilitasi link pembayaran via bot WhatsApp / Telegram.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowRoomPicker(true)}
              className="button-primary inline-flex min-h-11 items-center gap-2 px-6 text-xs font-semibold sm:text-sm"
            >
              <UserPlus size={16} />
              <span>+ Masukkan Data Penghuni Pertama</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Sub-Section: Pengajuan Sewa & Sengketa (Collapsible) ── */}
      <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-6 shadow-sm">
        <div
          className="flex cursor-pointer items-center justify-between select-none"
          onClick={() => setShowApplications((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-[var(--wood)]">
              <FileText size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--ink)] sm:text-base">
                  Pengajuan Sewa & Sengketa
                </h3>
                {badges.applicationsOpen > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {badges.applicationsOpen} Pengajuan Baru
                  </span>
                )}
                {badges.disputesOpen > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {badges.disputesOpen} Sengketa
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ink-muted)]">
                Calon penyewa yang mendaftar lewat web publik kos dan sanggahan catatan pembayaran
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-stone-100"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                showApplications ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Content expanded */}
        {showApplications && (
          <div className="mt-6 space-y-6 border-t border-[var(--line)] pt-6">
            <RentalApplicationsSection propertyId={id} />
            <OwnerDisputesSection propertyId={id} />
          </div>
        )}
      </section>
    </div>
  )
}

