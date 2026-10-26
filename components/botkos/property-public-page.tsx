"use client"

import { Copy, Plus } from "lucide-react"
import { useParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { PublicPropertySection } from "./public-property-section"
import { EmptyState, SectionCard } from "./property-ui"
import { PageLoader } from "./page-loader"

const categories = ["shared", "services", "parking", "security", "sports", "other"] as const
const labels: Record<(typeof categories)[number], string> = { shared: "Fasilitas bersama", services: "Komplementer & servis", parking: "Area parkir", security: "Keamanan & akses", sports: "Olahraga & hiburan", other: "Lainnya" }

export function PropertyPublicPage() {
  const { propertyId } = useParams<{ propertyId: string }>(); const id = propertyId as Id<"properties">
  const property = useQuery(api.properties.getMine, { propertyId: id }); const photos = useQuery(api.propertyPhotos.listMine, { propertyId: id }); const facilities = useQuery(api.propertyFacilities.listForProperty, { propertyId: id }); const createFacility = useMutation(api.propertyFacilities.create)
  const [notice, setNotice] = useState<string | null>(null)
  if (property === undefined || photos === undefined || facilities === undefined) return <PageLoader variant="inline" message="Memuat halaman publik…" />
  if (!property) return <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-8 text-center"><h1 className="text-xl font-semibold">Properti tidak ditemukan</h1></div>
  const base = typeof window !== "undefined" ? window.location.origin : ""; const registrationUrl = `${base}/${property.slug}/daftar`
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); await createFacility({ propertyId: id, category: String(form.get("category") ?? "shared") as (typeof categories)[number], name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "").trim() || undefined }); event.currentTarget.reset(); setNotice("Fasilitas berhasil ditambahkan.") }
  return <div className="space-y-5"><PublicPropertySection propertyId={id} propertyName={property.name} photos={photos} /><SectionCard title="Fasilitas" description="Informasi fasilitas yang tampil di halaman publik."><form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-[1fr_1.5fr_2fr_auto]"><select name="category" className="field-input min-h-11">{categories.map((category) => <option key={category} value={category}>{labels[category]}</option>)}</select><input name="name" required className="field-input min-h-11" placeholder="Contoh: Wi-Fi cepat" /><input name="description" className="field-input min-h-11" placeholder="Keterangan (opsional)" /><button type="submit" className="button-secondary min-h-11"><Plus size={15} />Tambah</button></form>{notice ? <p className="mt-3 text-sm text-[var(--sage)]">{notice}</p> : null}<div className="mt-5 grid gap-3 sm:grid-cols-2">{facilities.length ? facilities.map((facility) => <div key={facility._id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm"><p className="font-semibold">{facility.name}</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{labels[facility.category as (typeof categories)[number]] ?? facility.category}</p></div>) : <EmptyState>Belum ada fasilitas.</EmptyState>}</div></SectionCard><SectionCard title="Link pendaftaran penyewa" description="Bagikan link ini kepada calon penyewa."><div className="flex flex-col gap-3 sm:flex-row"><div className="min-w-0 flex-1 truncate rounded-xl border border-[var(--line)] bg-white px-3 py-3 font-mono text-xs text-[var(--wood)]">{registrationUrl}</div><button type="button" onClick={() => void navigator.clipboard.writeText(registrationUrl)} className="button-secondary min-h-11"><Copy size={15} />Salin link</button></div></SectionCard></div>
}
