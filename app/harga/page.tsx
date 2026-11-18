import type { Metadata } from "next"
import { PricingBackLink, PricingPageContent } from "@/components/botkos/pricing-page-content"
import "@/app/landing.css"

export const metadata: Metadata = {
  title: "Harga & Paket Langganan Aplikasi Manajemen Kos",
  description:
    "Mulai gratis selamanya untuk 1-5 kamar. Bandingkan paket langganan BotKos untuk kelola kamar kos, penagihan sewa otomatis WhatsApp, dan pembukuan kos.",
  keywords: [
    "harga aplikasi kos",
    "biaya aplikasi manajemen kos",
    "aplikasi kos gratis",
    "software kos murah",
    "harga botkos",
  ],
  alternates: { canonical: "/harga" },
  openGraph: {
    title: "Harga & Paket Langganan Aplikasi Manajemen Kos | BotKos",
    description:
      "Mulai gratis selamanya untuk 1-5 kamar. Pilihan paket transparan untuk kebutuhan operasional kos Anda.",
    url: "/harga",
  },
}

export default function PricingPage() {
  return (
    <main className="lp-root min-h-svh px-5 py-7 sm:px-8 sm:py-12">
      <div className="relative mx-auto max-w-7xl">
        <div className="lp-blob lp-blob-gold -top-48 -left-48 h-[32rem] w-[32rem]" />
        <div className="lp-blob lp-blob-warm top-72 -right-32 h-[26rem] w-[26rem]" />
        <PricingBackLink />
        <PricingPageContent />
      </div>
    </main>
  )
}
