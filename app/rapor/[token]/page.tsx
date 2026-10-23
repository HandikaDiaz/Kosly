import type { Metadata } from "next"
import { cookies } from "next/headers"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { RevealButton } from "@/components/tenant/reveal-button"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" }

export default async function RaporPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const landing = await fetchQuery(api.raporShares.getShareLanding, { token })
  if (!landing.valid) return <main><p>Tautan ini tidak valid atau sudah tidak berlaku.</p></main>
  const viewToken = (await cookies()).get("rapor_view")?.value
  const result = viewToken ? await fetchQuery(api.raporShares.getRevealedRapor, { viewToken }) : null
  if (!result) return <main><h1>Rapor Penghuni</h1><p>Rapor ini hanya dapat dibuka satu kali.</p><RevealButton /></main>
  return <main><h1>Rapor Penghuni</h1><dl><dt>Kategori</dt><dd>{result.tierLabel}</dd><dt>Jumlah kos</dt><dd>{result.tenancyBucket}</dd><dt>Lama tinggal</dt><dd>{result.monthsBucket}</dd><dt>Bulan dibuat</dt><dd>{result.generatedMonth}</dd><dt>Nomor terverifikasi</dt><dd>{result.phoneSuffix}</dd></dl><p>Ringkasan ini bukan jaminan pembayaran di masa depan.</p></main>
}
