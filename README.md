# BotKos (botkos.id)

BotKos adalah platform manajemen operasional & otomasi bot untuk pemilik
kos kecil-menengah. Sistem ini mencakup manajemen kamar & multi-properti,
pendaftaran penyewa lewat link publik unik (`botkos.id/[slug]/daftar`),
booking dengan DP & pelunasan, siklus sewa bulanan/tahunan yang berjalan
otomatis, status siklus hidup tenant (akan pindah / nunggak), lapisan
kepercayaan & verifikasi, model langganan bertingkat, serta notifikasi &
aksi bot via Telegram dan WhatsApp Business Cloud API.

---

## Fitur Utama

- **Manajemen kamar & properti** — dashboard kamar dengan status
  (tersedia/booked/terisi), detail spesifikasi & fasilitas, multi-properti
  per owner (tergantung tier)
- **Pendaftaran penyewa publik** — link unik per properti, penyewa isi
  data & upload bukti bayar tanpa perlu akun/install apa pun
- **Booking DP + pelunasan** — kamar terkunci setelah DP dikonfirmasi,
  batas waktu pelunasan (`dp_max_days`, diset pemilik), auto-expire +
  pelepasan kamar jika lewat tenggat tanpa pelunasan
- **Siklus sewa berulang** — reminder jatuh tempo bulanan berjalan
  otomatis tiap siklus (H-3/H+3), tanpa perlu input ulang tiap bulan
- **Status siklus hidup tenant** — "Akan Pindah" (input manual pemilik)
  dan flag "nunggak tanpa kabar" (>5 hari lewat jatuh tempo, keputusan
  akhir tetap di tangan pemilik, tidak ada auto-vacate)
- **Lapisan kepercayaan & verifikasi** — identitas pemilik, keberadaan
  properti, dan review sosial (lihat Bagian Verifikasi)
- **Model langganan bertingkat** — berdasarkan jumlah kamar per akun
  (lihat Bagian Model Bisnis)
- **Bot Telegram & WhatsApp** — notifikasi, konfirmasi pembayaran, dan
  command query status, dengan respons yang disusun kontekstual (bukan
  template statis — lihat Bagian Query Bot Command)
- **Landing page** — animasi/motion dan sequence penjelasan singkat cara
  kerja BotKos (lihat Bagian Landing Page)

---

## 📌 Catatan Pengaturan Manual (Di Luar Kode)

1. **Username Bot Telegram** — ganti lewat BotFather (misal
   `@BotKos_bot`)
