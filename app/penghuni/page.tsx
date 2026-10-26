import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { fetchQuery } from "convex/nextjs"
import {
  ArrowLeft,
  Building2,
  FileCheck2,
  HelpCircle,
  Home,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { TenantIdentityStart } from "@/components/tenant/tenant-identity-start"
import { TenantTabContainer } from "@/components/tenant/tenant-tab-container"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Portal & Rapor Penghuni | BotKos",
  description: "Kelola riwayat pembayaran sewa, sertifikasi masa tinggal, dan bagikan Rapor Penghuni resmi.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function TenantPage() {
  const token = (await cookies()).get("tenant_session")?.value
  let identity: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantIdentity.getMyTenantIdentity>>> | null = null
  let candidates: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantIdentity.listMyTenancyCandidates>>> = []
  let records: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantRapor.listMyPaymentRecords>>> = []
  let consent: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantRapor.getMyConsentState>>> = {
    active: false,
    grantedAt: undefined,
    needsReconsent: false,
  }
  let preview: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantRapor.previewMyRapor>>> = {
    label: "Pratinjau (belum dibagikan)",
    available: false,
  }
  let shares: Awaited<ReturnType<typeof fetchQuery<typeof api.raporShares.listMyRaporShares>>> = []
  const consentText = await fetchQuery(api.tenantRapor.getShareConsentText, {})

  if (token) {
    try {
      identity = await fetchQuery(api.tenantIdentity.getMyTenantIdentity, { sessionToken: token })
      candidates = await fetchQuery(api.tenantIdentity.listMyTenancyCandidates, { sessionToken: token })
      records = await fetchQuery(api.tenantRapor.listMyPaymentRecords, { sessionToken: token })
      consent = await fetchQuery(api.tenantRapor.getMyConsentState, { sessionToken: token })
      preview = await fetchQuery(api.tenantRapor.previewMyRapor, { sessionToken: token })
      shares = await fetchQuery(api.raporShares.listMyRaporShares, { sessionToken: token })
    } catch {
      identity = null
    }
  }

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-85"
              aria-label="Beranda BotKos"
            >
              <BotKosLogo size={28} showText={true} />
            </Link>
            <span className="text-[var(--line)] hidden sm:inline">/</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-[var(--ink-muted)]">
              Portal Penghuni
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/bantuan"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition"
            >
              <HelpCircle size={15} />
              <span>Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero / Page Header ── */}
      <div className="border-b border-[var(--line)] bg-white/70 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold-pale)] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
            <FileCheck2 size={14} />
            <span>Rekam Jejak Sewa Terverifikasi</span>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Portal & Rapor Penghuni
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)] max-w-xl mx-auto">
            Akses rekam jejak pembayaran sewa, konfirmasi masa tinggal aktif Anda, dan terbitkan Rapor Penghuni resmi untuk calon pemilik kos berikutnya.
          </p>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {identity ? (
            /* ── Logged In: Modular Tab Dashboard ── */
            <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
              <TenantTabContainer
                identity={identity}
                candidates={candidates}
                records={records}
                consent={consent}
                preview={preview}
                consentText={consentText}
                shares={shares}
              />
            </div>
          ) : (
            /* ── Not Logged In: Verification Onboarding Card ── */
            <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[#FFFFFF] shadow-[0_18px_40px_-32px_rgba(43,30,15,0.45)]">
              <div className="h-2 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold)] to-[var(--wood)]" />

              <div className="p-7 sm:p-10">
                <div className="text-center max-w-lg mx-auto mb-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold-pale)] text-[var(--gold-dark)] mb-4">
                    <ShieldCheck size={28} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
                    Masuk ke Portal Penghuni
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                    Hubungkan nomor WhatsApp atau Telegram yang Anda gunakan saat menyewa kos untuk mengakses rekam jejak sewa Anda.
                  </p>
                </div>

                <TenantIdentityStart />
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
