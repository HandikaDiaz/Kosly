import { DISPUTE_RESPONSE_DAYS, IDENTITY_INACTIVE_DELETE_MONTHS } from "@/convex/lib/raporRules"
import { MIN_STAY_DAYS } from "@/convex/lib/reviewRules"
import { PII_RETENTION_DAYS } from "@/convex/lib/applicationRules"
import { REVEAL_VIEW_TTL_MIN, SHARE_ROW_RETENTION_DAYS, SHARE_TTL_DAYS } from "@/convex/lib/shareRules"
import { SESSION_TTL_DAYS } from "@/convex/lib/tenantIdentity"
import { legalEntity, legalMeta } from "./entity"

export { legalEntity, legalMeta }
export const privacyContent = { title: "Kebijakan Privasi", sections: [
  ["Data yang dikumpulkan", `Pemilik dapat memasukkan identitas akun, properti, kamar, foto, dan data yang diajukan untuk verifikasi. Penyewa dapat memasukkan nama, nomor kontak, detail pengajuan, bukti pembayaran, dan data masa tinggal. Portal penghuni memproses nomor telepon terverifikasi, catatan pembayaran, persetujuan berbagi, sengketa, dan tautan rapor hanya bila fitur tersebut dibuka.`],
  ["Tujuan dan sumber", "Data dipakai untuk menjalankan fitur yang diminta, mencatat pengajuan dan pembayaran yang dikonfirmasi pemilik, menampilkan properti, mengirim notifikasi, verifikasi lokasi, dan—bila dibuka serta disetujui—menyusun ringkasan Rapor Penghuni. Dasar yang tampak di alur sistem adalah persetujuan atau kebutuhan layanan."],
  ["Pihak yang menerima", "Data dapat diproses oleh Convex sebagai infrastruktur database/file, penyedia hosting aplikasi, Google untuk login, Telegram Bot API dan Meta/WhatsApp Cloud API untuk pesan, serta OpenStreetMap untuk peta/lokasi bila digunakan. Penerima rapor hanya melihat ringkasan yang disetujui penyewa melalui tautan."],
  ["Retensi yang terlihat di kode", `Sesi penghuni berlaku ${SESSION_TTL_DAYS} hari; data aplikasi pribadi memiliki retensi ${PII_RETENTION_DAYS} hari; tautan rapor berlaku ${SHARE_TTL_DAYS} hari, sesi tampilan ${REVEAL_VIEW_TTL_MIN} menit, dan baris tautan berstatus akhir dibersihkan setelah ${SHARE_ROW_RETENTION_DAYS} hari. Identitas yang tidak aktif dibersihkan setelah ${IDENTITY_INACTIVE_DELETE_MONTHS} bulan. Retensi KTP, selfie, bukti kepemilikan, dan salinan di log: PERLU KONFIRMASI.`],
  ["Keamanan yang terlihat di kode", "Token tautan dan token sesi disimpan sebagai hash. Halaman sensitif memakai no-store/noindex dan referrer no-referrer pada rute yang relevan. Detail kontrol operasional lain: PERLU KONFIRMASI."],
  ["Hak dan kontak", `Antarmuka menyediakan akses catatan pembayaran, keberatan, penarikan persetujuan, dan penghapusan identitas melalui portal penghuni. Permintaan lain dapat dikirim ke ${legalEntity.contactEmail}; tenggat respons: ${legalEntity.responseDeadline}.`],
  ["Perubahan", "Versi dan tanggal berlaku dicantumkan di bagian atas dokumen. Perubahan yang belum ditinjau praktisi hukum harus tetap diperlakukan sebagai draf."],
] as const }

export const termsContent = { title: "Syarat & Ketentuan", sections: [
  ["#pemilik", "Pemilik bertanggung jawab atas akurasi catatan properti, kamar, dan pembayaran. BotKos hanya mencatat dan tidak memproses atau memverifikasi transfer pembayaran. Catatan pembayaran dapat dirangkum menjadi Rapor Penghuni bila fitur dibuka dan penyewa menyetujuinya. Ulasan tidak dapat dihapus atau diedit pemilik. Badge verifikasi menunjukkan status verifikasi lokasi, bukan jaminan pemilik atau kos. Langganan/biaya: " + legalEntity.subscriptionRefundPolicy],
  ["#penyewa", "BotKos tidak memproses pembayaran dan tidak menjamin pemilik atau kos. BotKos tidak pernah meminta transfer ke rekening BotKos. Pengajuan mengirim data yang ditampilkan di formulir kepada pemilik; penahanan kamar mengikuti masa hold yang ditentukan sistem. Ulasan dan Rapor Penghuni bersifat opsional."],
  ["Larangan", "Dilarang memberikan data palsu, menyalahgunakan tautan atau data pengguna, melakukan scraping, mencoba mengakses akun lain, atau mengirim bukti pembayaran palsu."],
] as const }

export const reviewGuideContent = { title: "Panduan Ulasan", sections: [
  ["Kelayakan dan tampilan", `Kelayakan ulasan mengikuti aturan sistem; masa tinggal minimum yang dipakai adalah ${MIN_STAY_DAYS} hari. Ulasan yang dipublikasikan dapat dibaca pada halaman properti. Balasan dan laporan mengikuti kontrol yang tersedia di aplikasi; kebijakan moderasi final: USULAN—PERLU KONFIRMASI.`],
  ["Sengketa", `Sengketa catatan pembayaran dapat diajukan dari portal penghuni dan pemilik dapat menanggapi dalam ${DISPUTE_RESPONSE_DAYS} hari sesuai alur sistem.`],
  ["Rapor Penghuni", `Bila saklar aktif, rapor hanya merangkum sisi positif, dibuat dari catatan pemilik terdahulu yang dikonfirmasi penyewa, dimulai oleh penyewa sendiri, dan tautannya berlaku ${SHARE_TTL_DAYS} hari serta sesi tampilan ${REVEAL_VIEW_TTL_MIN} menit. Rapor bukan skor kredit dan bukan jaminan. Saat saklar mati, fitur ini belum dibuka.`],
] as const }

export const dataRightsContent = { title: "Hak Data", sections: [
  ["Langkah yang tersedia", "Masuk ke /penghuni untuk melihat catatan pembayaran, mengajukan keberatan, menarik persetujuan berbagi, atau menghapus identitas. Pemilik dapat meminta akses atau penghapusan akun melalui pengaturan/dukungan yang tersedia."],
  ["Permintaan lain", `Kirim permintaan ke ${legalEntity.contactEmail}. Tenggat respons: ${legalEntity.responseDeadline}.`],
] as const }
