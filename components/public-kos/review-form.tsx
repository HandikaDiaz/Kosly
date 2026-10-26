"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HeartHandshake,
  LoaderCircle,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { MAX_REVIEW_CHARS } from "@/convex/lib/reviewRules"

const RATING_LABELS: Record<number, { title: string; hint: string }> = {
  1: { title: "Sangat Buruk", hint: "Banyak kendala dan tidak sesuai harapan" },
  2: { title: "Kurang Memuaskan", hint: "Ada beberapa hal penting yang perlu diperbaiki" },
  3: { title: "Cukup Baik", hint: "Sesuai standar umum tanpa kelebihan khusus" },
  4: { title: "Bagus & Nyaman", hint: "Pengalaman tinggal menyenangkan dan terawat" },
  5: { title: "Sangat Memuaskan", hint: "Luar biasa! Sangat direkomendasikan untuk penghuni lain" },
}

export function ReviewForm({ token, propertyName, stayLabel }: { token: string; propertyName?: string; stayLabel?: string }) {
  const submitReview = useMutation(api.reviews.submitReview)
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeRating = hoverRating || rating
  const selectedMeta = activeRating ? RATING_LABELS[activeRating] : null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)

    if (rating < 1 || rating > 5) {
      setError("Silakan berikan rating bintang 1 sampai 5 terlebih dahulu.")
      return
    }

    setIsSubmitting(true)
    try {
      await submitReview({ token, rating, ...(text.trim() ? { text: text.trim() } : {}) })
      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Ulasan belum dapat dikirim. Silakan coba kembali sesaat lagi."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-sm">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink)]">
          Terima Kasih Atas Ulasanmu!
        </h3>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-6 text-[var(--ink-muted)]">
          Ulasanmu telah berhasil dicatat secara anonim dan terverifikasi di ekosistem BotKos. Suaramu sangat berharga untuk calon penghuni lainnya.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--gold-dark)]">
            <ShieldCheck size={16} />
            <span>Terverifikasi Riwayat Tinggal</span>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Ulasan terdaftar dengan label: <span className="font-medium text-[var(--ink)]">{stayLabel ?? "Masa tinggal terverifikasi"}</span>
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="button-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Ke Beranda BotKos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      {/* ── Star Rating Section ── */}
      <fieldset className="rounded-2xl border border-[var(--line)] bg-[var(--background)]/60 p-5">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-semibold text-[var(--ink)]">
            Rating Pengalaman Tinggal <span className="text-[var(--warn)]">*</span>
          </legend>
          {activeRating > 0 && (
            <span className="text-xs font-semibold text-[var(--gold-dark)]">
              {activeRating} / 5 Bintang
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2.5 sm:gap-3.5" role="radiogroup" aria-label="Rating bintang">
          {[1, 2, 3, 4, 5].map((value) => {
            const isFilled = value <= activeRating
            return (
              <label
                key={value}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                className="group relative cursor-pointer p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  aria-label={`${value} dari 5 bintang`}
                />
                <Star
                  size={36}
                  className={`transition-colors duration-150 ${
                    isFilled
                      ? "fill-[var(--gold)] text-[var(--gold)] drop-shadow-[0_2px_8px_rgba(178,130,54,0.35)]"
                      : "fill-transparent text-[var(--line)] group-hover:text-[var(--gold-light)]"
                  }`}
                />
              </label>
            )
          })}
        </div>

        {/* Rating description hint */}
        <div className="mt-3 min-h-[2.5rem] text-center transition-all">
          {selectedMeta ? (
            <div className="animate-in fade-in duration-200">
              <p className="text-sm font-semibold text-[var(--ink)]">{selectedMeta.title}</p>
              <p className="text-xs text-[var(--ink-muted)]">{selectedMeta.hint}</p>
            </div>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">Sentuh atau arahkan kursor ke bintang untuk memilih nilai</p>
          )}
        </div>
      </fieldset>

      {/* ── Story / Feedback Section ── */}
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="review-text" className="text-sm font-semibold text-[var(--ink)]">
            Ceritakan Pengalamanmu{" "}
            <span className="font-normal text-xs text-[var(--ink-muted)]">(Opsional)</span>
          </label>
          <span
            className={`text-xs tabular-nums ${
              text.length >= MAX_REVIEW_CHARS - 30
                ? "font-semibold text-[var(--warn)]"
                : "text-[var(--ink-muted)]"
            }`}
          >
            {text.length}/{MAX_REVIEW_CHARS}
          </span>
        </div>

        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Bagikan hal positif atau masukan yang bermanfaat: kebersihan kamar, keramahan pengelola, kecepatan wifi, dsb.
        </p>

        <textarea
          id="review-text"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_REVIEW_CHARS))}
          maxLength={MAX_REVIEW_CHARS}
          rows={5}
          placeholder="Tulis ulasan Anda di sini secara jujur dan objektif..."
          className="field-input mt-2.5 min-h-[120px] resize-y leading-6"
        />
      </div>

      {/* ── Trust & Anonymity Assurance ── */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs leading-5 text-emerald-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        <p>
          <strong className="font-semibold text-emerald-950">Privasi Terjaga:</strong> Nama dan nomor kontak Anda tidak dipublikasikan. Hindari menyebut detail identitas pribadi di dalam teks ulasan.
        </p>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-in fade-in duration-150"
        >
          {error}
        </div>
      )}

      {/* ── Submit Button ── */}
      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            <span>Mengirim Ulasan…</span>
          </>
        ) : (
          <>
            <Send size={16} />
            <span>Kirim Ulasan Sekarang</span>
          </>
        )}
      </button>
    </form>
  )
}
