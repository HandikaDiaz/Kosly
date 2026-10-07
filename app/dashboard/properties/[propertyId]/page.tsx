"use client"

import Link from "next/link"
import { Copy, ExternalLink, Plus, Pencil } from "lucide-react"
import { FormEvent, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useParams } from "next/navigation"
import { RoomTag } from "@/components/botkos/room-tag"
import { AddRoomForm } from "@/components/botkos/add-room-form"
import { EditFacilityModal, type PropertyFacilityItem } from "@/components/botkos/edit-facility-modal"
import { EditRoomModal, type RoomItem } from "@/components/botkos/edit-room-modal"
import { RoomCardCarousel } from "@/components/botkos/room-card-carousel"

const facilityLabels = {
  shared: "Fasilitas bersama",
  services: "Komplementer & servis",
  parking: "Area parkir",
  security: "Keamanan & akses",
  sports: "Olahraga & hiburan",
  other: "Lainnya",
} as const

const categories = Object.keys(facilityLabels) as Array<keyof typeof facilityLabels>
const optionalText = (form: FormData, name: string) => String(form.get(name) ?? "").trim() || undefined

export default function PropertyDetailPage() {
  const params = useParams<{ propertyId: string }>()
  const propertyId = params.propertyId as Id<"properties">

  const property = useQuery(api.properties.getMine, { propertyId })
  const rooms = useQuery(api.rooms.listForProperty, { propertyId })
  const facilities = useQuery(api.propertyFacilities.listForProperty, { propertyId })
  const roomMedia = useQuery(api.roomMedia.listForProperty, { propertyId })
  const bookings = useQuery(api.bookings.listActiveForProperty, { propertyId })

  const createFacility = useMutation(api.propertyFacilities.create)
  const setFacilityActive = useMutation(api.propertyFacilities.setActive)

  const [showRoomForm, setShowRoomForm] = useState(false)
  const [editingFacility, setEditingFacility] = useState<PropertyFacilityItem | null>(null)
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!property || !rooms || !facilities || !roomMedia || !bookings) {
    return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat properti…</div>
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://domain-anda.com")
  const registrationUrl = `${baseUrl.replace(/\/$/, "")}/${property.slug}/daftar`

  const submitFacility = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      await createFacility({
        propertyId,
        category: String(form.get("category") ?? "shared") as keyof typeof facilityLabels,
        name: String(form.get("name") ?? ""),
        description: optionalText(form, "description"),
      })
      event.currentTarget.reset()
      setNotice("Fasilitas berhasil ditambahkan.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fasilitas gagal ditambahkan.")
    }
  }

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ── */}
        <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">Properti / {property.name}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              {property.name}
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">{property.address}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRoomForm(true)}
            className="button-primary w-fit"
          >
            <Plus size={16} />
            Tambah kamar
          </button>
        </header>

        {/* ── Add Room Modal ── */}
        {showRoomForm && (
          <AddRoomForm
            propertyId={propertyId}
            onClose={() => setShowRoomForm(false)}
            onSuccess={(msg) => {
              setNotice(msg)
              setShowRoomForm(false)
            }}
          />
        )}

        {/* ── Edit Facility Modal ── */}
        {editingFacility && (
          <EditFacilityModal
            facility={editingFacility}
            onClose={() => setEditingFacility(null)}
            onSuccess={(msg) => {
              setNotice(msg)
              setEditingFacility(null)
            }}
          />
        )}

        {/* ── Edit Room Modal (Includes Photo/Video Upload) ── */}
        {editingRoom && (
          <EditRoomModal
            room={editingRoom}
            mediaList={
              roomMedia.find((item) => item.roomId === editingRoom._id)?.media ?? []
            }
            onClose={() => setEditingRoom(null)}
            onSuccess={(msg) => {
              setNotice(msg)
              setEditingRoom(null)
            }}
          />
        )}

        {/* ── Notices & Errors ── */}
        {notice && <p className="mt-5 text-sm text-[var(--sage)]">{notice}</p>}
        {error && (
          <p role="alert" className="mt-5 text-sm text-[var(--warn)]">
            {error}
          </p>
        )}

        {/* ── Registration Link Section ── */}
        <section className="mt-8 border border-[var(--line)] bg-[#fffefa] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Link pendaftaran penyewa</p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Bagikan link ini. Penyewa tidak perlu membuat akun.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(registrationUrl)}
              className="button-secondary w-fit"
            >
              <Copy size={15} />
              Salin link
            </button>
          </div>
          <div className="mt-5 flex items-center gap-2 overflow-hidden border border-[var(--line)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--wood)]">
            <span className="truncate">{registrationUrl}</span>
            <a href={registrationUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="shrink-0" size={14} />
            </a>
          </div>
        </section>

        {/* ── Facilities Section ── */}
        <section className="mt-10 border border-[var(--line)] bg-[#fffefa] p-5 sm:p-6">
          <p className="text-sm text-[var(--ink-muted)]">Fasilitas properti</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
            Informasi pada link publik
          </h2>

          {/* Quick Add Form */}
          <form
            onSubmit={(event) => void submitFacility(event)}
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.5fr_2fr_auto]"
          >
            <select className="field-input" name="category" defaultValue="shared">
              {categories.map((category) => (
                <option key={category} value={category}>
                  {facilityLabels[category]}
                </option>
              ))}
            </select>
            <input
              className="field-input"
              name="name"
              required
              placeholder="Contoh: Wi-Fi cepat"
            />
            <input
              className="field-input"
              name="description"
              placeholder="Keterangan (opsional)"
            />
            <button className="button-secondary" type="submit">
              <Plus size={15} />
              Tambah
            </button>
          </form>

          {/* Facility List Grouped by Category */}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {categories.map((category) => {
              const categoryFacilities = facilities.filter(
                (facility) => facility.category === category
              )

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">
                    {facilityLabels[category]}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {categoryFacilities.length > 0 ? (
                      categoryFacilities.map((facility) => (
                        <div
                          className="flex items-center justify-between border border-[var(--line)] px-3 py-2 text-sm"
                          key={facility._id}
                        >
                          <span
                            className={
                              facility.isActive
                                ? "text-[var(--ink)]"
                                : "text-[var(--ink-muted)] line-through"
                            }
                          >
                            {facility.name}
                            {facility.description ? (
                              <small className="ml-2 text-[var(--ink-muted)]">
                                {facility.description}
                              </small>
                            ) : null}
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingFacility(facility as PropertyFacilityItem)
                              }
                              className="inline-flex items-center gap-1 text-xs text-[var(--wood)] hover:underline"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <span className="text-[var(--line)]" aria-hidden="true">
                              |
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void setFacilityActive({
                                  facilityId: facility._id,
                                  isActive: !facility.isActive,
                                })
                              }
                              className="text-xs text-[var(--wood)] hover:underline"
                            >
                              {facility.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--ink-muted)] italic">
                        Belum ada fasilitas di kategori ini.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Rooms Rack Section ── */}
        <section className="mt-10">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-sm text-[var(--ink-muted)]">Rak kamar</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
                {rooms.length} kamar
              </h2>
            </div>
            <span className="text-sm text-[var(--ink-muted)]">
              {rooms.filter((room) => room.status === "occupied").length} terisi ·{" "}
              {rooms.filter((room) => room.status === "available").length} kosong
            </span>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {rooms.map((room) => {
              const booking = bookings.find((item) => item.roomId === room._id)
              const media = roomMedia.find((item) => item.roomId === room._id)?.media ?? []

              return (
                <article
                  className="flex flex-col justify-between overflow-hidden border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5 shadow-sm transition-all hover:border-[var(--wood)]/60"
                  key={room._id}
                >
                  <div>
                    {/* Header: RoomTag & Slideshow Carousel ALWAYS side-by-side */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="shrink-0">
                        <RoomTag
                          number={room.roomNumber}
                          rent={`${(room.monthlyRent / 1000000)
                            .toFixed(2)
                            .replace(".00", "")} jt`}
                          status={room.status}
                          deadline={
                            booking
                              ? new Date(booking.deadlineAt).toLocaleDateString("id-ID")
                              : undefined
                          }
                        />
                      </div>

                      {/* Slideshow carousel side-by-side with fluid flex-1 width */}
                      <RoomCardCarousel
                        media={media}
                        roomNumber={room.roomNumber}
                        className="h-40 flex-1 min-w-0"
                      />
                    </div>

                    {/* Room Size & Type Badges next to / above description */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 font-mono text-xs text-[var(--wood)]">
                        {room.sizeSqm ? `${room.sizeSqm} m²` : "Ukuran belum diisi"}
                      </span>
                      <span className="inline-flex items-center border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 font-mono text-xs text-[var(--wood)]">
                        {room.roomType ?? "Tipe belum diisi"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                      {room.description ??
                        "Tambahkan deskripsi, fasilitas, dan ketentuan kamar agar penyewa mendapat informasi lengkap."}
                    </p>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs">
                    <span className="text-[var(--ink-muted)] font-mono">
                      {media.length} foto/video
                    </span>

                    <button
                      type="button"
                      onClick={() => setEditingRoom(room as RoomItem)}
                      className="button-secondary py-1.5 px-3 text-xs"
                    >
                      <Pencil size={13} />
                      Edit Kamar &amp; Foto
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── Back link ── */}
        <section className="mt-12 border-t border-[var(--line)] pt-8">
          <Link href="/dashboard" className="text-sm font-semibold text-[var(--wood)]">
            Kembali ke ringkasan
          </Link>
        </section>
      </div>
    </div>
  )
}
