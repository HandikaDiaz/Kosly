"use client"

import { Pencil, Plus } from "lucide-react"
import { useParams } from "next/navigation"
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
  const { propertyId } = useParams<{ propertyId: string }>(); const id = propertyId as Id<"properties">
  const rooms = useQuery(api.rooms.listForProperty, { propertyId: id }); const media = useQuery(api.roomMedia.listForProperty, { propertyId: id }); const bookings = useQuery(api.bookings.listActiveForProperty, { propertyId: id })
  const [add, setAdd] = useState(false); const [editing, setEditing] = useState<RoomItem | null>(null)
  if (!rooms || !media || !bookings) return <PageLoader variant="inline" message="Memuat kamar…" />
  return <div className="space-y-5"><SectionCard title="Kamar" description={`${rooms.filter((room) => room.status === "occupied").length} terisi · ${rooms.filter((room) => room.status === "available").length} kosong`} action={<button type="button" onClick={() => setAdd(true)} className="button-primary min-h-11"><Plus size={16} />Tambah kamar</button>}>{add ? <AddRoomForm propertyId={id} onClose={() => setAdd(false)} onSuccess={() => setAdd(false)} /> : null}{editing ? <EditRoomModal room={editing} mediaList={media.find((item) => item.roomId === editing._id)?.media ?? []} onClose={() => setEditing(null)} onSuccess={() => setEditing(null)} /> : null}{rooms.length ? <div className="grid gap-4 md:grid-cols-2">{rooms.map((room) => { const roomMedia = media.find((item) => item.roomId === room._id)?.media ?? []; const booking = bookings.find((item) => item.roomId === room._id); return <article key={room._id} className="rounded-xl border border-[var(--line)] bg-white p-3"><div className="flex gap-3"><RoomCardCarousel media={roomMedia} roomNumber={room.roomNumber} className="h-24 w-24 shrink-0" /><div className="min-w-0 flex-1"><RoomTag number={room.roomNumber} rent={`${(room.monthlyRent / 1000000).toFixed(2).replace(".00", "")} jt`} status={room.status} deadline={booking ? new Date(booking.deadlineAt).toLocaleDateString("id-ID") : undefined} /><p className="mt-2 truncate text-sm font-semibold">{room.roomType ?? "Kamar"}</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{room.sizeSqm ? `${room.sizeSqm} m²` : "Ukuran belum diisi"} · {roomMedia.length} foto/video</p></div></div><button type="button" onClick={() => setEditing(room as RoomItem)} className="button-secondary mt-3 min-h-11 w-full text-sm"><Pencil size={14} />Edit kamar & foto</button></article> })}</div> : <EmptyState action={<button type="button" onClick={() => setAdd(true)} className="button-primary min-h-11">Tambah kamar</button>}>Belum ada kamar di properti ini.</EmptyState>}</SectionCard></div>
}
