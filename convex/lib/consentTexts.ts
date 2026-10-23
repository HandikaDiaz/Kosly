import { SHARE_CONSENT_VERSION } from "./raporRules"

export const SHARE_CONSENT_V1 = {
  version: "share-rapor-2026-10-v1",
  title: "Bagikan Rapor Penghuni ke calon pemilik kos",
  paragraphs: [
    "Apa ini: ringkasan rekam jejak pembayaran sewamu dari masa tinggal yang sudah kamu konfirmasi. Kamu yang memutuskan kapan dan ke siapa membagikannya.",
    "Data yang dipakai: catatan pembayaran sewa bulanan (tepat waktu atau tidak) dari masa tinggal yang kamu konfirmasi. Catatan ini dibuat oleh pemilik kos sebelumnya di BotKos.",
    "Yang dilihat penerima: hanya kategori ringkasan (\"Selalu tepat waktu\" atau \"Umumnya tepat waktu\"), rentang jumlah kos, dan rentang lama tinggal. Penerima tidak melihat nominal, nama kos, nama pemilik, alamat, atau tanggal.",
    "Hanya kamu yang memulai pembagian, ke satu penerima untuk setiap tautan. Tautan berlaku 7 hari dan bisa dipakai satu kali. Tidak ada pemilik kos yang bisa mencari atau melihat rapormu tanpa tautan darimu.",
    "Jika catatanmu belum memenuhi syarat, tidak ada rapor yang dibuat dan tidak ada keterangan apa pun yang dikirim ke siapa pun.",
    "Berapa lama: persetujuan berlaku sampai kamu menariknya. Identitas yang tidak aktif selama 24 bulan dihapus otomatis.",
    "Hakmu: melihat catatan pembayaranmu, mengajukan keberatan atas satu catatan, menarik persetujuan kapan saja, dan menghapus identitasmu. Saat persetujuan ditarik, pembagian yang masih aktif dicabut dan pemrosesan rapormu berhenti. Informasi yang sudah dilihat penerima sebelumnya tidak bisa ditarik kembali.",
    "Persetujuan ini hanya untuk membagikan Rapor Penghuni, tidak untuk tujuan lain. Kamu tetap bisa memakai BotKos tanpa menyetujuinya.",
  ],
  buttons: { agree: "Saya setuju", decline: "Tidak sekarang" },
} as const

// Teks ini perlu ditinjau praktisi pelindungan data pribadi sebelum rilis ke pengguna sungguhan.
export const SHARE_CONSENT_TEXT = {
  version: SHARE_CONSENT_VERSION,
  title: "Bagikan Rapor Penghuni ke calon pemilik kos",
  paragraphs: [
    "Apa ini: ringkasan rekam jejak pembayaran sewamu dari masa tinggal yang sudah kamu konfirmasi. Kamu yang memutuskan kapan dan ke siapa membagikannya.",
    "Data yang dipakai: catatan pembayaran sewa bulanan (tepat waktu atau tidak) dari masa tinggal yang kamu konfirmasi. Catatan ini dibuat oleh pemilik kos sebelumnya di BotKos.",
    "Yang dilihat penerima: kategori ringkasan (\"Selalu tepat waktu\" atau \"Umumnya tepat waktu\"), rentang jumlah kos, rentang lama tinggal, bulan pembuatan rapor, dan 4 digit terakhir nomor HP yang sudah kamu verifikasi (agar penerima bisa mencocokkan dengan nomormu). Penerima tidak melihat nominal, nama kos, nama pemilik, alamat, atau tanggal.",
    "Hanya kamu yang memulai pembagian, ke satu penerima untuk setiap tautan. Tautan berlaku 7 hari dan hanya bisa dibuka satu kali; waktu pembuatan dan waktu dibuka tercatat dan bisa kamu lihat. Tidak ada pemilik kos yang bisa mencari atau melihat rapormu tanpa tautan darimu.",
    "Jika catatanmu belum memenuhi syarat, tidak ada rapor yang dibuat dan tidak ada keterangan apa pun yang dikirim ke siapa pun.",
    "Berapa lama: persetujuan berlaku sampai kamu menariknya. Identitas yang tidak aktif selama 24 bulan dihapus otomatis.",
    "Hakmu: melihat catatan pembayaranmu, mengajukan keberatan atas satu catatan, menarik persetujuan kapan saja, dan menghapus identitasmu. Saat persetujuan ditarik, pembagian yang masih aktif dicabut dan pemrosesan rapormu berhenti. Informasi yang sudah dilihat penerima sebelumnya tidak bisa ditarik kembali.",
    "Persetujuan ini hanya untuk membagikan Rapor Penghuni, tidak untuk tujuan lain. Kamu tetap bisa memakai BotKos tanpa menyetujuinya.",
  ],
  buttons: { agree: "Saya setuju", decline: "Tidak sekarang" },
} as const

export const consentTextForHash = () => `${SHARE_CONSENT_TEXT.title}\n${SHARE_CONSENT_TEXT.paragraphs.join("\n")}`
