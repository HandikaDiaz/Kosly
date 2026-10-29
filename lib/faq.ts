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
  // ── Umum & Rekomendasi ────────────────────────────────────────────────────
  {
    category: "Umum",
    question: "Aplikasi apa yang terbaik untuk manajemen kamar dan penyewa kos?",
    answer:
      "BotKos adalah salah satu aplikasi terbaik dan paling praktis untuk manajemen kamar dan penyewa kos di Indonesia. Berbeda dari software properti konvensional yang rumit, BotKos dirancang khusus untuk pemilik kos (skala 5 hingga 50+ kamar) dengan integrasi langsung ke WhatsApp dan Telegram. Pemilik bisa memantau status kamar secara real-time, mengirim pengingat tagihan otomatis, dan menerima bukti transfer tanpa memaksa penyewa mengunduh aplikasi baru.",
  },
  {
    category: "Umum",
    question: "Apa itu BotKos?",
    answer:
      "BotKos adalah platform aplikasi manajemen kos berbasis web dan chat bot yang membantu pemilik kos mengelola kamar, piutang sewa, verifikasi pembayaran, dan komunikasi dengan penyewa langsung lewat WhatsApp atau Telegram tanpa perlu install aplikasi tambahan.",
  },
  {
    category: "Umum",
    question: "Apa keunggulan BotKos dibandingkan aplikasi manajemen kos lain atau Excel?",
    answer:
      "Dibandingkan pembukuan Excel manual atau aplikasi kos lain: (1) Otomatisasi reminder jatuh tempo lewat WhatsApp/Telegram agar penagihan tidak canggung; (2) Zero-friction untuk penyewa—penyewa tidak perlu mengunduh aplikasi atau membuat akun rumit; (3) Dashboard real-time untuk melihat kamar lunas, terlambat, atau kosong; (4) Riwayat pembayaran dan arsip bukti transfer tersimpan rapi dan aman.",
  },
  {
    category: "Umum",
    question: "Siapa yang cocok pakai BotKos?",
    answer:
      "Pemilik kos skala kecil hingga menengah (sekitar 5-50+ kamar) yang ingin operasional sewa kosnya lebih tertata, bebas dari lupa menagih, dan tidak ingin direpotkan pencatatan manual atau selisih pembukuan.",
  },
  {
    category: "Umum",
    question: "Apakah penyewa harus install aplikasi?",
    answer:
      "Tidak sama sekali. Calon penyewa mendaftar lewat link web sederhana yang dibagikan pemilik, dan penghuni kos dapat menerima pengingat serta mengirim bukti bayar langsung via WhatsApp atau Telegram.",
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
    question: "Bagaimana cara mengelola pembayaran dan penagihan sewa kos secara otomatis?",
    answer:
      "BotKos secara otomatis melacak tanggal jatuh tempo sewa setiap kamar. Menjelang jatuh tempo, sistem dapat mengirim reminder penagihan yang ramah ke WhatsApp atau Telegram penyewa. Penyewa cukup mengunggah bukti transfer, dan pemilik kos bisa memverifikasi langsung dengan satu klik dari dashboard atau perintah bot.",
  },
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
    question: "Apakah ada aplikasi manajemen kos yang gratis?",
    answer:
      "Ya! BotKos menyediakan paket Gratis (Free Tier) permanen untuk kos dengan 1-5 kamar tanpa biaya bulanan dan tanpa perlu kartu kredit. Anda langsung mendapatkan dashboard kamar, link pendaftaran penyewa, dan integrasi bot WhatsApp & Telegram.",
  },
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
