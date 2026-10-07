"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { RentPaymentForm } from "@/components/botkos/rent-payment-form"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function PublicRentPaymentPage() {
  const params = useParams<{ propertySlug: string }>()
  const property = useQuery(api.properties.getPublicBySlug, { slug: params.propertySlug })
  if (property === undefined) return <main className="flex min-h-svh items-center justify-center text-sm text-[var(--ink-muted)]">Memuat informasi properti…</main>
  if (!property) return <main className="flex min-h-svh items-center justify-center px-5 text-center"><div><h1 className="text-2xl font-semibold text-[var(--ink)]">Link tidak tersedia</h1><p className="mt-3 text-sm text-[var(--ink-muted)]">Properti ini tidak aktif atau link-nya sudah berubah.</p></div></main>
  return (
    <main className="min-h-svh px-5 py-7 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link href={`/${property.slug}/daftar`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]">
          <ArrowLeft size={15} />Kembali ke properti
        </Link>
        <div className="mt-8">
          <BotKosLogo size={36} showText={false} />
          <p className="mt-5 text-sm font-semibold text-[var(--gold-dark)]">Pembayaran penyewa</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">Bayar sewa di {property.name}.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">Cari data Anda dengan nomor WhatsApp, lalu kirim bukti pembayaran atau perpanjang sewa kontrak.</p>
        </div>
        <div className="mt-8">
          <RentPaymentForm propertyName={property.name} slug={property.slug} />
        </div>
        <p className="mt-6 text-center text-xs text-[var(--ink-muted)]">Bukti pembayaran hanya dapat dilihat oleh pemilik properti.</p>
      </div>
    </main>
  )
}
