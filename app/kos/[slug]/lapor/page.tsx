import Link from "next/link"
import { ReportPropertyForm } from "@/components/public-kos/report-property-form"

export default async function ReportPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <main className="mx-auto min-h-svh max-w-xl px-5 py-10 text-[var(--ink)]"><Link href={`/kos/${slug}`} className="text-sm underline">Kembali ke halaman kos</Link><h1 className="mt-8 text-3xl font-bold">Laporkan kos</h1><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Laporan ditinjau tim BotKos. Kos tidak otomatis disembunyikan. Kami tidak dapat menghubungimu kembali karena tidak mengumpulkan kontak.</p><ReportPropertyForm slug={slug} /></main>
}
