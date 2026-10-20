export type FaqCategory =
  | "Umum"
  | "Pendaftaran & Booking"
  | "Pembayaran & Keamanan"
  | "Langganan & Harga"
  | "Verifikasi"
  | "Bot Telegram & WhatsApp"

export type FaqItem = {
  question: string
  answer: string
  category: FaqCategory
}

// Satu sumber konten FAQ lengkap untuk seluruh aplikasi BotKos.
export const FAQ_ITEMS: FaqItem[] = [
  // ── Umum ──────────────────────────────────────────────────────────────────
  {
    category: "Umum",
    question: "Apa itu BotKos?",
    answer:
      "BotKos adalah platform yang membantu pemilik kos mengelola kamar, piutang sewa, dan komunikasi dengan penyewa - langsung lewat chat Telegram atau WhatsApp, tanpa harus buka aplikasi baru tiap hari.",
  },
  {
    category: "Umum",
    question: "Siapa yang cocok pakai BotKos?",
    answer:
      "Pemilik kos skala kecil-menengah (sekitar 8-40 kamar) yang masih mengandalkan catatan manual atau Excel untuk mengelola sewa.",
  },
  {
    category: "Umum",
    question: "Apakah penyewa harus install aplikasi?",
    answer:
      "Tidak. Penyewa cukup mengisi formulir lewat link yang dibagikan pemilik - tanpa perlu akun atau instalasi apa pun.",
  },

  // ── Pendaftaran & Booking ────────────────────────────────────────────────
  {
    category: "Pendaftaran & Booking",
    question: "Bagaimana cara calon penyewa mendaftar?",
    answer:
      "Pemilik membagikan satu link unik (botkos.id/[nama-kos]/daftar). Calon penyewa mengisi data diri, memilih kamar, lalu mengunggah bukti pembayaran (DP atau lunas).",
  },
  {
    category: "Pendaftaran & Booking",
    question: "Apa bedanya DP booking dan Bayar Lunas?",
    answer:
      "DP booking mengunci kamar sementara sampai batas waktu pelunasan yang ditentukan pemilik - kalau tidak dilunasi sampai batas waktu, kamar otomatis terbuka kembali. Bayar Lunas langsung membuat kamar berstatus terisi setelah diverifikasi pemilik.",
  },
  {
    category: "Pendaftaran & Booking",
    question: "Kenapa konfirmasi pembayaran tidak otomatis?",
    answer:
      "Supaya tidak ada yang bisa mengelabui sistem dengan bukti transfer palsu - pemilik selalu memeriksa secara manual sebelum mengonfirmasi.",
  },

  // ── Pembayaran & Keamanan ─────────────────────────────────────────────────
  {
    category: "Pembayaran & Keamanan",
    question: "Apakah BotKos menyimpan atau memproses uang sewa saya?",
    answer:
      "Tidak. BotKos hanya mencatat dan membantu verifikasi transaksi yang terjadi langsung antara pemilik dan penyewa - bukan penyelenggara jasa pembayaran.",
  },
  {
    category: "Pembayaran & Keamanan",
    question: "Apakah data saya aman?",
    answer:
      "Semua data dienkripsi saat disimpan. Dokumen sensitif seperti KTP hanya bisa diakses lewat mekanisme yang diperiksa setiap kali diminta, bukan tautan bebas. Lihat Kebijakan Privasi kami untuk detail lengkap.",
  },

  // ── Langganan & Harga ────────────────────────────────────────────────────
  {
    category: "Langganan & Harga",
    question: "Berapa harga BotKos?",
    answer:
      "Gratis untuk 1-5 kamar. Tier berbayar mulai dari Rp59.000/bulan untuk 6-20 kamar, naik bertahap sesuai jumlah kamar yang dikelola. Lihat halaman Harga untuk rincian lengkap.",
  },
  {
    category: "Langganan & Harga",
    question: "Bagaimana cara upgrade tier?",
    answer:
      "Sistem akan memberi tahu Anda kalau jumlah kamar sudah melebihi tier aktif. Anda bisa upgrade kapan saja lewat halaman Billing, dengan transfer manual yang akan ditinjau admin kami.",
  },
  {
    category: "Langganan & Harga",
    question: "Apakah ada komitmen tahunan?",
    answer:
      "Tidak wajib. Anda bisa mulai dari langganan bulanan, dan baru mempertimbangkan paket tahunan (dengan harga lebih hemat) setelah Anda merasa BotKos benar-benar bermanfaat.",
  },

  // ── Verifikasi ───────────────────────────────────────────────────────────
  {
    category: "Verifikasi",
    question: "Apa itu badge \"Terverifikasi\"?",
    answer:
      "Tanda bahwa identitas pemilik dan keberadaan properti sudah ditinjau admin kami. Sifatnya opsional - properti yang belum terverifikasi tetap bisa menggunakan seluruh fitur BotKos seperti biasa.",
  },
  {
    category: "Verifikasi",
    question: "Apakah saya wajib upload KTP?",
    answer:
      "Tidak wajib untuk menggunakan BotKos. KTP hanya diperlukan jika Anda ingin mengajukan badge \"Terverifikasi\" di listing Anda.",
  },
  {
    category: "Verifikasi",
    question: "Kenapa saya wajib upload foto kos saat mendaftar?",
    answer:
      "Foto kos dibutuhkan agar calon penyewa bisa melihat kondisi kamar sebelum mendaftar - ini terpisah dari proses verifikasi identitas.",
  },

  // ── Bot Telegram & WhatsApp ──────────────────────────────────────────────
  {
    category: "Bot Telegram & WhatsApp",
    question: "Perintah apa saja yang bisa saya kirim ke bot?",
    answer:
      "/status untuk ringkasan kondisi properti, /belum_bayar untuk daftar tagihan yang jatuh tempo, dan /kamar_kosong untuk daftar kamar kosong.",
  },
  {
    category: "Bot Telegram & WhatsApp",
    question: "Apakah saya harus pakai Telegram DAN WhatsApp?",
    answer:
      "Tidak, Anda bisa memilih salah satu atau menghubungkan keduanya sesuai preferensi Anda.",
  },
]
