import { BotChannelCard } from "@/components/botkos/bot-channel-card"
import { Bell, MessageCircle, Send } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">

        {/* ── Page header ── */}
        <p className="text-sm text-[var(--ink-muted)]">Pengaturan</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Notifikasi chatbot
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
          Hubungkan akun BotKos ke Telegram atau WhatsApp supaya Anda mendapat
          notifikasi langsung saat penyewa mengirim bukti pembayaran baru,
          tanpa perlu membuka dashboard. Pilih salah satu atau keduanya.
        </p>

        {/* Info banner */}
        <div className="mt-7 flex gap-3 border border-[var(--line)] bg-[#FFFFFF] p-4 shadow-sm">
          <Bell size={16} className="mt-0.5 shrink-0 text-[var(--gold)]" />
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            BotKos menggunakan <strong className="text-[var(--ink)]">API resmi</strong>:
            Telegram Bot API dan WhatsApp Cloud API dari Meta. Bukan WhatsApp Web
            pribadi atau automasi tidak resmi.
          </p>
        </div>

        {/* ── Channel cards ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <BotChannelCard channel="telegram" />
          <BotChannelCard channel="whatsapp" />
        </div>

        {/* ── After setup checklist ── */}
        <section className="mt-10 border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
          <h2 className="font-semibold text-[var(--ink)]">Verifikasi setelah terhubung</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Pastikan semuanya berjalan sebelum digunakan penyewa nyata.
          </p>
          <ol className="mt-5 space-y-4">
            {[
              {
                icon: <Send size={14} className="text-[var(--gold)]" />,
                text: "Upload bukti pembayaran percobaan dari halaman penyewa mana saja.",
              },
              {
                icon: <Bell size={14} className="text-[var(--gold)]" />,
                text: "Pastikan notifikasi masuk ke Telegram atau WhatsApp Anda dalam beberapa detik.",
              },
              {
                icon: <MessageCircle size={14} className="text-[var(--gold)]" />,
                text: "Di Telegram: klik tombol Konfirmasi atau Tolak dari pesan bot untuk mengubah status di dashboard.",
              },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-6 text-[var(--ink-muted)]">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--background)]">
                  {item.icon}
                </span>
                {item.text}
              </li>
            ))}
          </ol>
        </section>

      </div>
    </div>
  )
}
