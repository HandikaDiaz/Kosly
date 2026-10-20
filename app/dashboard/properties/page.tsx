"use client"

import Link from "next/link"
import { ArrowUpRight, Building2, Pencil, Plus, Lock, EyeOff } from "lucide-react"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { TierLimitModal, type TierLimitInfo } from "@/components/botkos/tier-limit-modal"
import { SubscriptionLockModal, type SubscriptionLockInfo } from "@/components/botkos/subscription-lock-modal"
import { AddPropertyModal } from "@/components/botkos/add-property-modal"
import { EditPropertyModal } from "@/components/botkos/edit-property-modal"
import { PageLoader } from "@/components/botkos/page-loader"

export default function PropertiesPage() {
  const [now] = useState(() => Date.now())
  const data = useQuery(api.dashboard.getOverview, { now })
  const [showForm, setShowForm] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<Id<"properties"> | null>(null)
  const [tierLimitInfo, setTierLimitInfo] = useState<TierLimitInfo | null>(null)
  const [lockInfo, setLockInfo] = useState<SubscriptionLockInfo | null>(null)
  const editingProperty = data?.properties.find((property) => property._id === editingPropertyId)
  const editingPhotos = useQuery(api.propertyPhotos.listMine, editingPropertyId ? { propertyId: editingPropertyId } : "skip")

  if (!data) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat daftar properti…"
        submessage="Mengambil data bangunan, kamar, dan fasilitas"
      />
    )
  }

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm text-[var(--ink-muted)]">Pengelolaan properti</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Properti &amp; kamar</h1></div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="button-primary w-fit"><Plus size={16} />Tambah properti</button>
        </header>

        {showForm && <AddPropertyModal onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} onTierLimit={(info) => { setShowForm(false); setTierLimitInfo(info) }} />}

        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.properties.map((property) => {
            const occupied = property.rooms.filter((room) => room.status === "occupied").length
            const available = property.rooms.filter((room) => room.status === "available").length
            const isLockedByTier = property.lockedByTier === true
            const isInactive = !property.isActive

            // ── Property card locked by tier downgrade ──
            if (isLockedByTier) {
              return (
                <div key={property._id} className="relative">
                  <button
                    type="button"
                    id={`property-locked-${property._id}`}
                    onClick={() => setLockInfo({
                      propertyName: property.name,
                      requiredTier: "starter",
                    })}
                    className="group block w-full border border-red-200 bg-red-50/40 p-6 text-left transition-colors hover:border-red-300"
                    aria-label={`Properti ${property.name} dikunci - klik untuk upgrade`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center bg-red-100 text-red-400"><Lock size={19} /></span>
                      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-500">Dikunci</span>
                    </div>
                    <h2 className="mt-7 text-xl font-semibold text-[var(--ink)] opacity-60">{property.name}</h2>
                    <p className="mt-2 text-sm text-[var(--ink-muted)]">{property.address}</p>
                    <p className="mt-4 text-xs text-red-500">Properti ini dikunci karena melebihi batas tier Free. Klik untuk upgrade.</p>
                    <div className="mt-7 grid grid-cols-3 border-t border-red-100 pt-4 text-sm opacity-50">
                      <div><p className="font-mono text-lg text-[var(--ink)]">{property.rooms.length}</p><p className="text-xs text-[var(--ink-muted)]">Total kamar</p></div>
                      <div><p className="font-mono text-lg text-[var(--sage)]">{occupied}</p><p className="text-xs text-[var(--ink-muted)]">Terisi</p></div>
                      <div><p className="font-mono text-lg text-[var(--wood)]">{available}</p><p className="text-xs text-[var(--ink-muted)]">Kosong</p></div>
                    </div>
                  </button>
                  <button type="button" onClick={() => setEditingPropertyId(property._id)} className="absolute right-4 top-4 inline-flex items-center gap-1.5 border border-[var(--line)] bg-[#fffefa] px-2.5 py-1.5 text-xs font-semibold text-[var(--wood)] shadow-sm hover:border-[var(--wood)]" aria-label={`Edit ${property.name}`}><Pencil size={13} />Edit</button>
                </div>
              )
            }

            // ── Property card inactive (owner-disabled) ──
            if (isInactive) {
              return (
                <div key={property._id} className="relative">
                  <Link
                    href={`/dashboard/properties/${property._id}`}
                    className="group block border border-dashed border-[var(--line)] bg-[#fafafa] p-6 opacity-60 transition-opacity hover:opacity-80"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center bg-[#8B5E34]/10 text-[var(--ink-muted)]"><EyeOff size={19} /></span>
                      <span className="rounded border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">Nonaktif</span>
                    </div>
                    <h2 className="mt-7 text-xl font-semibold text-[var(--ink)]">{property.name}</h2>
                    <p className="mt-2 text-sm text-[var(--ink-muted)]">{property.address}</p>
                    <p className="mt-3 break-all text-xs text-[var(--ink-muted)]">/{property.slug}/daftar</p>
                    <div className="mt-7 grid grid-cols-3 border-t border-[var(--line)] pt-4 text-sm">
                      <div><p className="font-mono text-lg text-[var(--ink)]">{property.rooms.length}</p><p className="text-xs text-[var(--ink-muted)]">Total kamar</p></div>
                      <div><p className="font-mono text-lg text-[var(--sage)]">{occupied}</p><p className="text-xs text-[var(--ink-muted)]">Terisi</p></div>
                      <div><p className="font-mono text-lg text-[var(--wood)]">{available}</p><p className="text-xs text-[var(--ink-muted)]">Kosong</p></div>
                    </div>
                  </Link>
                  <button type="button" onClick={() => setEditingPropertyId(property._id)} className="absolute right-4 top-4 inline-flex items-center gap-1.5 border border-[var(--line)] bg-[#fffefa] px-2.5 py-1.5 text-xs font-semibold text-[var(--wood)] shadow-sm hover:border-[var(--wood)]" aria-label={`Edit ${property.name}`}><Pencil size={13} />Edit</button>
                </div>
              )
            }

            // ── Normal active property card ──
            return (
              <div key={property._id} className="relative">
                <Link href={`/dashboard/properties/${property._id}`} className="group block border border-[var(--line)] bg-[#fffefa] p-6 transition-transform hover:-translate-y-1">
                  <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center bg-[#8B5E34]/10 text-[var(--wood)]"><Building2 size={21} /></span><ArrowUpRight className="text-[var(--ink-muted)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" size={18} /></div>
                  <h2 className="mt-7 text-xl font-semibold text-[var(--ink)]">{property.name}</h2><p className="mt-2 text-sm text-[var(--ink-muted)]">{property.address}</p><p className="mt-3 break-all text-xs text-[var(--wood)]">/{property.slug}/daftar</p>
                  <div className="mt-7 grid grid-cols-3 border-t border-[var(--line)] pt-4 text-sm"><div><p className="font-mono text-lg text-[var(--ink)]">{property.rooms.length}</p><p className="text-xs text-[var(--ink-muted)]">Total kamar</p></div><div><p className="font-mono text-lg text-[var(--sage)]">{occupied}</p><p className="text-xs text-[var(--ink-muted)]">Terisi</p></div><div><p className="font-mono text-lg text-[var(--wood)]">{available}</p><p className="text-xs text-[var(--ink-muted)]">Kosong</p></div></div>
                </Link>
                <button type="button" onClick={() => setEditingPropertyId(property._id)} className="absolute right-4 top-4 inline-flex items-center gap-1.5 border border-[var(--line)] bg-[#fffefa] px-2.5 py-1.5 text-xs font-semibold text-[var(--wood)] shadow-sm hover:border-[var(--wood)]" aria-label={`Edit ${property.name}`}><Pencil size={13} />Edit</button>
              </div>
            )
          })}
        </div>

        {data.properties.length === 0 && <p className="mt-8 border border-dashed border-[var(--line)] p-8 text-sm text-[var(--ink-muted)]">Belum ada properti.</p>}
      </div>

      {editingProperty && editingPhotos && (
        <EditPropertyModal
          property={editingProperty}
          photos={editingPhotos}
          onClose={() => setEditingPropertyId(null)}
          onSuccess={() => setEditingPropertyId(null)}
        />
      )}
      {tierLimitInfo && <TierLimitModal info={tierLimitInfo} onDismiss={() => setTierLimitInfo(null)} />}
      {lockInfo && <SubscriptionLockModal info={lockInfo} onDismiss={() => setLockInfo(null)} />}
    </div>
  )
}
