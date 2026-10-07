# BotKos (botkos.id)

BotKos adalah platform manajemen operasional & otomasi bot untuk pemilik kos kecil-menengah. Sistem ini mencakup manajemen kamar, multi-properti, pendaftaran penyewa melalui link unik publik (`botkos.id/[slug]/daftar`), upload & review bukti pembayaran, siklus sewa bulanan/tahunan, serta notifikasi & aksi bot via Telegram dan WhatsApp Business Cloud API.

---

## 📌 Catatan Pengaturan Manual (Di Luar Kode)

Berikut hal-hal yang perlu disesuaikan secara manual saat rebrand/setup ke **BotKos**:

1. **Username Bot Telegram**:
   - Jika membuat/mengubah bot Telegram, ganti username bot di BotFather (misal: `@BotKos_bot` atau `@botkos_official_bot`).
2. **Nama Proyek di Convex Dashboard**:
   - Ganti nama deployment / project di [dashboard.convex.dev](https://dashboard.convex.dev) menjadi `botkos` atau sesuai project name Anda.
3. **Domain & DNS (`botkos.id`)**:
   - Arahkan DNS `botkos.id` di registrar domain ke server deployment (Vercel/Next.js hosting).

---

## Menjalankan Lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_CONVEX_URL` dan `CONVEX_SITE_URL`.
3. Jalankan `npm run dev`.
4. Jalankan `npx convex dev` setelah login ke Convex dan menyiapkan provider auth.

---

## Login Owner dengan Google OAuth

BotKos memakai Google OAuth untuk role `owner`. Buat OAuth Client ID bertipe Web application di Google Cloud Console, lalu tambahkan authorized redirect URI berikut:

```text
https://<CONVEX_SITE_URL>/api/auth/callback/google
```

Set secret pada deployment Convex:

```powershell
npx convex env set AUTH_GOOGLE_ID 'google-client-id'
npx convex env set AUTH_GOOGLE_SECRET 'google-client-secret'
npx convex env set SITE_URL 'http://localhost:3000'
```

Untuk production, ubah `SITE_URL` menjadi domain production (`https://botkos.id`) dan daftarkan redirect URI production yang sama pada Google Cloud Console. `NEXT_PUBLIC_APP_URL` menentukan link penyewa: saat development gunakan `http://localhost:3000`, saat production gunakan `https://botkos.id`.

## Admin, langganan, dan verifikasi

Untuk memberi akses admin, buka tabel `owners` di Convex Dashboard dan ubah field `role` akun menjadi `admin`. Halaman internal tersedia di `/admin` dan hanya dapat dibuka oleh role tersebut.

Billing subscription menggunakan transfer manual/QRIS dan review admin. Instruksi rekening/QRIS ditampilkan pada halaman `/dashboard/billing` dan perlu disesuaikan dengan rekening bisnis Anda sebelum production. Tidak ada payment gateway, auto-charge, auto-downgrade, atau pemblokiran fitur saat subscription `past_due` pada fase ini.

Foto kos minimal tiga gambar wajib saat onboarding. KTP, selfie, dan bukti kepemilikan properti tetap opsional dan hanya diperlukan bila owner ingin mengajukan review verifikasi.

Verifikasi:

```bash
npx tsc --noEmit
npm test
npm run build
```

---

## Environment Bot

Variable berikut harus diset pada environment Convex (`npx convex env set NAME value`), bukan hanya `.env.local`:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
META_APP_SECRET=
```

Jangan commit token asli. Rotate token jika pernah masuk log, screenshot, atau repository.

---

## Menjalankan Telegram Bot

1. Buka Telegram dan chat `@BotFather`.
2. Jalankan `/newbot`, pilih nama (misal `BotKos Assistant`) dan username (misal `@BotKos_bot`), lalu simpan token.
3. Buat secret acak untuk `TELEGRAM_WEBHOOK_SECRET`.
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

Hubungkan chat ID owner dari halaman Pengaturan BotKos. Saat bukti pembayaran masuk, bot mengirimkan notifikasi beserta tombol inline `Konfirmasi` dan `Tolak`.

---

## Menjalankan WhatsApp Business Bot

WhatsApp personal tidak cukup. Gunakan WhatsApp Business Platform / Cloud API resmi Meta.

1. Buka [Meta for Developers](https://developers.facebook.com/) dan buat App bertipe Business.
2. Tambahkan produk WhatsApp.
3. Siapkan WhatsApp Business Account, nomor bisnis, `Phone Number ID`, dan access token system user/permanent token untuk production.
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

Owner yang sudah menghubungkan chat Telegram/WhatsApp dapat mengirimkan command berikut:

```text
/status
/belum_bayar
/kamar_kosong
```

- `/status` menampilkan ringkasan kondisi properti kontekstual (diprioritaskan berdasarkan antrean verifikasi atau kamar kosong).
- `/belum_bayar` menampilkan tagihan sewa yang sudah jatuh tempo.
- `/kamar_kosong` menampilkan daftar kamar kosong beserta harga sewa bulanan.

---

## Catatan Tambahan

Konfirmasi pembayaran selalu manual oleh pemilik. BotKos tidak terhubung langsung ke mutasi rekening bank untuk alasan keamanan dan fleksibilitas pemilik kos.
