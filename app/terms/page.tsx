import Link from "next/link"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function TermsPage() {
  return (
    <main className="min-h-svh bg-[var(--background)] px-5 py-8 text-[var(--ink)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" aria-label="Kembali ke halaman utama">
          <BotKosLogo size={30} />
        </Link>
        <article className="mt-12 border border-[var(--line)] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-[var(--gold-dark)]">BotKos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Syarat Layanan</h1>
          <p className="mt-4 leading-7 text-[var(--ink-muted)]">
            Dengan menggunakan BotKos, Anda bertanggung jawab atas ketepatan informasi properti,
            penyewa, dan pembayaran yang Anda masukkan. BotKos membantu pencatatan dan notifikasi,
            tetapi tidak menggantikan keputusan atau kewajiban hukum pemilik properti.
          </p>
          <h2 className="mt-8 text-lg font-semibold">Penggunaan yang wajar</h2>
          <p className="mt-2 leading-7 text-[var(--ink-muted)]">
            Gunakan layanan hanya untuk properti yang Anda kelola dan jaga kerahasiaan akses akun.
            Hubungi tim BotKos jika menemukan masalah keamanan atau data yang tidak sesuai.
          </p>
        </article>
      </div>
    </main>
  )
}
