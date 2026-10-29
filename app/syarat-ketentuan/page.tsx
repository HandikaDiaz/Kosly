import type { Metadata } from "next"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileCheck2,
  FileSpreadsheet,
  Gavel,
  Mail,
  Scale,
  Shield,
  ShieldAlert,
  UserX,
  Users,
} from "lucide-react"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import "@/app/landing.css"

export const metadata: Metadata = {
  title: "Syarat & Ketentuan - BotKos",
  description:
    "Syarat & Ketentuan resmi penggunaan platform operasional kos BotKos bagi pemilik kos dan calon penyewa.",
  alternates: { canonical: "/syarat-ketentuan" },
  openGraph: {
    title: "Syarat & Ketentuan - BotKos",
    description: "Syarat & Ketentuan penggunaan platform BotKos.",
    url: "/syarat-ketentuan",
    siteName: "BotKos",
    locale: "id_ID",
    type: "website",
  },
}

export default function TermsCanonicalPage() {
  return (
    <main className="lp-root min-h-svh px-5 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <div className="relative mx-auto max-w-4xl">
        {/* Subtle decorative background blobs */}
        <div className="lp-blob lp-blob-gold -top-32 -left-32 h-[26rem] w-[26rem] pointer-events-none" />
        <div className="lp-blob lp-blob-warm top-96 -right-32 h-[24rem] w-[24rem] pointer-events-none" />

        {/* ── Top Navigation ── */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--gold-dark)]"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
          <Link href="/" aria-label="BotKos">
            <BotKosLogo size={28} />
          </Link>
        </div>

        {/* ── Header ── */}
        <header className="relative z-10 mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold-dark)]">
            <Gavel size={13} />
            Ketentuan Layanan
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Syarat &amp; Ketentuan BotKos
          </h1>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)] sm:text-sm">
            <Calendar size={14} className="text-[var(--gold-dark)]" />
            Terakhir diperbarui: 29 Oktober 2026
          </p>
        </header>

        {/* ── Main Document Body ── */}
        <article className="relative z-10 mt-10 space-y-10 rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-10">
          {/* Section 1 */}
          <section id="definisi" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <FileCheck2 size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                1. Definisi
              </h2>
            </div>

            <ul className="mt-5 list-disc pl-5 space-y-2 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">&ldquo;Platform&rdquo;</strong> merujuk pada BotKos, termasuk situs web (botkos.online), bot Telegram, dan bot WhatsApp resmi.
              </li>
              <li>
                <strong className="text-[var(--ink)]">&ldquo;Pemilik&rdquo;/&ldquo;Owner&rdquo;</strong> adalah pengguna yang mendaftarkan dan mengelola properti kos di Platform.
              </li>
              <li>
                <strong className="text-[var(--ink)]">&ldquo;Penyewa&rdquo;/&ldquo;Tenant&rdquo;</strong> adalah calon penyewa atau penghuni kos yang mengisi formulir pendaftaran di Platform.
              </li>
              <li>
                <strong className="text-[var(--ink)]">&ldquo;Konten&rdquo;</strong> adalah data, teks, harga, informasi fasilitas, dan berkas gambar yang diunggah pengguna ke Platform.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="penerimaan-syarat" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <CheckCircle size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                2. Penerimaan Syarat
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Dengan mendaftar, mengakses, atau menggunakan Platform BotKos, Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat &amp; Ketentuan ini beserta{" "}
              <Link href="/kebijakan-privasi" className="font-semibold text-[var(--gold-dark)] underline underline-offset-2">
                Kebijakan Privasi
              </Link>{" "}
              kami.
            </p>
          </section>

          {/* Section 3 */}
          <section id="fungsi-botkos" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <Shield size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                3. Apa yang BotKos Lakukan - dan Tidak Lakukan
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              BotKos adalah <strong className="text-[var(--ink)]">alat bantu operasional</strong> untuk pemilik kos: mencatat kamar, mengingatkan pembayaran, dan memfasilitasi komunikasi antara pemilik dan penyewa lewat bot chat.
            </p>

            <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
              <p className="font-semibold text-[var(--ink)]">BotKos BUKAN:</p>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-[var(--ink-muted)]">
                <li>
                  <strong className="text-[var(--ink)]">Bukan Penyelenggara Jasa Pembayaran (PJP):</strong> Kami tidak menahan, memproses, mengendapkan, atau menjamin dana yang ditransfer antara penyewa dan pemilik kos. Seluruh pembayaran mengalir langsung antar rekening kedua belah pihak.
                </li>
                <li>
                  <strong className="text-[var(--ink)]">Bukan Pihak dalam Perjanjian Sewa-Menyewa:</strong> Hubungan sewa-menyewa adalah urusan kontraktual langsung antara pemilik dan penyewa.
                </li>
                <li>
                  <strong className="text-[var(--ink)]">Bukan Penjamin Kebenaran Informasi Pengguna:</strong> Termasuk badge &ldquo;Terverifikasi&rdquo;, yang didasarkan pada dokumen administratif yang diunggah pemilik, bukan pemeriksaan fisik independen di lapangan oleh BotKos dalam setiap kasus.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="tanggung-jawab-pemilik" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Users size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                4. Tanggung Jawab Pemilik (Owner)
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Sebagai Pemilik, Anda bertanggung jawab penuh untuk:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-2 text-sm leading-7 text-[var(--ink-muted)]">
              <li>Memastikan data properti, nomor kamar, harga, dan fasilitas yang Anda cantumkan adalah akurat dan terkini.</li>
              <li>Tidak mendaftarkan properti fiktif atau yang tidak sesuai dengan kondisi riil di lapangan.</li>
              <li>Memverifikasi secara mandiri mutasi rekening atau bukti transfer sebelum mengonfirmasi pembayaran (BotKos menyediakan sistem review, keputusan akhir ada di tangan Anda).</li>
              <li>Mematuhi seluruh peraturan hukum dan perizinan usaha yang berlaku di Indonesia dalam mengoperasikan kos Anda.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="tanggung-jawab-penyewa" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <FileSpreadsheet size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                5. Tanggung Jawab Penyewa (Tenant)
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Sebagai Penyewa yang mengisi formulir pendaftaran di Platform, Anda bertanggung jawab untuk memberikan data diri yang jujur, valid, serta bukti transfer pembayaran yang sah.
            </p>
            <div className="mt-4 rounded-lg border border-[var(--warn)]/30 bg-[#C1502E]/5 p-4 text-xs font-medium text-[var(--warn)] sm:text-sm">
              ⚠️ <strong>Perhatian:</strong> Mengunggah bukti pembayaran palsu, editan, atau hasil rekayasa merupakan pelanggaran berat terhadap Syarat ini dan dapat diproses secara hukum pidana.
            </div>
          </section>

          {/* Section 6 */}
          <section id="langganan-pembayaran" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Scale size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                6. Langganan &amp; Pembayaran Layanan
              </h2>
            </div>

            <ul className="mt-4 list-disc pl-5 space-y-2.5 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                BotKos menyediakan tingkatan langganan (tier) berdasarkan jumlah kamar kos yang dikelola, sebagaimana tercantum di{" "}
                <Link href="/harga" className="font-semibold text-[var(--gold-dark)] underline underline-offset-2">
                  halaman Harga
                </Link>.
              </li>
              <li>
                Langganan di luar tier gratis dibayar melalui transfer/QRIS manual dan ditinjau oleh admin kami sebelum status langganan diaktifkan.
              </li>
              <li>
                Kami akan memberi tahu Anda jika jumlah kamar kos Anda melebihi batas kuota tier aktif, namun <strong className="text-[var(--ink)]">kami tidak akan pernah menaikkan tier atau menagih Anda secara otomatis</strong> tanpa persetujuan Anda.
              </li>
              <li>
                Anda dapat berhenti berlangganan kapan saja. Akun Anda akan kembali ke tier gratis (sesuai batas kamar yang berlaku) setelah periode masa aktif langganan selesai.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="larangan-penggunaan" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <AlertTriangle size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                7. Larangan Penggunaan
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Pengguna dilarang keras memanfaatkan Platform BotKos untuk:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm leading-7 text-[var(--ink-muted)]">
              <li>Mendaftarkan properti atau data kamar yang fiktif, menipu, atau menyesatkan.</li>
              <li>Melakukan penipuan atau pemerasan terhadap pengguna lain.</li>
              <li>Mencoba menembus keamanan atau mengakses data milik pengguna lain tanpa hak.</li>
              <li>Menyalahgunakan, menyedot data massal (scraping), atau merekayasa balik (reverse engineering) kode sumber sistem Platform.</li>
              <li>Menggunakan Platform untuk setiap tujuan yang melanggar hukum dan norma kesusilaan yang berlaku.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="penangguhan-akun" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <UserX size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                8. Penangguhan &amp; Penghentian Akun
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Kami berhak menangguhkan sementara atau menghentikan akses akun Anda ke Platform jika ditemukan pelanggaran terhadap Syarat ini, termasuk namun tidak terbatas pada laporan terverifikasi mengenai kos fiktif atau penipuan pembayaran.
            </p>
          </section>

          {/* Section 9 */}
          <section id="hak-cipta" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <FileCheck2 size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                9. Hak Kekayaan Intelektual
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Konten yang Anda unggah (foto properti, nama kos, data kamar) tetap menjadi milik Anda sepenuhnya. Dengan mengunggahnya ke Platform, Anda memberikan izin non-eksklusif kepada BotKos untuk menampilkan Konten tersebut sejauh diperlukan untuk menjalankan fungsi Platform.
            </p>
          </section>

          {/* Section 10 */}
          <section id="batasan-tanggung-jawab" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                10. Batasan Tanggung Jawab
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Sejauh diizinkan oleh hukum yang berlaku, BotKos tidak bertanggung jawab atas segala kerugian materiil maupun immateriil yang timbul dari transaksi atau perjanjian sewa-menyewa antara Pemilik dan Penyewa, termasuk sengketa uang sewa, kerusakan fasilitas fisik kos, atau perselisihan lain di luar kendali teknis langsung Platform.
            </p>
          </section>

          {/* Section 11 */}
          <section id="hukum-yang-berlaku" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <Gavel size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                11. Hukum yang Berlaku
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Syarat &amp; Ketentuan ini diatur dan ditafsirkan semata-mata berdasarkan hukum dan peraturan perundang-undangan yang berlaku di Republik Indonesia.
            </p>
          </section>

          {/* Section 12 */}
          <section id="perubahan-syarat" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Scale size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                12. Perubahan Syarat &amp; Ketentuan
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Kami berhak memperbarui ketentuan ini sewaktu-waktu. Perubahan yang berdampak signifikan akan kami beritahukan melalui email terdaftar atau pengumuman resmi di dalam antarmuka aplikasi.
            </p>
          </section>

          {/* Section 13 */}
          <section id="kontak">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <Mail size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                13. Kontak &amp; Pertanyaan
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Jika Anda memiliki pertanyaan mengenai Syarat &amp; Ketentuan ini, silakan hubungi tim kami:
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--ink)]">Dukungan Pengguna BotKos</p>
                <p className="text-xs text-[var(--ink-muted)]">Konsultasikan kendala atau pertanyaan Anda bersama tim kami</p>
              </div>
              <Link
                href="/bantuan"
                className="button-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold"
              >
                Pusat Bantuan
              </Link>
            </div>
          </section>
        </article>

        {/* ── Footer Navigation ── */}
        <div className="relative z-10 mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6 text-xs text-[var(--ink-muted)]">
          <p>© 2026 BotKos · botkos.online</p>
          <div className="flex items-center gap-4">
            <Link href="/kebijakan-privasi" className="hover:text-[var(--ink)] underline">
              Kebijakan Privasi
            </Link>
            <Link href="/faq" className="hover:text-[var(--ink)] underline">
              FAQ
            </Link>
            <Link href="/bantuan" className="hover:text-[var(--ink)] underline">
              Pusat Bantuan
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
