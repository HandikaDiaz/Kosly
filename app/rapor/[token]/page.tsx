import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { fetchQuery } from "convex/nextjs"
import {
  AlertTriangle,
  Award,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Home,
  Info,
  Lock,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { RevealButton } from "@/components/tenant/reveal-button"
import { PrintButton } from "@/components/tenant/print-button"
import { isRaporEnabled, RAPOR_DISABLED_MESSAGE } from "@/lib/raporGate"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const metadata: Metadata = {
  title: "Rapor Penghuni Terverifikasi | BotKos",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function RaporPage({ params }: { params: Promise<{ token: string }> }) {
  if (!isRaporEnabled()) return <main className="min-h-svh px-6 py-20 text-center"><h1 className="text-2xl font-bold">{RAPOR_DISABLED_MESSAGE}</h1></main>
  const { token } = await params
  const landing = await fetchQuery(api.raporShares.getShareLanding, { token })

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-85"
            aria-label="Beranda BotKos"
          >
            <BotKosLogo size={28} showText={true} />
          </Link>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold-pale)] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
              <ShieldCheck size={14} />
              <span>Sertifikasi Resmi</span>
            </span>
            <Link
              href="/bantuan"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          {!landing.valid ? (
            /* ── Expired / Invalid Token State ── */
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-8 text-center shadow-sm sm:p-10 animate-in fade-in duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--warn)]/10 text-[var(--warn)] border border-[var(--warn)]/20 shadow-sm">
                <Clock size={32} />
              </div>

              <span className="mt-5 inline-block rounded-full bg-[var(--warn)]/10 px-3 py-1 text-xs font-semibold text-[var(--warn)]">
                Tautan Kedaluwarsa / Tidak Berlaku
              </span>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)]">
                Tautan Rapor Tidak Dapat Dibuka
              </h1>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
                Tautan ini tidak valid, sudah melewati batas masa aktif, telah dicabut oleh pemiliknya, atau telah dibuka sebelumnya. Rapor penghuni BotKos dilindungi oleh sistem keamanan tautan sekali buka (one-time link).
              </p>

              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 text-left text-xs leading-5 text-[var(--ink-muted)]">
                <p className="font-semibold text-[var(--ink)]">Membutuhkan rapor calon penghuni Anda?</p>
                <p className="mt-1">
                  Minta calon penghuni untuk menautkan nomor WhatsApp/Telegram mereka di portal penghuni BotKos dan membagikan tautan rapor yang baru kepada Anda.
                </p>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
                >
                  <Home size={16} /> Ke Beranda BotKos
                </Link>
                <Link
                  href="/penghuni"
                  className="button-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
                >
                  <ShieldCheck size={16} /> Portal Penghuni
                </Link>
              </div>
            </div>
          ) : (
            /* ── Valid Token Branch (Pre-reveal or Post-reveal) ── */
            await (async () => {
              const viewToken = (await cookies()).get("rapor_view")?.value
              const result = viewToken
                ? await fetchQuery(api.raporShares.getRevealedRapor, { viewToken })
                : null

              if (!result) {
                /* ── Pre-reveal State ── */
                return (
                  <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#FFFFFF] shadow-[0_18px_40px_-32px_rgba(43,30,15,0.45)]">
                    <div className="h-2 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold)] to-[var(--wood)]" />

                    <div className="p-7 sm:p-10">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--gold-dark)]">
                        <Lock size={15} />
                        <span>Dokumen Terproteksi & Bersifat Rahasia</span>
                      </div>

                      <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                        Rapor Riwayat Pembayaran Penghuni
                      </h1>

                      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                        Calon penghuni telah membagikan rekam jejak sewa dan riwayat ketepatan pembayaran mereka di ekosistem BotKos untuk Anda verifikasi.
                      </p>

                      <div className="mt-6 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 text-xs leading-5 text-[var(--ink-muted)]">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                          <span>Data bersumber langsung dari catatan riwayat sewa nyata di kos-kosan yang terdaftar pada sistem BotKos.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--gold-dark)]" />
                          <span>Demi menjaga privasi, dokumen ini hanya dapat dibuka sekali dan akan aktif selama 30 menit pada sesi ini.</span>
                        </div>
                      </div>

                      <div className="mt-8">
                        <RevealButton />
                      </div>

                      <p className="mt-4 text-center text-xs text-[var(--ink-faint)]">
                        Dengan membuka rapor ini, Anda setuju menggunakan informasi hanya untuk verifikasi sewa.
                      </p>
                    </div>
                  </div>
                )
              }

              /* ── Revealed Official Certificate Card ── */
              return (
                <div className="overflow-hidden rounded-3xl border-2 border-[var(--line)] bg-[#FFFFFF] shadow-[0_24px_50px_-25px_rgba(43,30,15,0.35)] print:shadow-none print:border">
                  {/* Decorative Certificate Header */}
                  <div className="h-3 bg-gradient-to-r from-[var(--wood)] via-[var(--gold)] to-[var(--gold-dark)]" />

                  <div className="p-7 sm:p-10">
                    {/* Top Certificate Badge Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gold-pale)] text-[var(--gold-dark)] border border-[var(--gold)]/30 shadow-sm">
                          <Award size={26} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">
                            Sertifikasi Resmi BotKos
                          </p>
                          <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                            Rapor Penghuni
                          </h1>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Terverifikasi Otomatis</span>
                      </div>
                    </div>

                    {/* Verified Identity Pill */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                        <Phone size={15} className="text-[var(--wood)]" />
                        <span>Nomor WhatsApp/Telegram:</span>
                        <strong className="font-semibold text-[var(--ink)]">•••• •••• {result.phoneSuffix}</strong>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--ink-muted)]">
                        Bulan Terbit: {result.generatedMonth}
                      </span>
                    </div>

                    {/* Prominent Score Card */}
                    <div className="mt-6 rounded-2xl border-2 border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold-pale)]/50 via-white to-amber-50/40 p-6 text-center shadow-sm">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
                        <Sparkles size={13} />
                        <span>Status Rekam Jejak Pembayaran</span>
                      </div>

                      <div className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
                        {result.tierLabel}
                      </div>

                      <p className="mt-2 text-xs text-[var(--ink-muted)]">
                        Dihitung secara independen oleh algoritma BotKos dari pembayaran sewa aktual.
                      </p>
                    </div>

                    {/* Metric Details Grid */}
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
                          <Building size={16} className="text-[var(--wood)]" />
                          <span>Jumlah Kos Ditempati</span>
                        </div>
                        <p className="mt-2 text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                          {result.tenancyBucket}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                          Total properti kos terdata
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
                          <Calendar size={16} className="text-[var(--wood)]" />
                          <span>Akumulasi Waktu Tinggal</span>
                        </div>
                        <p className="mt-2 text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                          {result.monthsBucket}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                          Durasi sewa tercatat
                        </p>
                      </div>
                    </div>

                    {/* Transparency & Disclaimer Box */}
                    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4 text-xs leading-5 text-[var(--ink-muted)]">
                      <Info size={16} className="mt-0.5 shrink-0 text-[var(--wood)]" />
                      <div>
                        <p className="font-semibold text-[var(--ink)]">Catatan Transparansi Sistem:</p>
                        <p className="mt-0.5">
                          Rapor ini disusun otomatis berdasarkan riwayat pembayaran sewa yang dikonfirmasi oleh pemilik kos terdahulu dan telah disetujui untuk dibagikan oleh penyewa. Ringkasan ini merupakan bukti rekam jejak objektif dan bukan jaminan pembayaran masa depan.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                      <PrintButton />
                      <Link
                        href="/"
                        className="button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold"
                      >
                        <Home size={15} /> Ke Beranda BotKos
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </main>

      {/* ── Cohesive Footer ── */}
      <footer className="border-t border-[var(--line)] bg-[#FFFFFF] px-4 py-6 text-center text-xs text-[var(--ink-muted)] print:hidden">
        <p>BotKos — Pencatatan kos dan penyewa yang rapi</p>
      </footer>
    </div>
  )
}
