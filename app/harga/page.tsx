import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TierComparisonTable } from "@/components/kosly/tier-comparison-table"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function PricingPage() {
  return (
    <main className="min-h-svh bg-[#211A16] px-5 py-7 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white"><ArrowLeft size={15} />Kembali ke BotKos</Link>
        <div className="mx-auto mt-14 max-w-3xl text-center">
          <BotKosLogo size={42} showText={false} className="mx-auto" />
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#D6B15E]">Harga yang transparan</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Pilih ruang tumbuh kos Anda.</h1>
          <p className="mt-5 text-sm leading-7 text-white/55 sm:text-base">Mulai gratis, lalu naikkan kemampuan saat jumlah kamar dan kebutuhan operasional Anda bertambah.</p>
        </div>
        <div className="mt-12"><TierComparisonTable variant="landing" /></div>
        <p className="mt-6 text-center text-xs text-white/40">Pembayaran tier berbayar dilakukan melalui transfer manual dan review admin.</p>
      </div>
    </main>
  )
}
