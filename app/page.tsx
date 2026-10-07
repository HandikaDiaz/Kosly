import Link from "next/link"
import { ArrowUpRight, ReceiptText } from "lucide-react"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function Page() {
  return (
    <main className="min-h-svh px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <Link href="/">
            <BotKosLogo size={32} textClassName="text-xl font-extrabold text-[var(--ink)] tracking-tight" />
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold text-[var(--gold-dark)] transition-colors hover:text-[var(--ink)]">
            Buka dashboard <ArrowUpRight className="ml-1 inline" size={15} />
          </Link>
        </header>

        <section className="grid gap-12 py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-6 text-sm font-bold text-[var(--gold-dark)] tracking-wide uppercase">
              Buku besar untuk kos yang lebih tenang
            </p>
            <h1 className="max-w-xl text-5xl leading-[1.02] tracking-[-0.055em] text-[var(--ink)] sm:text-7xl">
              Tahu kamar mana yang sudah menghasilkan.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[var(--ink-muted)]">
              BotKos merapikan kamar, jatuh tempo, dan bukti transfer dalam satu tempat yang otomatis &amp; mudah dipahami.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="button-primary">
                Lihat dashboard <ArrowUpRight size={16} />
              </Link>
              <span className="text-sm text-[var(--ink-muted)]">Tanpa aplikasi rumit untuk penyewa</span>
            </div>
          </div>

          <div className="ledger-paper relative overflow-hidden p-6 sm:p-8 rounded-lg">
            <div className="absolute right-[-18px] top-[-28px] rotate-12 text-[var(--gold)] opacity-10">
              <ReceiptText size={170} strokeWidth={1} />
            </div>
            <div className="relative">
              <div className="flex items-start justify-between border-b border-[var(--line)] pb-5">
                <div>
                  <p className="text-xs text-[var(--ink-muted)]">Kas bulan ini</p>
                  <p className="mt-2 font-mono text-3xl tracking-[-0.06em] text-[var(--ink)]">Rp 18.450.000</p>
                </div>
                <span className="status-pill status-paid">+12,4%</span>
              </div>
              <div className="mt-5 space-y-0 text-sm">
                {[["Kamar 01", "Lunas", "Rp 1.850.000"], ["Kamar 05", "Menunggu review", "Rp 1.650.000"], ["Kamar 08", "Belum bayar", "Rp 1.500.000"]].map(([room, status, amount]) => (
                  <div key={room} className="ledger-row">
                    <span className="font-medium text-[var(--ink)]">{room}</span>
                    <span className={status === "Lunas" ? "text-[var(--sage)]" : status === "Belum bayar" ? "text-[var(--warn)]" : "text-[var(--gold-dark)]"}>{status}</span>
                    <span className="font-mono text-right text-[var(--ink)]">{amount}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs leading-5 text-[var(--ink-muted)]">Semua keputusan pembayaran tetap di tangan pemilik.</p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 text-xs text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>BotKos (botkos.id) | Operasional kos otomatis tanpa istilah rumit.</span>
          <span className="font-mono">v0.1 / stage 1</span>
        </footer>
      </div>
    </main>
  )
}
