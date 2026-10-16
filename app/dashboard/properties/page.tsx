"use client"

import Link from "next/link"
import { ArrowUpRight, Building2, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { TierLimitModal, type TierLimitInfo } from "@/components/botkos/tier-limit-modal"
import { AddPropertyModal } from "@/components/botkos/add-property-modal"
import { EditPropertyModal } from "@/components/botkos/edit-property-modal"

export default function PropertiesPage() {
  const [now] = useState(() => Date.now())
  const data = useQuery(api.dashboard.getOverview, { now })
  const [showForm, setShowForm] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<Id<"properties"> | null>(null)
  const [tierLimitInfo, setTierLimitInfo] = useState<TierLimitInfo | null>(null)
  const editingProperty = data?.properties.find((property) => property._id === editingPropertyId)
  const editingPhotos = useQuery(api.propertyPhotos.listMine, editingPropertyId ? { propertyId: editingPropertyId } : "skip")

  if (!data) return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat properti…</div>

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm text-[var(--ink-muted)]">Pengelolaan properti</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Properti & kamar</h1></div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="button-primary w-fit"><Plus size={16} />Tambah properti</button>
        </header>
        {showForm && <AddPropertyModal onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} onTierLimit={(info) => { setShowForm(false); setTierLimitInfo(info) }} />}
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.properties.map((property) => {
            const occupied = property.rooms.filter((room) => room.status === "occupied").length
            const available = property.rooms.filter((room) => room.status === "available").length
            return <div key={property._id} className="relative">
              <Link href={"/dashboard/properties/" + property._id} className="group block border border-[var(--line)] bg-[#fffefa] p-6 transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center bg-[#8B5E34]/10 text-[var(--wood)]"><Building2 size={21} /></span><ArrowUpRight className="text-[var(--ink-muted)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" size={18} /></div>
              <h2 className="mt-7 text-xl font-semibold text-[var(--ink)]">{property.name}</h2><p className="mt-2 text-sm text-[var(--ink-muted)]">{property.address}</p><p className="mt-3 break-all text-xs text-[var(--wood)]">/{property.slug}/daftar</p>
              <div className="mt-7 grid grid-cols-3 border-t border-[var(--line)] pt-4 text-sm"><div><p className="font-mono text-lg text-[var(--ink)]">{property.rooms.length}</p><p className="text-xs text-[var(--ink-muted)]">Total kamar</p></div><div><p className="font-mono text-lg text-[var(--sage)]">{occupied}</p><p className="text-xs text-[var(--ink-muted)]">Terisi</p></div><div><p className="font-mono text-lg text-[var(--wood)]">{available}</p><p className="text-xs text-[var(--ink-muted)]">Kosong</p></div></div>
              </Link>
              <button type="button" onClick={() => setEditingPropertyId(property._id)} className="absolute right-4 top-4 inline-flex items-center gap-1.5 border border-[var(--line)] bg-[#fffefa] px-2.5 py-1.5 text-xs font-semibold text-[var(--wood)] shadow-sm hover:border-[var(--wood)]" aria-label={"Edit " + property.name}><Pencil size={13} />Edit</button>
            </div>
          })}
        </div>
        {data.properties.length === 0 && <p className="mt-8 border border-dashed border-[var(--line)] p-8 text-sm text-[var(--ink-muted)]">Belum ada properti.</p>}
      </div>
      {editingProperty && editingPhotos && <EditPropertyModal property={editingProperty} photos={editingPhotos} onClose={() => setEditingPropertyId(null)} onSuccess={() => setEditingPropertyId(null)} />}
      {tierLimitInfo && <TierLimitModal info={tierLimitInfo} onDismiss={() => setTierLimitInfo(null)} />}
    </div>
  )
}