2. **Nama Proyek di Convex Dashboard** — ganti ke `botkos` atau sesuai
   nama project Anda di [dashboard.convex.dev](https://dashboard.convex.dev)
3. **Domain & DNS (`botkos.id`)** — arahkan DNS ke server deployment
   (Vercel/Next.js hosting)
4. **Rekening/QRIS billing** — instruksi pembayaran langganan di
   `/dashboard/billing` perlu disesuaikan ke rekening bisnis Anda sebelum
   production (lihat Bagian Model Bisnis)

---

## Menjalankan Lokal

1. Salin `.env.example` menjadi `.env.local`
2. Isi `NEXT_PUBLIC_CONVEX_URL` dan `CONVEX_SITE_URL`
3. Jalankan `npm run dev`
4. Jalankan `npx convex dev` setelah login ke Convex dan menyiapkan
   provider auth

---

## Login Owner dengan Google OAuth

BotKos memakai Google OAuth untuk role `owner`. Buat OAuth Client ID
bertipe Web application di Google Cloud Console, lalu tambahkan
authorized redirect URI berikut:

```text
https://<CONVEX_SITE_URL>/api/auth/callback/google
```

Set secret pada deployment Convex:

```powershell
npx convex env set AUTH_GOOGLE_ID 'google-client-id'
npx convex env set AUTH_GOOGLE_SECRET 'google-client-secret'
npx convex env set SITE_URL 'http://localhost:3000'
```

Untuk production, ubah `SITE_URL` menjadi domain production
(`https://botkos.id`) dan daftarkan redirect URI production yang sama
pada Google Cloud Console. `NEXT_PUBLIC_APP_URL` menentukan link penyewa:
saat development gunakan `http://localhost:3000`, saat production
gunakan `https://botkos.id`.

---

## Model Bisnis & Tier Langganan

Tier dihitung di level akun (owner), berdasarkan TOTAL kamar dari seluruh
properti yang dimiliki — bukan per properti.

| Tier | Jumlah kamar | Bulanan | Tahunan | Properti |
|---|---|---|---|---|
| Gratis | 1–5 | Rp0 | — | 1 |
| Starter | 6–20 | Rp59.000 | Rp590.000 | 1 |
| Growth | 21–40 | Rp109.000 | Rp1.090.000 | hingga 3 |
| Pro | 41+ | Rp199.000 | Rp1.990.000 | unlimited, multi-admin |

Sistem menyarankan upgrade secara otomatis ketika jumlah kamar melewati
batas tier aktif (banner di dashboard + notifikasi bot), tapi TIDAK
pernah memaksa upgrade atau mengunci fitur — ini kebijakan sadar, bukan
keterbatasan sementara.

Alur pembayaran langganan saat ini manual: owner upload bukti transfer/
QRIS di `/dashboard/billing`, admin review & approve dari `/admin`. Belum
ada payment gateway otomatis, auto-charge, auto-downgrade, atau
pemblokiran fitur saat status `past_due` — ini keputusan sadar untuk fase
saat ini (jumlah pelanggan masih kecil, proses manual lebih cepat
divalidasi), bukan kekurangan yang belum sempat dikerjakan.

---

## Admin, Langganan, dan Verifikasi

Untuk memberi akses admin, buka tabel `owners` di Convex Dashboard dan
ubah field `role` akun menjadi `admin`. Halaman internal tersedia di
`/admin` dan hanya dapat dibuka oleh role tersebut. Tampilan Admin
Dashboard mengikuti bahasa desain yang sama dengan Dashboard Owner
(token warna, tipografi, komponen reusable yang sama), dengan label
"Admin" di navigasi supaya tetap mudah dibedakan konteksnya.

Admin Dashboard berisi tiga bagian:
- **Billing** — daftar pembayaran langganan yang menunggu review,
  ringkasan jumlah owner per tier
- **Verifikasi** — review KTP + selfie (identitas pemilik) dan bukti
  kepemilikan + foto properti (keberadaan properti)
- **Laporan** — laporan dari penyewa (misal kos tidak sesuai), ditinjau
  manual, tidak pernah auto-suspend listing

### Lapisan Kepercayaan & Verifikasi

Tiga lapisan, semuanya OPSIONAL kecuali disebutkan lain — tidak ada fitur
aplikasi yang terkunci karena status verifikasi, badge "Terverifikasi"
murni insentif kepercayaan ke calon penyewa:

1. **Identitas pemilik** — upload KTP + selfie, direview manual oleh
   admin (bukan OCR/face-matching otomatis)
2. **Keberadaan properti** — bukti kepemilikan/sewa (opsional) + foto kos
   (**WAJIB minimal 3 foto saat onboarding properti** — ini satu-satunya
   bagian dari sistem verifikasi yang sifatnya wajib, murni karena foto
   memang dibutuhkan untuk ditampilkan ke calon penyewa, bukan berarti
   status verifikasi itu sendiri jadi wajib)
3. **Kepercayaan sosial** — review dari tenant yang pembayarannya pernah
   terkonfirmasi, dan mekanisme laporan dari calon penyewa

---

## Flow Booking & Siklus Sewa

- **DP booking**: tenant pilih kamar → upload bukti DP → owner konfirmasi
  manual → kamar terkunci (`booked`) → tenant pilih tanggal pelunasan
  (dibatasi maksimal `room.dp_max_days` dari konfirmasi DP) → reminder
  H-1/hari-H/H+1 → jika lewat H+1 tanpa pelunasan, DP hangus dan kamar
  otomatis kembali `available`
- **Pelunasan**: sama seperti pembayaran lain, selalu lewat konfirmasi
  manual pemilik (tidak pernah auto-approve walau ada bukti terupload)
- **Siklus bulanan**: begitu tenant aktif, jatuh tempo berikutnya
  otomatis dihitung ulang tiap kali pembayaran bulanan dikonfirmasi —
  tidak perlu input ulang dari pemilik maupun tenant
- **Status "Akan Pindah"**: hanya pemilik yang bisa set tanggal pindah
  tenant (tidak ada self-service dari sisi tenant), tidak ada minimum
  notice period
- **Nunggak tanpa kabar**: setelah >5 hari lewat jatuh tempo tanpa
  pembayaran terkonfirmasi, sistem flag ke pemilik untuk keputusan manual
  ("Tandai Kosong" atau "Masih Tunggu") — tidak pernah auto-vacate kamar

---

## Environment Bot

Variable berikut harus diset pada environment Convex
(`npx convex env set NAME value`), bukan hanya `.env.local`:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
META_APP_SECRET=
```

Jangan commit token asli. Rotate token jika pernah masuk log, screenshot,
atau repository.

---

## Menjalankan Telegram Bot

1. Buka Telegram dan chat `@BotFather`
2. Jalankan `/newbot`, pilih nama (misal `BotKos Assistant`) dan username
   (misal `@BotKos_bot`), lalu simpan token
3. Buat secret acak untuk `TELEGRAM_WEBHOOK_SECRET`
4. Set environment Convex:

```bash
npx convex env set TELEGRAM_BOT_TOKEN "123456:replace-with-real-token"
npx convex env set TELEGRAM_WEBHOOK_SECRET "replace-with-random-secret"
```

5. Setelah deployment Convex Site URL aktif, daftarkan webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" `
  -H "Content-Type: application/json" `
  -d '{"url":"https://<CONVEX_SITE_URL>/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

Hubungkan chat ID owner dari halaman Pengaturan BotKos. Saat bukti
pembayaran masuk, bot mengirimkan notifikasi beserta tombol inline
`Konfirmasi` dan `Tolak`.

---

## Menjalankan WhatsApp Business Bot

WhatsApp personal tidak cukup. Gunakan WhatsApp Business Platform / Cloud
API resmi Meta.

1. Buka [Meta for Developers](https://developers.facebook.com/) dan buat
   App bertipe Business
2. Tambahkan produk WhatsApp
3. Siapkan WhatsApp Business Account, nomor bisnis, `Phone Number ID`,
   dan access token system user/permanent token untuk production
4. Isi environment Convex:

```bash
npx convex env set WHATSAPP_ACCESS_TOKEN "replace-with-meta-token"
npx convex env set WHATSAPP_PHONE_NUMBER_ID "replace-with-phone-number-id"
npx convex env set WHATSAPP_VERIFY_TOKEN "replace-with-random-verify-token"
npx convex env set META_APP_SECRET "replace-with-meta-app-secret"
```

5. Pada konfigurasi Webhooks Meta, masukkan callback URL:

```text
https://<CONVEX_SITE_URL>/whatsapp/webhook
```

Pesan konfirmasi memakai command terstruktur:

```text
KONFIRMASI KSL-ABC123
TOLAK KSL-ABC123 bukti belum jelas
```

---

## Query Bot Command

Owner yang sudah menghubungkan chat Telegram/WhatsApp dapat mengirimkan
command berikut:

```text
/status
/belum_bayar
/kamar_kosong
```

- `/status` menampilkan ringkasan kondisi properti, disusun kontekstual
  (bukan template statis) — item yang butuh tindakan (verifikasi pending,
  kamar kosong) diprioritaskan di atas, nada pesan menyesuaikan kondisi
  (ada yang perlu perhatian vs semua lancar)
- `/belum_bayar` menampilkan tagihan sewa yang sudah jatuh tempo
- `/kamar_kosong` menampilkan daftar kamar kosong beserta harga sewa
  bulanan

---

## Desain & Komponen

- Token warna brand: aksen gold gradient (`#F3D98B` → `#A9752F`) di atas
  latar gelap (`#2A1B12` → `#15101D`) — dipakai penuh di area brand
  (logo, landing page), TAPI di dashboard hanya dipakai sebagai warna
  aksen flat solid (tanpa gradient/bevel) supaya tetap mudah dibaca untuk
  pemakaian kerja sehari-hari
- Komponen reusable di `components/kosly/`, dibangun di atas primitive
  `components/ui/` (shadcn) — termasuk `FieldLabel` (label + tooltip info,
  hover di desktop/tap di mobile), `StatusBadge`, `LedgerTable`,
  `RoomDetailCard`, `ImageUploadField`, `EmptyState`
- Form "Tambah Kamar" dan step setara di onboarding memakai komponen yang
  SAMA (tidak ada implementasi terpisah/duplikat)

---

## Landing Page

Landing page (`botkos.id`) memakai motion lebih bebas dibanding dashboard
(animasi scroll-reveal, hero entrance, hover halus dengan Framer Motion),
termasuk sequence penjelasan cara kerja BotKos berupa animasi di halaman
(bukan file video) — lihat dokumentasi redesign landing page untuk detail
scene. Animasi menghormati preferensi `prefers-reduced-motion` pengguna.

---

## Catatan Tambahan

Konfirmasi pembayaran (DP, pelunasan, maupun sewa bulanan) selalu manual
oleh pemilik — BotKos tidak pernah auto-approve hanya karena ada bukti
terupload, dan tidak terhubung langsung ke mutasi rekening bank, untuk
alasan keamanan dan mencegah penyalahgunaan bukti palsu. Perhitungan sewa
prorata/parsial saat tenant pindah di tengah siklus, serta sistem escrow
untuk menahan dana DP, sengaja belum dibangun di fase ini — yang pertama
karena kompleksitasnya belum sepadan dengan kebutuhan saat ini, yang
kedua karena membutuhkan kajian legal (izin BI/PJP) sebelum bisa
dikerjakan.

Verifikasi sebelum deploy:

```bash
npx tsc --noEmit
npm test
npm run build
```