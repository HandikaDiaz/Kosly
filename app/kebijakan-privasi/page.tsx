import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Database,
  FileText,
  Lock,
  Mail,
  Scale,
  Share2,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import "@/app/landing.css"

export const metadata: Metadata = {
  title: "Kebijakan Privasi - BotKos",
  description:
    "Kebijakan Privasi resmi BotKos. Pelajari bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pemilik kos dan penyewa sesuai regulasi UU PDP dan standar Google.",
  alternates: { canonical: "/kebijakan-privasi" },
  openGraph: {
    title: "Kebijakan Privasi - BotKos",
    description:
      "Kebijakan Privasi resmi BotKos mengenai perlindungan data pribadi pengguna, integrasi Google OAuth, dan bot WhatsApp/Telegram.",
    url: "/kebijakan-privasi",
    siteName: "BotKos",
    locale: "id_ID",
    type: "website",
  },
}

export default function PrivacyCanonicalPage() {
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
            <Scale size={13} />
            Kebijakan Resmi
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Kebijakan Privasi BotKos
          </h1>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)] sm:text-sm">
            <Calendar size={14} className="text-[var(--gold-dark)]" />
            Terakhir diperbarui: 29 Oktober 2026
          </p>
        </header>

        {/* ── Compliance Overview Callout ── */}
        <div className="relative z-10 mt-8 flex gap-4 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-5 shadow-xs">
          <ShieldCheck className="size-5 shrink-0 text-[var(--gold-dark)] mt-0.5" />
          <div className="text-xs leading-6 text-[var(--ink)] sm:text-sm">
            <strong className="font-semibold text-[var(--gold-dark)]">Komitmen Privasi: </strong>
            BotKos berkomitmen menjunjung tinggi hak privasi Anda dan mematuhi ketentuan Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) serta kebijakan pihak ketiga terkait (termasuk Kebijakan Data Pengguna Layanan Google API). Dokumen ini memaparkan secara transparan bagaimana data dikumpulkan, diproses, dan diamankan.
          </div>
        </div>

        {/* ── Main Document Body ── */}
        <article className="relative z-10 mt-10 space-y-10 rounded-2xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm sm:p-10">
          {/* Section 1 */}
          <section id="data-yang-dikumpulkan" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <Database size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                1. Data yang Kami Kumpulkan
              </h2>
            </div>

            <div className="mt-6 space-y-6 text-sm leading-7 text-[var(--ink)]">
              {/* Google OAuth Specifics */}
              <div className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Data Akun Google (Google OAuth):
                </h3>
                <p className="mt-2 text-xs text-[var(--ink-muted)] sm:text-sm leading-relaxed">
                  Ketika Anda mendaftar atau masuk ke akun BotKos melalui Google Single Sign-On (Google OAuth), kami meminta izin akses terbatas atas data profil dasar Anda:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-[var(--ink-muted)] sm:text-sm">
                  <li>Nama lengkap pengguna.</li>
                  <li>Alamat email pengguna (digunakan sebagai identitas akun utama).</li>
                  <li>Foto profil akun Google (avatar untuk kemudahan identifikasi di dashboard).</li>
                </ul>
                <p className="mt-2 text-xs text-[var(--ink-muted)] sm:text-sm">
                  BotKos <strong>TIDAK</strong> mengakses kata sandi akun Google Anda, Google Drive, Kontak, Gmail, atau data sensitif Google lainnya di luar profil dasar yang diotorisasi.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Dari Pemilik Kos (Owner):
                </h3>
                <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>Nama dan alamat email (melalui login Google).</li>
                  <li>Nomor chat Telegram dan/atau nomor WhatsApp yang dihubungkan untuk menerima notifikasi bot.</li>
                  <li>Data properti kos: nama kos, alamat fisik, titik peta lokasi, dan foto properti kos.</li>
                  <li>Data kamar: nomor kamar, harga sewa, fasilitas, dan status ketersediaan.</li>
                  <li>
                    <strong className="text-[var(--ink)]">(Opsional)</strong> Foto identitas (KTP/Selfie) serta bukti kepemilikan kos — hanya jika pemilik secara sukarela mengajukan verifikasi lencana properti.
                  </li>
                  <li>Data langganan: paket tier langganan yang dipilih serta riwayat transaksi langganan.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Dari Calon Penyewa &amp; Penghuni Kos (Tenant):
                </h3>
                <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>Nama lengkap dan nomor WhatsApp aktif.</li>
                  <li>Data sewa: kamar yang diajukan, durasi sewa, tanggal mulai sewa, dan jenis pembayaran (DP atau lunas).</li>
                  <li>Bukti transfer pembayaran (struk atau tangkapan layar transfer bank) yang diunggah secara sukarela.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Data yang Terkumpul Otomatis:
                </h3>
                <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>Riwayat transaksi dan status siklus pembayaran sewa kamar.</li>
                  <li>Log teknis dan keamanan (alamat IP, stempel waktu akses, jenis peramban) guna mencegah penyalahgunaan sistem.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="tujuan-pemrosesan" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Scale size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                2. Dasar &amp; Tujuan Pemrosesan Data
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Kami memproses data pribadi Anda berdasarkan:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">Persetujuan eksplisit</strong> yang Anda berikan saat mendaftar, mengunggah bukti sewa, atau menghubungkan bot.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Pelaksanaan kontrak/layanan</strong> yang Anda minta — seperti mencatat kamar kos, mengirim pengingat tagihan sewa otomatis, dan menampilkan ketersediaan kamar.
              </li>
            </ul>

            <p className="mt-4 text-sm font-semibold text-[var(--ink)]">
              Data Anda digunakan semata-mata untuk:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[var(--ink-muted)]">
              <li>Menjalankan fitur operasional BotKos (pencatatan kamar, konfirmasi pembayaran, dan notifikasi chatbot WhatsApp &amp; Telegram).</li>
              <li>Memverifikasi keabsahan properti dan identitas pemilik yang mengajukan badge terverifikasi.</li>
              <li>Menghubungi Anda terkait status akun, tagihan, atau pembaruan penting operasional.</li>
              <li>Menjaga keamanan akun dan mencegah tindakan penipuan transaksi sewa.</li>
            </ul>

            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs font-semibold text-emerald-900 sm:text-sm">
              🛡️ <strong>Kepatuhan Kebijakan Data Pengguna Google:</strong> Penggunaan dan transfer informasi yang diterima dari Google API oleh BotKos ke aplikasi lain akan mematuhi <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="underline">Kebijakan Data Pengguna Layanan Google API</a>, termasuk persyaratan Penggunaan Terbatas (Limited Use). Kami <strong>TIDAK PERNAH</strong> menjual data pengguna ke pihak ketiga dan <strong>TIDAK</strong> menggunakannya untuk periklanan pihak ketiga.
            </div>
          </section>

          {/* Section 3 */}
          <section id="pembagian-data" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <Share2 size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                3. Pembagian Data kepada Pihak Ketiga
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Kami hanya membagikan data Anda kepada pihak-pihak berikut sesuai kebutuhan teknis yang ketat:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-3 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">Pemilik Kos (Owner) &amp; Penyewa Terkait:</strong> Pemilik hanya dapat melihat data pendaftar pada propertinya sendiri. Penyewa hanya dapat melihat informasi properti dan kamar yang bersangkutan.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Penyedia Infrastruktur Komputasi &amp; Database:</strong> Kami menggunakan Convex Inc. sebagai backend database dan penyimpanan berkas terenkripsi, serta Vercel Inc. untuk hosting aplikasi web.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Penyedia Autentikasi:</strong> Google Identity Services (Google OAuth) untuk mengautentikasi login pemilik kos secara aman.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Penyedia Layanan Pesan:</strong> Telegram Bot API dan Meta WhatsApp Cloud API resmi untuk mengirimkan pengingat tagihan dan ringkasan transaksi.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Kewajiban Penegakan Hukum:</strong> Kami hanya membuka informasi jika diwajibkan secara sah oleh putusan hukum atau peraturan perundang-undangan Republik Indonesia.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="keamanan-data" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Lock size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                4. Keamanan dan Enkripsi Data
              </h2>
            </div>

            <ul className="mt-4 list-disc pl-5 space-y-2.5 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                Seluruh lalu lintas data antara peramban Anda dan peladen kami dienkripsi menggunakan protokol <strong className="text-[var(--ink)]">HTTPS / TLS 1.3</strong> standar modern.
              </li>
              <li>
                Data sensitif dan berkas dokumen tersimpan pada media penyimpanan cloud yang terenkripsi saat diam (<strong className="text-[var(--ink)]">encryption-at-rest dengan AES-256</strong>).
              </li>
              <li>
                Dokumen sensitif (seperti bukti KTP verifikasi) hanya dapat diakses melalui URL bertanda tangan (signed URL) berumur singkat dengan verifikasi otorisasi peran admin.
              </li>
              <li>
                Kata sandi tidak pernah disimpan dalam bentuk teks biasa, dan sesi login dikelola secara aman menggunakan token berbasis hash kriptografi.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="retensi-data" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                5. Masa Retensi dan Penghapusan Data
              </h2>
            </div>

            <ul className="mt-4 list-disc pl-5 space-y-2.5 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">Data Akun &amp; Operasional:</strong> Disimpan selama akun Anda berstatus aktif untuk memungkinkan Anda mengelola kamar dan riwayat pembukuan kos.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Dokumen Verifikasi (KTP / Selfie):</strong> Dihapus permanen dari penyimpanan berkas paling lambat 90 hari setelah keputusan verifikasi diputuskan.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Permohonan Penghapusan Akun:</strong> Jika Anda menutup akun, seluruh data pribadi dan rekam jejak yang terikat pada akun Anda akan dihapus atau dianonimkan secara permanen sesuai ketentuan UU PDP.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="hak-anda" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <UserCheck size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                6. Hak Subjek Data
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Sesuai dengan Undang-Undang Pelindungan Data Pribadi (UU PDP), Anda berhak untuk:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[var(--ink-muted)]">
              <li>Mendapatkan kejelasan identitas dan akuntabilitas pihak yang memproses data Anda.</li>
              <li>Mengakses dan memperoleh salinan data pribadi yang Anda simpan di BotKos.</li>
              <li>Memperbarui atau membetulkan data yang tidak akurat melalui dashboard pengaturan.</li>
              <li>Menarik kembali persetujuan pemrosesan data pribadi Anda.</li>
              <li>Meminta penundaan, pembatasan, atau penghapusan data pribadi Anda.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="perubahan-kebijakan" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <FileText size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                7. Pembaruan Kebijakan Privasi
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Kami dapat merevisi Kebijakan Privasi ini dari waktu ke waktu untuk mencerminkan pembaruan fitur atau penyesuaian regulasi yang berlaku. Versi terbaru akan selalu dipublikasikan pada halaman ini dengan tanggal pembaruan yang diperbarui. Penggunaan berkelanjutan atas layanan BotKos setelah tanggal berlaku perubahan merupakan bentuk penerimaan Anda atas ketentuan yang diperbarui.
            </p>
          </section>

          {/* Section 8 */}
          <section id="kontak">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Mail size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                8. Hubungi Kami
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, ingin mengajukan permohonan data, atau meminta penghapusan akun, silakan hubungi tim kami melalui:
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--ink)]">Tim Privasi &amp; Dukungan BotKos</p>
                <p className="text-xs text-[var(--ink-muted)]">Email resmi: support@botkos.online · admin@botkos.online</p>
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
            <Link href="/syarat-ketentuan" className="hover:text-[var(--ink)] underline">
              Syarat &amp; Ketentuan
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
