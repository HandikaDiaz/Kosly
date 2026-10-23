import type { Metadata } from "next"
import { cookies } from "next/headers"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { TenantIdentityDashboard } from "@/components/tenant/tenant-identity-dashboard"
import { TenantIdentityStart } from "@/components/tenant/tenant-identity-start"
import { TenantRaporSection } from "@/components/tenant/tenant-rapor-section"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Rapor Penghuni BotKos", robots: { index: false, follow: false }, referrer: "no-referrer" }

export default async function TenantPage() {
  const token = (await cookies()).get("tenant_session")?.value
  let identity: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantIdentity.getMyTenantIdentity>>> | null = null
  let candidates: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantIdentity.listMyTenancyCandidates>>> = []
  let records: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantRapor.listMyPaymentRecords>>> = []
  let consent: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantRapor.getMyConsentState>>> = { active: false, grantedAt: undefined, needsReconsent: false }
  let preview: Awaited<ReturnType<typeof fetchQuery<typeof api.tenantRapor.previewMyRapor>>> = { label: "Pratinjau (belum dibagikan)", available: false }
  let shares: Awaited<ReturnType<typeof fetchQuery<typeof api.raporShares.listMyRaporShares>>> = []
  const consentText = await fetchQuery(api.tenantRapor.getShareConsentText, {})
  if (token) {
    try { identity = await fetchQuery(api.tenantIdentity.getMyTenantIdentity, { sessionToken: token }); candidates = await fetchQuery(api.tenantIdentity.listMyTenancyCandidates, { sessionToken: token }); records = await fetchQuery(api.tenantRapor.listMyPaymentRecords, { sessionToken: token }); consent = await fetchQuery(api.tenantRapor.getMyConsentState, { sessionToken: token }); preview = await fetchQuery(api.tenantRapor.previewMyRapor, { sessionToken: token }); shares = await fetchQuery(api.raporShares.listMyRaporShares, { sessionToken: token }) } catch { identity = null }
  }
  return <main className="min-h-svh bg-[var(--secondary)] px-4 py-8 text-[var(--ink)] sm:px-6 sm:py-12"><div className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold tracking-wide text-[var(--wood)]">BotKos</p><h1 className="mt-2 text-2xl font-bold">Rapor Penghuni</h1><p className="mt-2 text-sm text-[var(--ink-muted)]">Hubungkan nomor WhatsApp atau Telegram untuk melihat masa tinggalmu.</p><div className="mt-7">{identity ? <><TenantIdentityDashboard identity={identity} candidates={candidates} /><TenantRaporSection records={records} consent={consent} preview={preview} consentText={consentText} shares={shares} /></> : <TenantIdentityStart />}</div></div></main>
}
