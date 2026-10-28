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
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import "@/app/landing.css"

export const metadata = {
  title: "Kebijakan Privasi - BotKos",
  description:
    "Pelajari bagaimana BotKos mengumpulkan dan menggunakan data pemilik kos dan penyewa berdasarkan perilaku sistem saat ini.",
}

export default function PrivacyPage() {
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
            Terakhir diperbarui: 20 Oktober 2026
          </p>
        </header>

        {/* ── Draf Awal / Legal Notice Callout ── */}
        <div className="relative z-10 mt-8 flex gap-4 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-5 shadow-xs">
          <ShieldAlert className="size-5 shrink-0 text-[var(--gold-dark)] mt-0.5" />
          <div className="text-xs leading-6 text-[var(--ink)] sm:text-sm">
            <strong className="font-semibold text-[var(--gold-dark)]">Catatan Legal: </strong>
            Ini adalah draf awal yang disusun berdasarkan fitur dan alur data yang ada di BotKos. Dokumen ini BELUM ditinjau oleh profesional hukum - mohon direview sebelum dipublikasikan secara resmi, mengingat ada kewajiban spesifik di UU Pelindungan Data Pribadi (UU PDP) yang sanksinya bisa administratif maupun pidana.
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
              <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Dari Pemilik Kos (Owner):
                </h3>
                <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>Nama dan alamat email (melalui autentikasi Google OAuth).</li>
                  <li>Nomor chat Telegram dan/atau nomor WhatsApp yang dihubungkan untuk notifikasi bot.</li>
                  <li>Data properti: nama kos, alamat, serta foto kos (minimal 3 foto).</li>
                  <li>Data kamar: nomor kamar, harga sewa, status ketersediaan, dan fasilitas.</li>
                  <li>
                    <strong className="text-[var(--ink)]">(Opsional)</strong> Foto KTP dan foto selfie, serta bukti kepemilikan/sewa properti - hanya jika Anda secara sukarela mengajukan verifikasi akun.
                  </li>
                  <li>Data langganan: tier langganan yang dipilih dan riwayat transaksi langganan.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Dari Calon Penyewa (Tenant):
                </h3>
                <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>Nama lengkap dan nomor WhatsApp aktif.</li>
                  <li>Data sewa: kamar yang diminati, durasi sewa, serta jenis pembayaran (DP atau lunas).</li>
                  <li>Bukti pembayaran (gambar struk transfer atau tangkapan layar transaksi).</li>
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-5">
                <h3 className="font-semibold text-[var(--ink)]">
                  Dikumpulkan Secara Otomatis:
                </h3>
                <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--ink-muted)]">
                  <li>Riwayat transaksi dan status siklus pembayaran sewa.</li>
                  <li>Log akses dokumen sensitif (KTP, selfie), bila tersedia di alur sistem, untuk mencatat akses dan waktu pengaksesan.</li>
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
              Kami memproses data Anda berdasarkan:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">Persetujuan eksplisit</strong>, khususnya untuk data pribadi yang bersifat spesifik seperti foto KTP dan selfie.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Pelaksanaan layanan</strong> yang Anda minta - misalnya mencatat transaksi sewa, mengirim pengingat tagihan, atau menampilkan ketersediaan kamar.
              </li>
            </ul>

            <p className="mt-4 text-sm font-semibold text-[var(--ink)]">
              Data ini kami gunakan secara ketat untuk:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[var(--ink-muted)]">
              <li>Menjalankan fungsi inti BotKos (manajemen kamar, pengingat pembayaran, dan notifikasi bot).</li>
              <li>Memverifikasi identitas pemilik dan keberadaan fisik properti (jika Anda mengajukan lencana verifikasi).</li>
              <li>Memproses dan meninjau pembayaran paket langganan.</li>
              <li>Menjaga keamanan ekosistem platform (mendeteksi penyalahgunaan, fraud, dan menindaklanjuti laporan).</li>
            </ul>

            <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-xs font-semibold text-[var(--ink)] sm:text-sm">
              🛡️ Kami <strong className="text-[var(--warn)]">TIDAK</strong> pernah menjual data Anda ke pihak ketiga, dan <strong className="text-[var(--warn)]">TIDAK</strong> menggunakan data Anda untuk keperluan periklanan pihak ketiga.
            </div>
          </section>

          {/* Section 3 */}
          <section id="pembagian-data" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <Share2 size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                3. Dengan Siapa Data Dibagikan
              </h2>
            </div>

            <ul className="mt-4 list-disc pl-5 space-y-3 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">Admin BotKos:</strong> Berwenang meninjau dokumen verifikasi dan bukti pembayaran langganan semata-mata untuk keperluan persetujuan manual.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Pemilik Kos (Owner):</strong> Hanya dapat melihat data penyewa yang mendaftar di propertinya sendiri. Pemilik tidak dapat mengakses data penyewa milik properti lain.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Penyedia Infrastruktur Teknis:</strong> Layanan yang digunakan untuk mengoperasikan platform: Convex (database &amp; penyimpanan file), Google (login OAuth), Telegram Bot API dan Meta/WhatsApp Cloud API (pengiriman notifikasi bot). Detail pemrosesan pihak ketiga: PERLU KONFIRMASI.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Kewajiban Hukum:</strong> Kami dapat membuka data jika diwajibkan secara sah oleh peraturan perundang-undangan Republik Indonesia.
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
                4. Keamanan Data
              </h2>
            </div>

            <ul className="mt-4 list-disc pl-5 space-y-2.5 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                Seluruh data yang tersimpan dienkripsi dengan standar industri (<strong className="text-[var(--ink)]">AES-256</strong>) oleh penyedia infrastruktur komputasi awan kami.
              </li>
              <li>
                Dokumen sensitif (KTP, selfie, bukti kepemilikan) <strong className="text-[var(--ink)]">hanya dapat diakses melalui mekanisme otorisasi berlapis</strong> yang memeriksa hak akses setiap kali berkas diminta, bukan tautan publik yang bisa dibagikan bebas.
              </li>
              <li>
                Konfirmasi pembayaran (baik langganan maupun sewa) <strong className="text-[var(--ink)]">selalu dilakukan secara manual oleh pihak berwenang</strong> - BotKos tidak pernah menyetujui transaksi secara otomatis hanya karena adanya gambar yang diunggah.
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
                5. Berapa Lama Data Disimpan
              </h2>
            </div>

            <ul className="mt-4 list-disc pl-5 space-y-2.5 text-sm leading-7 text-[var(--ink-muted)]">
              <li>
                <strong className="text-[var(--ink)]">Foto KTP dan Selfie:</strong> Dihapus otomatis sekitar 90 hari setelah status pengajuan verifikasi diputuskan (disetujui atau ditolak). Catatan riwayat status verifikasi tetap tersimpan untuk integritas data, namun berkas gambarnya dihapus permanen.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Data Operasional (kamar, tenant, riwayat pembayaran):</strong> Disimpan selama akun Anda aktif, guna menjaga kesinambungan riwayat yang Anda perlukan dalam mengelola kos.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Penghapusan Akun:</strong> Jika Anda mengajukan penghapusan akun, kami akan menghapus atau menganonimkan data pribadi Anda sesuai regulasi yang berlaku, kecuali jika ada data yang wajib disimpan lebih lama karena kewajiban hukum (misalnya pembukuan pajak).
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
                6. Hak Anda
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Sesuai dengan ketentuan Undang-Undang Pelindungan Data Pribadi (UU PDP), Anda memiliki hak untuk:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[var(--ink-muted)]">
              <li>Meminta akses atas data pribadi Anda yang tersimpan di sistem kami.</li>
              <li>Meminta pembaruan atau koreksi atas data yang tidak akurat atau tidak lengkap.</li>
              <li>Meminta penghapusan data pribadi Anda dari sistem kami.</li>
              <li>Menarik kembali persetujuan pemrosesan data yang pernah Anda berikan (misalnya berkas verifikasi identitas).</li>
              <li>Mengajukan keberatan atas pemrosesan data tertentu.</li>
            </ul>
            <p className="mt-4 text-sm text-[var(--ink-muted)]">
              Untuk menggunakan hak-hak di atas, Anda dapat menghubungi tim kami melalui{" "}
              <Link href="/bantuan" className="font-semibold text-[var(--gold-dark)] underline underline-offset-2">
                Pusat Bantuan BotKos
              </Link>{" "}
              atau email resmi kami.
            </p>
          </section>

          {/* Section 7 */}
          <section id="perubahan-kebijakan" className="border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
                <FileText size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                7. Perubahan Kebijakan
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu sesuai dengan perkembangan operasional platform dan hukum yang berlaku. Setiap perubahan penting akan kami informasikan melalui email atau pemberitahuan langsung di dalam antarmuka aplikasi.
            </p>
          </section>

          {/* Section 8 */}
          <section id="kontak">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-dark)]">
                <Mail size={18} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                8. Kontak &amp; Pertanyaan
              </h2>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              Pertanyaan, permohonan data, atau masukan seputar privasi dan perlindungan data pribadi Anda dapat disampaikan kepada:
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--ink)]">Tim Dukungan &amp; Privasi BotKos</p>
                <p className="text-xs text-[var(--ink-muted)]">Kirim tiket atau pertanyaan langsung ke tim admin kami</p>
              </div>
              <Link
                href="/bantuan"
                className="button-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold"
              >
                Kirim Tiket Bantuan
              </Link>
            </div>
          </section>
        </article>

        {/* ── Footer Navigation ── */}
        <div className="relative z-10 mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6 text-xs text-[var(--ink-muted)]">
          <p>© 2026 BotKos · botkos.id</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[var(--ink)] underline">
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
