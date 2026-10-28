"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  ChevronRight,
} from "lucide-react"
import { RentPaymentForm } from "@/components/botkos/rent-payment-form"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { PageLoader } from "@/components/botkos/page-loader"
import { IdentityVerificationNotice } from "@/components/botkos/identity-verification-notice"

export default function PublicRentPaymentPage() {
  const params = useParams<{ propertySlug: string }>()
  const property = useQuery(api.properties.getPublicBySlug, { slug: params.propertySlug })
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        // clipboard fallback
      }
    }
  }

  // ── Loading State ────────────────────────────────────────────────────────
  if (property === undefined) {
    return (
      <PageLoader
        message="Memuat informasi properti & tagihan…"
        submessage="Menyiapkan rincian pembayaran untuk Anda"
      />
    )
  }

  // ── Not Found / Inactive State ───────────────────────────────────────────
  if (!property) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--background)] px-5 py-12 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--warn)]/10 text-[var(--warn)]">
            <Building2 size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink)]">Properti Tidak Tersedia</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            Halaman pembayaran untuk kos ini sedang tidak aktif atau tautannya telah berubah.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/" className="button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold">
              <ArrowLeft size={16} /> Ke Beranda BotKos
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] pb-16">
      {/* ── Top Navbar ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-80"
            >
              <BotKosLogo size={28} showText={true} />
            </Link>
            <span className="text-[var(--line)] hidden sm:inline">/</span>
            <span className="hidden sm:inline-block max-w-[200px] truncate text-xs font-medium text-[var(--ink-muted)]">
              {property.name}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow-xs transition hover:bg-[var(--secondary)]"
              title="Bagikan tautan halaman ini"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} className="text-[var(--ink-muted)]" />
                  <span>Bagikan</span>
                </>
              )}
            </button>

            <Link
              href={`/${property.slug}/daftar`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--wood)]/30 bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-semibold text-[var(--wood)] shadow-xs transition hover:bg-[var(--wood)] hover:text-white"
            >
              <UserCheck size={14} />
              <span className="hidden sm:inline">Belum Punya Kamar?</span> Daftar Kos
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ── Property Header ───────────────────────────────────────────── */}
        <section className="space-y-4">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wood)]/10 px-3 py-1 text-xs font-semibold text-[var(--wood)]">
              <CreditCard size={13} />
              Pembayaran Penyewa
            </span>

            {property.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                <ShieldCheck size={13} />
                Properti Terverifikasi
              </span>
            ) : null}

            {property.ownerIdentityVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200/60">
                <CheckCircle2 size={13} />
                Identitas Pemilik Valid
              </span>
            ) : null}
          </div>

          {/* Title & Location Row */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink)]">
                Bayar Sewa di {property.name}.
              </h1>
              <p className="mt-2.5 flex items-start gap-1.5 text-sm text-[var(--ink-muted)]">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--wood)]" />
                <span>{property.address}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 2-Column Responsive Layout ──────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">

          {/* ── Left Column: Info & Context (~7 cols) ─────────────────────── */}
          <div className="space-y-8 lg:col-span-7">

            {/* 1. Cara Kerja Pembayaran */}
            <section className="space-y-4">
              <div className="border-b border-[var(--line)] pb-3">
                <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                  Cara Kirim Bukti Pembayaran
                </h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  Ikuti 3 langkah mudah berikut untuk melaporkan pembayaran sewa Anda.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-white border border-[var(--line)] p-4">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">01</span>
                  <p className="mt-1.5 font-semibold text-[var(--ink)] text-sm">Masukkan No. WA</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)] leading-5">Cari data Anda dengan nomor WhatsApp yang terdaftar.</p>
                </div>
                <div className="rounded-lg bg-white border border-[var(--line)] p-4">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">02</span>
                  <p className="mt-1.5 font-semibold text-[var(--ink)] text-sm">Konfirmasi Nominal</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)] leading-5">Periksa dan sesuaikan jumlah yang akan Anda bayarkan.</p>
                </div>
                <div className="rounded-lg bg-white border border-[var(--line)] p-4">
                  <span className="font-mono font-bold text-[var(--wood)] text-sm">03</span>
                  <p className="mt-1.5 font-semibold text-[var(--ink)] text-sm">Upload Resi</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)] leading-5">Lampirkan foto bukti transfer bank atau e-wallet Anda.</p>
                </div>
              </div>
            </section>

            {/* 2. Jaminan Keamanan */}
            <section className="rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                Informasi Transaksi
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--line)]/60 bg-[#FCFBF9] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                    <Lock size={18} />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Data Terlindungi</h3>
                  <p className="text-xs text-[var(--ink-muted)] leading-5">
                    Bukti pembayaran hanya dapat dilihat oleh pemilik properti, tidak dibagikan ke pihak lain.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)]/60 bg-[#FCFBF9] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Verifikasi Manual</h3>
                  <p className="text-xs text-[var(--ink-muted)] leading-5">
                    Pemilik meninjau dan mengkonfirmasi langsung setiap bukti transfer yang masuk.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)]/60 bg-[#FCFBF9] p-4 space-y-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Notifikasi Otomatis</h3>
                  <p className="text-xs text-[var(--ink-muted)] leading-5">
                    Status sewa diperbarui otomatis setelah pembayaran dikonfirmasi oleh pemilik.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Banner Belum Punya Kamar */}
            <Link
              href={`/${property.slug}/daftar`}
              className="group flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-5 shadow-xs transition hover:border-[var(--wood)] hover:shadow-sm"
            >
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--wood)]">
                  <UserCheck size={14} /> Belum Menjadi Tenant?
                </span>
                <p className="text-sm font-bold text-[var(--ink)] group-hover:text-[var(--wood)]">
                  Daftar & Booking Kamar Sekarang
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  Lihat kamar yang tersedia dan ajukan pendaftaran langsung dari sini.
                </p>
              </div>
              <ChevronRight
                size={18}
                className="text-[var(--line)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--wood)] shrink-0 ml-3"
              />
            </Link>
          </div>

          {/* ── Right Column: Sticky Payment Form (~5 cols) ────────────────── */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
            {/* Form Card */}
            <div className="rounded-2xl border border-[var(--line)] bg-[#FFFFFF] shadow-sm overflow-hidden">
              <div className="border-b border-[var(--line)] bg-[#FFFDF8] px-6 py-4">
                <p className="text-xs font-semibold text-[var(--gold-dark)]">Pembayaran Penyewa</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--ink)]">
                  {property.name}
                </h2>
              </div>
              <div className="p-6">
                {property.ownerIdentityVerified
                  ? <RentPaymentForm propertyName={property.name} slug={property.slug} />
                  : <IdentityVerificationNotice action="pembayaran" />
                }
              </div>
            </div>

            <p className="text-center text-xs text-[var(--ink-muted)]">
              Bukti pembayaran hanya dapat dilihat oleh pemilik properti {property.name}.
            </p>
          </div>
        </div>
      </main>

      {/* ── Mobile Sticky Bottom Bar ────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--line)] bg-[#FFFFFF]/95 px-4 py-3 backdrop-blur-md shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-[var(--ink-muted)] block">
            {property.name}
          </span>
          <span className="text-sm font-bold text-[var(--ink)]">
            Pembayaran Sewa
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const el = document.querySelector("form")
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          className="button-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold shrink-0"
        >
          <CreditCard size={14} /> Bayar Sekarang
        </button>
      </div>
    </div>
  )
}
