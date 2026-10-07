"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { api } from "@/convex/_generated/api"
import { RegistrationForm } from "@/components/botkos/registration-form"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function PublicRegistrationPage() {
  const params = useParams<{ propertySlug: string }>()
  const property = useQuery(api.properties.getPublicBySlug, { slug: params.propertySlug })
  if (property === undefined) return <main className="flex min-h-svh items-center justify-center text-sm text-[var(--ink-muted)]">Memuat informasi properti…</main>
  if (!property) return <main className="flex min-h-svh items-center justify-center px-5 text-center"><div><h1 className="text-2xl font-semibold text-[var(--ink)]">Link tidak tersedia</h1><p className="mt-3 text-sm text-[var(--ink-muted)]">Properti ini tidak aktif atau link-nya sudah berubah.</p></div></main>
  return (
    <main className="min-h-svh px-5 py-7 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]">
          <ArrowLeft size={15} />BotKos
        </Link>
        <div className="mt-8">
          <BotKosLogo size={36} showText={false} />
          <p className="mt-5 text-sm font-semibold text-[var(--gold-dark)]">Pendaftaran penyewa</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">Daftar di {property.name}.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">Isi data dan kirim bukti pembayaran. Pemilik akan memeriksa dan mengonfirmasi secara manual.</p>
        </div>
        <div className="mt-8 space-y-5">
          {property.photos.length ? <section className="border border-[var(--line)] bg-[#FFFFFF] p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[var(--ink)]">Foto properti</p>{property.isVerified ? <span className="text-xs font-semibold text-emerald-700">Terverifikasi</span> : null}</div><div className="mt-4 grid grid-cols-3 gap-2">{property.photos.map((photo) => photo.url ? <img key={photo._id} src={photo.url} alt={photo.caption ?? `Foto ${property.name}`} className="h-28 w-full object-cover" /> : null)}</div></section> : null}
          {property.facilities.length ? (
            <section className="border border-[var(--line)] bg-[#FFFFFF] p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--ink)]">Fasilitas properti</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {property.facilities.map((facility) => (
                  <div key={facility._id}>
                    <p className="text-sm text-[var(--ink)]">{facility.name}</p>
                    {facility.description ? <p className="text-xs text-[var(--ink-muted)]">{facility.description}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {property.rooms.length ? (
            <RegistrationForm propertyName={property.name} slug={property.slug} rooms={property.rooms} />
          ) : (
            <div className="border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-muted)]">Belum ada kamar yang tersedia.</div>
          )}
          <Link href={`/${property.slug}/bayar`} className="flex items-center justify-between border border-[var(--line)] bg-[#FFFFFF] p-5 text-sm hover:border-[var(--gold)] shadow-sm">
            <span>
              <span className="block font-semibold text-[var(--ink)]">Sudah menjadi tenant?</span>
              <span className="mt-1 block text-xs text-[var(--ink-muted)]">Bayar tagihan atau perpanjang sewa di sini.</span>
            </span>
            <ArrowLeft size={16} className="rotate-180 text-[var(--gold-dark)]" />
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-[var(--ink-muted)]">Data Anda hanya dibagikan kepada pemilik properti ini.</p>
      </div>
    </main>
  )
}
