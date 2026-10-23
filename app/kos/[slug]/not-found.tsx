import Link from "next/link"
import { Building2 } from "lucide-react"

export default function PublicKosNotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12 text-center">
      <section className="max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <Building2 className="mx-auto text-[var(--wood)]" size={34} />
        <h1 className="mt-4 text-2xl font-bold text-[var(--ink)]">
          Kos tidak tersedia
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Halaman ini belum dipublikasikan, sudah tidak aktif, atau tautannya
          tidak ditemukan.
        </p>
        <Link href="/" className="button-primary mt-6 justify-center">
          Kembali ke BotKos
        </Link>
      </section>
    </main>
  )
}
