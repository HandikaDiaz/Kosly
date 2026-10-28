import Link from "next/link"
import { ArrowLeft, Building2, Home, Search } from "lucide-react"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function KosNotFound() {
  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--ink)] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#FFFFFF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-85">
            <BotKosLogo size={28} showText={true} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-8 shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--warn)]/10 text-[var(--warn)] border border-[var(--warn)]/20 shadow-sm">
            <Building2 size={32} />
          </div>

          <span className="mt-5 inline-block rounded-full bg-[var(--warn)]/10 px-3 py-1 text-xs font-semibold text-[var(--warn)]">
            Halaman Tidak Ditemukan
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)]">
            Kos Tidak Tersedia
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            Kos yang Anda cari mungkin belum dipublikasikan, tautannya telah berganti nama, atau sedang dinonaktifkan sementara oleh pemilik kos.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="button-primary inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold"
            >
              <Home size={16} /> Ke Beranda BotKos
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] bg-[#FFFFFF] px-4 py-6 text-center text-xs text-[var(--ink-muted)]">
            <p>BotKos — Pencatatan kos dan penyewa yang rapi</p>
      </footer>
    </div>
  )
}
