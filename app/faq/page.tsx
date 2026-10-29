"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { FAQ_ITEMS, type FaqCategory } from "@/lib/faq"
import "@/app/landing.css"

const categories: Array<"Semua" | FaqCategory> = [
  "Semua",
  "Umum",
  "Pendaftaran & Booking",
  "Pembayaran & Keamanan",
  "Langganan & Harga",
  "Verifikasi",
  "Bot Telegram & WhatsApp",
]

export default function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState<"Semua" | FaqCategory>("Semua")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory
      const query = searchQuery.trim().toLowerCase()
      const matchSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)

      return matchCategory && matchSearch
    })
  }, [selectedCategory, searchQuery])

  return (
    <main className="lp-root min-h-svh px-5 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <div className="relative mx-auto max-w-4xl">
        {/* Subtle decorative background blobs */}
        <div className="lp-blob lp-blob-gold -top-32 -left-32 h-[28rem] w-[28rem] pointer-events-none" />
        <div className="lp-blob lp-blob-warm top-96 -right-32 h-[26rem] w-[26rem] pointer-events-none" />

        {/* ── Top Navigation ── */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--gold-dark)]"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
          <Link href="/" aria-label="BotKos">
            <BotKosLogo size={28} />
          </Link>
        </div>

        {/* ── Header ── */}
        <header className="relative z-10 mt-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold-dark)]">
            <HelpCircle size={13} />
            Tanya Jawab
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Pertanyaan yang Sering Diajukan
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-muted)] sm:text-base">
            Temukan jawaban lengkap seputar aplikasi manajemen kos BotKos: cara mengelola kamar dan penyewa, pengingat tagihan otomatis via WhatsApp &amp; Telegram, pendaftaran kamar online, dan paket langganan.
          </p>
        </header>

        {/* ── Search Bar & Category Filter ── */}
        <div className="relative z-10 mt-8 space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan (contoh: KTP, booking, DP, WhatsApp, harga)…"
              className="w-full rounded-xl border border-[var(--line)] bg-[#FFFFFF] py-3.5 pr-4 pl-11 text-sm text-[var(--ink)] shadow-xs transition placeholder:text-[var(--ink-muted)]/60 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-md bg-[var(--line)]/50 px-2 py-0.5 text-xs text-[var(--ink-muted)] hover:bg-[var(--line)]"
              >
                Hapus
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {categories.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--wood)] text-[#FFFFFF] shadow-xs"
                      : "border border-[var(--line)] bg-[#FFFFFF] text-[var(--ink-muted)] hover:border-[var(--gold)]/50 hover:text-[var(--ink)]"
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── FAQ List ── */}
        <div className="relative z-10 mt-8 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-10 text-center shadow-xs">
              <p className="text-base font-semibold text-[var(--ink)]">
                Tidak ada pertanyaan yang cocok
              </p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Coba gunakan kata kunci lain atau pilih kategori &ldquo;Semua&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("Semua")
                }}
                className="button-secondary mt-5 text-xs font-semibold"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-[var(--line)] bg-[#FFFFFF] p-5 shadow-xs transition hover:border-[var(--gold)]/60"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[var(--ink)] select-none">
                  <span className="text-sm sm:text-base leading-snug">
                    {item.question}
                  </span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="hidden sm:inline-block rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-[var(--gold-dark)]">
                      {item.category}
                    </span>
                    <ChevronDown className="size-4 text-[var(--gold-dark)] transition-transform duration-200 group-open:rotate-180" />
                  </div>
                </summary>
                <div className="mt-4 border-t border-[var(--line)]/60 pt-3.5 text-xs leading-6 text-[var(--ink-muted)] sm:text-sm sm:leading-7">
                  <p>{item.answer}</p>
                </div>
              </details>
            ))
          )}
        </div>

        {/* ── Help Desk CTA Banner ── */}
        <div className="relative z-10 mt-12 rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold-pale)]/50 to-[#FFFFFF] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--gold-dark)]">
                <Sparkles size={14} />
                Butuh Bantuan Khusus?
              </div>
              <h3 className="text-lg font-bold text-[var(--ink)] sm:text-xl">
                Belum menemukan jawaban yang Anda cari?
              </h3>
              <p className="text-xs text-[var(--ink-muted)] sm:text-sm">
                Ajukan tiket bantuan langsung ke tim admin BotKos. Kami siap membantu Anda.
              </p>
            </div>
            <Link
              href="/bantuan"
              className="button-primary inline-flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold"
            >
              <MessageCircle size={15} />
              Pusat Bantuan BotKos
            </Link>
          </div>
        </div>

        {/* ── Footer Navigation ── */}
        <div className="relative z-10 mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6 text-xs text-[var(--ink-muted)]">
          <p>© 2026 BotKos · botkos.online</p>
          <div className="flex items-center gap-4">
            <Link href="/kebijakan-privasi" className="hover:text-[var(--ink)] underline">
              Kebijakan Privasi
            </Link>
            <Link href="/syarat-ketentuan" className="hover:text-[var(--ink)] underline">
              Syarat Layanan
            </Link>
            <Link href="/harga" className="hover:text-[var(--ink)] underline">
              Harga
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
