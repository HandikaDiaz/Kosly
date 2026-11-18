"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { TierComparisonTable } from "@/components/kosly/tier-comparison-table"

export function PricingPageContent() {
  const settings = useQuery(api.appSettings.getPublicSettings)
  const pricingEnabled = settings?.pricingEnabled ?? false

  if (settings === undefined) {
    return (
      <div className="relative z-10 mx-auto mt-20 max-w-2xl text-center text-sm text-[var(--ink-muted)]">
        Memuat…
      </div>
    )
  }

  if (!pricingEnabled) {
    return (
      <div className="relative z-10 mx-auto mt-16 max-w-2xl rounded-3xl border border-[var(--line)] bg-[#fffefa] p-8 text-center shadow-sm sm:p-12">
        <BotKosLogo size={42} showText={false} className="mx-auto" />
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-[var(--gold-dark)] uppercase">
          Akses Uji Coba Gratis
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
          Gunakan BotKos gratis tanpa batas kamar
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)] sm:text-base">
          Selama masa uji coba, seluruh fitur pengelolaan kamar, pantau jatuh tempo sewa, dan rekap kas bulanan terbuka gratis untuk pemilik kos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="button-primary">
            Mulai Sekarang
          </Link>
          <Link href="/" className="button-secondary">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative z-10 mx-auto mt-14 max-w-3xl text-center">
        <BotKosLogo size={42} showText={false} className="mx-auto" />
        <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-[var(--gold-dark)] uppercase">
          Harga yang transparan
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-6xl">
          Pilih ruang tumbuh kos Anda.
        </h1>
        <p className="mt-5 text-sm leading-7 text-[var(--ink-muted)] sm:text-base">
          Mulai gratis, lalu naikkan kemampuan saat jumlah kamar dan kebutuhan
          operasional Anda bertambah.
        </p>
      </div>
      <div className="relative z-10 mt-12">
        <TierComparisonTable variant="landing" />
      </div>
      <p className="relative z-10 mt-6 text-center text-xs text-[var(--ink-muted)]">
        Pembayaran tier berbayar dilakukan melalui transfer manual dan review
        admin.
      </p>
    </>
  )
}

export function PricingBackLink() {
  return (
    <Link
      href="/"
      className="relative z-10 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--gold-dark)]"
    >
      <ArrowLeft size={15} />
      Kembali ke BotKos
    </Link>
  )
}
