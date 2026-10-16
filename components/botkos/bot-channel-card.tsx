"use client"

import { CheckCircle2, Copy, ExternalLink, MessageCircle, Send, Unplug } from "lucide-react"
import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

type Channel = "telegram" | "whatsapp"

// ─── step data ───────────────────────────────────────────────────────────────

const TELEGRAM_STEPS = [
  {
    label: "Buka Telegram & cari bot ID",
    description: (
      <>
        Buka aplikasi Telegram, lalu cari{" "}
        <a
          href="https://t.me/userinfobot"
          target="_blank"
          rel="noreferrer"
          className="bot-card-link"
        >
          @userinfobot <ExternalLink size={11} className="inline" />
        </a>{" "}
        atau bot Telegram resmi BotKos.
      </>
    ),
  },
  {
    label: "Dapatkan Chat ID Anda",
    description: (
      <>
        Kirim pesan apa saja ke <code className="bot-card-code">@userinfobot</code>. Bot
        akan membalas dengan rincian akun Anda, termasuk baris <strong>Id</strong> (contoh:{" "}
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
    label: "Siapkan nomor WhatsApp aktif",
    description: "Gunakan nomor WhatsApp aktif Anda (pemilik kos) yang akan menerima laporan pembayaran penyewa.",
  },
  {
    label: "Format nomor ke kode negara",
    description: (
      <>
        Ubah awalan <code className="bot-card-code">08</code> menjadi kode negara{" "}
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
    label: "Sapa bot BotKos di WhatsApp",
    description: "Buka nomor WhatsApp bot BotKos dan kirim pesan pertama (misal: Halo) agar bot mendapatkan izin mengirimkan notifikasi otomatis ke nomor Anda.",
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
  const whatsappBotNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.replace(/\D/g, "")
  const whatsappChatUrl = whatsappBotNumber
    ? `https://wa.me/${whatsappBotNumber}?text=${encodeURIComponent("Halo BotKos, saya ingin menghubungkan WhatsApp saya.")}`
    : undefined

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
        {!isTelegram && (
          <div className="mt-4">
            {whatsappChatUrl ? (
              <a href={whatsappChatUrl} target="_blank" rel="noreferrer" className="bot-card-link inline-flex items-center gap-1">
                Chat BotKos di WhatsApp <ExternalLink size={11} />
              </a>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">Tautan chat WhatsApp akan tampil setelah nomor bot dikonfigurasi.</p>
            )}
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Pesan awal yang direkomendasikan: “Halo BotKos, saya ingin menghubungkan WhatsApp saya.”</p>
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
