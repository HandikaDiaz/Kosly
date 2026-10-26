import type { Metadata } from "next"
import Link from "next/link"
import { fetchQuery } from "convex/nextjs"
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Clock,
  HelpCircle,
  Home,
  MessageSquare,
  ShieldCheck,
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { ReviewForm } from "@/components/public-kos/review-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tulis Ulasan Penghuni | BotKos",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

type ReviewPageProps = { params: Promise<{ token: string }> }

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { token } = await params
  const context = await fetchQuery(api.reviews.getInvitationContext, { token })

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-85"
            aria-label="Beranda BotKos"
          >
            <BotKosLogo size={28} showText={true} />
          </Link>

          <Link
            href="/bantuan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition"
          >
            <HelpCircle size={15} />
            <span>Pusat Bantuan</span>
          </Link>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-xl">
          {context ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#FFFFFF] shadow-[0_18px_40px_-32px_rgba(43,30,15,0.45)]">
              {/* Header decorative accent */}
              <div className="h-1.5 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold)] to-[var(--wood)]" />

              <div className="p-6 sm:p-8">
                {/* ── Context Header ── */}
                <div className="border-b border-[var(--line)] pb-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-pale)] px-2.5 py-1 text-xs font-semibold text-[var(--gold-dark)]">
                      <MessageSquare size={13} />
                      Ulasan Terverifikasi
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      <ShieldCheck size={13} />
                      Anonim
                    </span>
                  </div>

                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                    Bagaimana Pengalamanmu di {context.propertyName}?
                  </h1>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                    <Building2 size={14} className="text-[var(--wood)]" />
                    <span>Masa tinggal: <strong className="font-semibold text-[var(--ink)]">{context.stayLabel}</strong></span>
                  </div>
                </div>

                {/* ── Interactive Review Form ── */}
                <div className="mt-7">
                  <ReviewForm
                    token={token}
                    propertyName={context.propertyName}
                    stayLabel={context.stayLabel}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── Expired / Invalid Token State ── */
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-8 text-center shadow-sm sm:p-10 animate-in fade-in duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--warn)]/10 text-[var(--warn)] border border-[var(--warn)]/20 shadow-sm">
                <Clock size={32} />
              </div>

              <span className="mt-5 inline-block rounded-full bg-[var(--warn)]/10 px-3 py-1 text-xs font-semibold text-[var(--warn)]">
                Tautan Tidak Berlaku
              </span>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)]">
                Tautan Ulasan Sudah Kedaluwarsa
              </h1>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
                Tautan undangan ulasan ini tidak valid, telah melewati batas waktu masa aktif, atau sudah pernah digunakan sebelumnya. Setiap tautan ulasan BotKos bersifat sekali pakai demi menjaga keaslian ulasan.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
                >
                  <Home size={16} /> Ke Beranda BotKos
                </Link>
                <Link
                  href="/bantuan"
                  className="button-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
                >
                  <HelpCircle size={16} /> Hubungi Bantuan
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Cohesive Footer ── */}
      <footer className="border-t border-[var(--line)] bg-[#FFFFFF] px-4 py-6 text-center text-xs text-[var(--ink-muted)]">
        <p>BotKos — Sistem Manajemen Kos & Komunitas Terpercaya</p>
      </footer>
    </div>
  )
}
