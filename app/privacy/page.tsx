import Link from "next/link"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-[var(--background)] px-5 py-8 text-[var(--ink)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" aria-label="Kembali ke halaman utama">
          <BotKosLogo size={30} />
        </Link>
        <article className="mt-12 border border-[var(--line)] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-[var(--gold-dark)]">BotKos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Kebijakan Privasi</h1>
          <p className="mt-4 leading-7 text-[var(--ink-muted)]">
            BotKos mengumpulkan data yang dibutuhkan untuk membantu pemilik mengelola properti,
            penyewa, dan pembayaran. Data digunakan untuk menyediakan layanan, menjaga keamanan akun,
            dan mengirim notifikasi yang relevan.
          </p>
          <h2 className="mt-8 text-lg font-semibold">Kontrol data</h2>
          <p className="mt-2 leading-7 text-[var(--ink-muted)]">
            Anda dapat meminta koreksi atau penghapusan data melalui pengelola akun BotKos. Kami tidak
            menjual data pribadi pengguna kepada pihak lain.
          </p>
        </article>
      </div>
    </main>
  )
}
