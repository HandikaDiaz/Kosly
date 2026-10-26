"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { api } from "@/convex/_generated/api"

export const TenantIdentityStart = () => {
  const start = useMutation(api.tenantIdentity.startVerification)
  const claim = useMutation(api.tenantIdentity.claimVerifiedSession)
  const [challenge, setChallenge] = useState<{
    challengeId: string
    pollSecret: string
    code: string
    expiresAt: number
    botLinks: { telegram?: string; whatsapp?: string }
  } | null>(null)
  const [noticeAccepted, setNoticeAccepted] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = useQuery(
    api.tenantIdentity.getChallengeStatus,
    challenge
      ? { challengeId: challenge.challengeId as never, pollSecret: challenge.pollSecret }
      : "skip"
  )

  useEffect(() => {
    if (status?.status !== "verified" || !challenge) return
    void claim({ challengeId: challenge.challengeId as never, pollSecret: challenge.pollSecret })
      .then(async ({ token }) => {
        await fetch("/api/penghuni/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        })
        window.location.reload()
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Sesi gagal dibuat.")
      )
  }, [challenge, claim, status?.status])

  const begin = async () => {
    setError(null)
    setIsStarting(true)
    try {
      const res = await start({ noticeAccepted })
      setChallenge(res)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verifikasi gagal dimulai.")
    } finally {
      setIsStarting(false)
    }
  }

  const handleCopy = async () => {
    if (!challenge?.code) return
    try {
      await navigator.clipboard.writeText(challenge.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  if (!challenge) {
    return (
      <div className="space-y-6">
        {/* Step Guide */}
        <div className="grid gap-3 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-dark)]">
              1
            </span>
            <p className="mt-2 text-xs font-semibold text-[var(--ink)]">Setujui Privasi</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--ink-muted)]">
              Nomor Anda hanya dipakai untuk pencocokan data sewa.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-dark)]">
              2
            </span>
            <p className="mt-2 text-xs font-semibold text-[var(--ink)]">Dapatkan Kode</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--ink-muted)]">
              Sistem akan membuatkan kode unik 6-karakter.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-dark)]">
              3
            </span>
            <p className="mt-2 text-xs font-semibold text-[var(--ink)]">Kirim ke Bot</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--ink-muted)]">
              Kirim kode ke bot WhatsApp atau Telegram BotKos.
            </p>
          </div>
        </div>

        {/* Notice Checkbox */}
        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noticeAccepted}
              onChange={(event) => setNoticeAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--line)] text-[var(--wood)] focus:ring-[var(--wood)]"
            />
            <span className="text-xs leading-5 text-[var(--ink-muted)]">
              Saya memahami dan menyetujui bahwa <strong className="text-[var(--ink)] font-semibold">BotKos</strong> hanya menggunakan nomor telepon saya untuk mencocokkan riwayat sewa aktif, verifikasi pembayaran, dan pembuatan Rapor Penghuni.
            </span>
          </label>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!noticeAccepted || isStarting}
          onClick={begin}
          className="button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStarting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              <span>Membuat Kode Verifikasi…</span>
            </>
          ) : (
            <>
              <span>Mulai Verifikasi Nomor</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-center animate-in fade-in duration-200">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--background)] p-6">
        <p className="text-xs font-semibold text-[var(--gold-dark)] uppercase tracking-wider">
          Kode Verifikasi Anda
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Kirim kode ini ke bot BotKos via WhatsApp atau Telegram. Berlaku selama 10 menit.
        </p>

        {/* Monospace Code with Copy Button */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <div className="rounded-2xl border-2 border-[var(--gold)]/40 bg-white px-6 py-3 font-mono text-3xl font-extrabold tracking-widest text-[var(--ink)] shadow-sm">
            {challenge.code}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3.5 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:bg-[var(--background)]"
            title="Salin kode"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-600" />
                <span className="text-emerald-600">Tersalin</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>

        {/* Bot Links Buttons */}
        {(() => {
          const whatsappUrl =
            challenge.botLinks.whatsapp ||
            `https://wa.me/${(process.env.NEXT_PUBLIC_BOT_WHATSAPP_NUMBER || "6289674745742").replace(/\D/g, "")}?text=${encodeURIComponent(challenge.code)}`
          const telegramUrl =
            challenge.botLinks.telegram ||
            `https://t.me/${(process.env.NEXT_PUBLIC_BOT_TELEGRAM_USERNAME || "kosly_admin_bot").replace(/^@/, "")}?start=verify_${challenge.code}`

          return (
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MessageCircle size={16} />
                <span>Kirim via WhatsApp Bot</span>
                <ExternalLink size={13} className="opacity-70" />
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
              >
                <Send size={16} />
                <span>Kirim via Telegram Bot</span>
                <ExternalLink size={13} className="opacity-70" />
              </a>
            </div>
          )
        })()}
      </div>

      {/* Live Polling Status */}
      <div className="flex items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
        {status?.status === "verified" ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 size={15} />
            Verifikasi berhasil! Mengalihkan ke dashboard…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gold)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gold-dark)]" />
            </span>
            <span>Menunggu pengiriman pesan ke bot…</span>
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          {error}
        </div>
      )}
    </div>
  )
}
