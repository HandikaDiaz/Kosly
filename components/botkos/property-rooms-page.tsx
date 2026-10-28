"use client"

import { Pencil, Plus, UserPlus, Users } from "lucide-react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { AddRoomForm } from "./add-room-form"
import { EditRoomModal, type RoomItem } from "./edit-room-modal"
import { RoomCardCarousel } from "./room-card-carousel"
import { RoomTag } from "./room-tag"
import { EmptyState, SectionCard } from "./property-ui"
import { PageLoader } from "./page-loader"

export function PropertyRoomsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const id = propertyId as Id<"properties">

  const rooms = useQuery(api.rooms.listForProperty, { propertyId: id })
  const media = useQuery(api.roomMedia.listForProperty, { propertyId: id })
  const bookings = useQuery(api.bookings.listActiveForProperty, { propertyId: id })
  const occupiedWithoutTenant = useQuery(api.tenants.getOccupiedRoomsWithoutTenant, { propertyId: id })
  const tenants = useQuery(api.tenants.listForProperty, { propertyId: id })

  const [add, setAdd] = useState(false)
  const [editing, setEditing] = useState<RoomItem | null>(null)

  if (!rooms || !media || !bookings || !occupiedWithoutTenant || !tenants) {
    return <PageLoader variant="inline" message="Memuat kamar…" />
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Kamar"
        description={`${rooms.filter((room) => room.status === "occupied").length} terisi · ${rooms.filter((room) => room.status === "available").length} kosong`}
        action={
          <button
            type="button"
            onClick={() => setAdd(true)}
            className="button-primary min-h-11"
          >
            <Plus size={16} />
            <span>Tambah kamar</span>
          </button>
        }
      >
        {occupiedWithoutTenant.length > 0 ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              {occupiedWithoutTenant.length} kamar terisi belum memiliki data penyewa
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {occupiedWithoutTenant.map((room) => (
                <Link
                  key={room.roomId}
                  href={`/dashboard/properties/${id}/kamar/${room.roomId}/isi-penyewa`}
                  className="min-h-11 inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
                >
                  + Isi data kamar {room.roomNumber}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {add ? (
          <AddRoomForm
            propertyId={id}
            onClose={() => setAdd(false)}
            onSuccess={() => setAdd(false)}
          />
        ) : null}

        {editing ? (
          <EditRoomModal
            room={editing}
            mediaList={media.find((item) => item.roomId === editing._id)?.media ?? []}
            onClose={() => setEditing(null)}
            onSuccess={() => setEditing(null)}
          />
        ) : null}

        {rooms.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rooms.map((room) => {
              const roomMedia = media.find((item) => item.roomId === room._id)?.media ?? []
              const booking = bookings.find((item) => item.roomId === room._id)
              const activeTenant = tenants.find(
                (t) => t.roomId === room._id && t.status === "active"
              )

              return (
                <article
                  key={room._id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-white p-3.5 shadow-sm"
                >
                  <div className="flex gap-3">
                    <RoomCardCarousel
                      media={roomMedia}
                      roomNumber={room.roomNumber}
                      className="h-24 w-24 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <RoomTag
                        number={room.roomNumber}
                        rent={`${(room.monthlyRent / 1000000).toFixed(2).replace(".00", "")} jt`}
                        status={room.status}
                        deadline={booking ? new Date(booking.deadlineAt).toLocaleDateString("id-ID") : undefined}
                      />
                      <p className="mt-2 truncate text-sm font-semibold text-[var(--ink)]">
                        {room.roomType ?? "Kamar"}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {room.sizeSqm ? `${room.sizeSqm} m²` : "Ukuran belum diisi"} · {roomMedia.length} foto/video
                      </p>

                      {activeTenant && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[var(--ink)]">
                          <Users size={12} className="text-[var(--wood)] shrink-0" />
                          <span className="truncate">Penghuni: <strong>{activeTenant.name}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-[var(--line)]/60">
                    {activeTenant ? (
                      <Link
                        href={`/dashboard/tenants/${activeTenant._id}`}
                        className="button-secondary min-h-10 flex-1 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <Users size={13} />
                        <span className="truncate">Data Penghuni</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/properties/${id}/kamar/${room._id}/isi-penyewa`}
                        className="button-primary min-h-10 flex-1 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <UserPlus size={13} />
                        <span>+ Isi Penyewa</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditing(room as RoomItem)}
                      className="button-secondary min-h-10 px-3 text-xs font-medium"
                      title="Edit kamar & foto"
                    >
                      <Pencil size={13} />
                      <span className="hidden sm:inline ml-1">Edit</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            action={
              <button
                type="button"
                onClick={() => setAdd(true)}
                className="button-primary min-h-11"
              >
                Tambah kamar
              </button>
            }
          >
            Belum ada kamar di properti ini.
          </EmptyState>
        )}
      </SectionCard>
    </div>
  )
}
