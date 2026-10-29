"use client"

import { CheckCircle2, Copy, ExternalLink, MessageCircle, Send, Unplug } from "lucide-react"
import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

type Channel = "telegram" | "whatsapp"

const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_BOT_TELEGRAM_USERNAME || "kosly_admin_bot"
const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`

const WHATSAPP_BOT_NUMBER = (
  process.env.NEXT_PUBLIC_BOT_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER ||
  "6289674745742"
).replace(/\D/g, "")
const WHATSAPP_BOT_URL = `https://wa.me/${WHATSAPP_BOT_NUMBER}?text=${encodeURIComponent(
  "Halo BotKos, saya ingin menghubungkan WhatsApp saya."
)}`

// ─── step data ───────────────────────────────────────────────────────────────

const TELEGRAM_STEPS = [
  {
    label: "Buka chat dengan @kosly_admin_bot di Telegram",
    description: (
      <>
        Buka aplikasi Telegram dan mulai chat dengan bot resmi BotKos:{" "}
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noreferrer"
          className="bot-card-link font-semibold text-[var(--gold-dark)]"
        >
          @{TELEGRAM_BOT_USERNAME} <ExternalLink size={11} className="inline" />
        </a>.
      </>
    ),
  },
  {
    label: "Mulai percakapan & dapatkan Chat ID Anda",
    description: (
      <>
        Klik tombol <strong>Start</strong> atau kirim pesan{" "}
        <code className="bot-card-code">/start</code> atau{" "}
        <code className="bot-card-code">/chatid</code> ke bot. Bot akan membalas
        dengan nomor <strong>Chat ID</strong> akun Anda (contoh:{" "}
        <code className="bot-card-code">123456789</code>).
      </>
    ),
  },
  {
    label: "Salin & Tempel Chat ID",
    description: "Salin deretan angka Chat ID tersebut dan masukkan ke kolom di bawah ini.",
  },
  {
    label: "Klik Hubungkan Telegram",
    description: "Tekan tombol Hubungkan. BotKos akan otomatis mengirimkan notifikasi transaksi & konfirmasi pembayaran ke Telegram Anda.",
  },
]

const WHATSAPP_STEPS = [
  {
    label: "Mulai chat dengan WhatsApp Bot (6289674745742)",
    description: (
      <>
        Mulai percakapan WhatsApp ke nomor bot{" "}
        <a
          href={WHATSAPP_BOT_URL}
          target="_blank"
          rel="noreferrer"
          className="bot-card-link font-semibold text-[var(--gold-dark)]"
        >
          +{WHATSAPP_BOT_NUMBER} <ExternalLink size={11} className="inline" />
        </a>. Kirim pesan pertama (misal: <em>Halo</em>) untuk memulai percakapan.
      </>
    ),
  },
  {
    label: "Format nomor ke kode negara",
    description: (
      <>
        Ubah awalan <code className="bot-card-code">08</code> nomor Anda menjadi kode negara{" "}
        <code className="bot-card-code">62</code> tanpa tanda <code className="bot-card-code">+</code> atau spasi. Contoh:{" "}
        <code className="bot-card-code">081234567890</code> &rarr;{" "}
        <code className="bot-card-code">6281234567890</code>.
      </>
    ),
  },
  {
    label: "Masukkan nomor & Hubungkan",
    description: "Ketik nomor WhatsApp yang sudah diformat ke kolom di bawah, lalu klik Hubungkan WhatsApp.",
  },
  {
    label: "Selesai & Siap Terima Notifikasi",
    description: "Setelah terhubung, bot BotKos akan otomatis mengirimkan notifikasi tagihan dan bukti bayar penyewa ke nomor WhatsApp Anda.",
  },
]

const BOTKOS_ABOUT = "BotKos adalah asisten pengelolaan kos untuk membantu owner memantau kamar, tenant, pembayaran, langganan, dan laporan langsung dari chat."

const COMMAND_PREVIEW = [
  ["help", "Daftar command"],
  ["status", "Ringkasan kos"],
  ["belum_bayar", "Tagihan tertunda"],
  ["kamar_kosong", "Kamar tersedia"],
  ["langganan", "Status tier"],
  ["upgrade", "Pilihan upgrade"],
] as const

// ─── step list component ─────────────────────────────────────────────────────

function StepList({ steps }: { steps: typeof TELEGRAM_STEPS }) {
  return (
    <ol className="bot-card-steps">
      {steps.map((step, i) => (
        <li key={i} className="bot-card-step">
          <span className="bot-card-step-num" aria-hidden="true">{i + 1}</span>
          <div className="bot-card-step-body">
            <p className="bot-card-step-label">{step.label}</p>
            <p className="bot-card-step-desc">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ─── main card ───────────────────────────────────────────────────────────────

export function BotChannelCard({ channel }: { channel: Channel }) {
  const links = useQuery(api.botLinks.listMine)
  const link = links?.find((item) => item.channel === channel)
  const connected = link?.status === "active"
  const isTelegram = channel === "telegram"

  const [chatId, setChatId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const connect = useMutation(api.botLinks.connect)
  const disconnect = useMutation(api.botLinks.disconnect)

  useEffect(() => { if (link?.chatId) setChatId(link.chatId) }, [link?.chatId])

  const handleConnect = async () => {
    try {
      setError(null)
      await connect({
        channel,
        chatId,
        displayName: isTelegram ? "Telegram owner" : "WhatsApp owner",
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Channel belum dapat dihubungkan.")
    }
  }

  const handleDisconnect = async () => {
    try {
      setError(null)
      await disconnect({ channel })
      setChatId("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Channel belum dapat diputuskan.")
    }
  }

  const handleCopyId = () => {
    if (!link?.chatId) return
    void navigator.clipboard.writeText(link.chatId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const steps = isTelegram ? TELEGRAM_STEPS : WHATSAPP_STEPS

  return (
    <div className="bot-card">
      {/* ── header ── */}
      <div className="bot-card-header">
        <span className="bot-card-icon">
          {isTelegram ? <Send size={18} /> : <MessageCircle size={18} />}
        </span>
        <div className="bot-card-title-wrap">
          <h2 className="bot-card-title">
            {isTelegram ? "Telegram" : "WhatsApp Business"}
          </h2>
          <p className="bot-card-subtitle">
            {isTelegram ? "Bot API dengan tombol konfirmasi" : "Cloud API resmi dari Meta"}
          </p>
        </div>
        {connected ? (
          <span className="bot-card-badge-connected">
            <CheckCircle2 size={13} />Terhubung
          </span>
        ) : (
          <span className="bot-card-badge-idle">Belum terhubung</span>
        )}
      </div>

      <div className="mx-5 mt-4 border border-[var(--line)] bg-[var(--background)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gold-dark)]">About BotKos</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{BOTKOS_ABOUT}</p>
        <details className="mt-3 text-sm text-[var(--ink-muted)]">
          <summary className="cursor-pointer font-medium text-[var(--ink)]">Lihat command utama</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {COMMAND_PREVIEW.map(([command, description]) => (
              <p key={command}><code className="bot-card-code">{isTelegram ? `/${command}` : command}</code> <span className="text-xs">{description}</span></p>
            ))}
          </div>
          <p className="mt-3 text-xs">Ketik {isTelegram ? <code className="bot-card-code">/help</code> : <code className="bot-card-code">help</code>} di chat untuk daftar lengkap.</p>
        </details>
        {isTelegram ? (
          <div className="mt-4">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="button-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Send size={13} className="text-sky-600" />
              <span>Chat @{TELEGRAM_BOT_USERNAME} di Telegram</span>
              <ExternalLink size={11} />
            </a>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              Kirim <code className="bot-card-code">/start</code> atau <code className="bot-card-code">/chatid</code> untuk mendapatkan Chat ID Anda.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <a
              href={WHATSAPP_BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="button-secondary inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50"
            >
              <MessageCircle size={14} className="text-emerald-600" />
              <span>Mulai Chat WhatsApp (+{WHATSAPP_BOT_NUMBER})</span>
              <ExternalLink size={11} />
            </a>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              Kirim pesan pertama untuk memulai percakapan: “Halo BotKos, saya ingin menghubungkan WhatsApp saya.”
            </p>
          </div>
        )}
      </div>

      {/* ── steps ── */}
      <div className="bot-card-steps-wrap">
        <p className="bot-card-steps-heading">Cara menghubungkan</p>
        <StepList steps={steps} />
      </div>

      {/* ── connect input ── */}
      <div className="bot-card-connect">
        <label className="bot-card-input-label" htmlFor={`${channel}-chat-id`}>
          {isTelegram ? "Chat ID Telegram" : "Nomor WhatsApp (format internasional)"}
        </label>
        {connected && link?.chatId ? (
          <div className="bot-card-connected-id">
            <code className="bot-card-id-value">{link.chatId}</code>
            <button
              type="button"
              aria-label="Salin ID"
              onClick={handleCopyId}
              className="bot-card-copy-btn"
            >
              <Copy size={13} />
              {copied ? "Tersalin!" : "Salin"}
            </button>
          </div>
        ) : (
          <input
            className="field-input"
            id={`${channel}-chat-id`}
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder={isTelegram ? "Contoh: 123456789" : "Contoh: 628123456789"}
            disabled={connected}
          />
        )}

        {error && <p className="bot-card-error" role="alert">{error}</p>}

        <div className="bot-card-actions">
          {connected ? (
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              className="button-secondary"
            >
              <Unplug size={15} />
              Putuskan koneksi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={!chatId.trim()}
              className="button-primary"
            >
              Hubungkan {isTelegram ? "Telegram" : "WhatsApp"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
