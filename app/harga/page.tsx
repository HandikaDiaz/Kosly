import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TierComparisonTable } from "@/components/kosly/tier-comparison-table"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import "@/app/landing.css"

export default function PricingPage() {
  return (
    <main className="lp-root min-h-svh px-5 py-7 sm:px-8 sm:py-12">
      <div className="relative mx-auto max-w-7xl">
        <div className="lp-blob lp-blob-gold -top-48 -left-48 h-[32rem] w-[32rem]" />
        <div className="lp-blob lp-blob-warm top-72 -right-32 h-[26rem] w-[26rem]" />
        <Link
          href="/"
          className="relative z-10 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--gold-dark)]"
        >
          <ArrowLeft size={15} />
          Kembali ke BotKos
        </Link>
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
      </div>
    </main>
  )
}
