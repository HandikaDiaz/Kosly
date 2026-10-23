"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import { MAX_REVIEW_CHARS } from "@/convex/lib/reviewRules"

export function ReviewForm({ token }: { token: string }) {
  const submitReview = useMutation(api.reviews.submitReview)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    if (rating < 1 || rating > 5) {
      setError("Pilih rating bintang 1 sampai 5.")
      return
    }
    setIsSubmitting(true)
    try {
      await submitReview({ token, rating, ...(text ? { text } : {}) })
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ulasan belum dapat dikirim. Coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900" role="status">Terima kasih, ulasanmu sudah diterima.</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="text-sm font-semibold">Rating pengalamanmu</legend>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rating bintang">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="group cursor-pointer">
              <input className="peer sr-only" type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} dari 5 bintang`} />
              <span className="block rounded-lg border border-[var(--line)] px-3 py-2 text-2xl leading-none text-[var(--ink-muted)] outline-none transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--wood)] peer-checked:border-[var(--wood)] peer-checked:bg-[var(--secondary)] peer-checked:text-[var(--wood)]" aria-hidden="true">★</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-text" className="text-sm font-semibold">Ceritakan pengalamanmu <span className="font-normal text-[var(--ink-muted)]">(opsional)</span></label>
        <textarea id="review-text" value={text} onChange={(event) => setText(event.target.value.slice(0, MAX_REVIEW_CHARS))} maxLength={MAX_REVIEW_CHARS} rows={6} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm outline-none focus:border-[var(--wood)] focus:ring-2 focus:ring-[var(--wood)]/20" />
        <p className="mt-1 text-right text-xs text-[var(--ink-muted)]">{text.length}/{MAX_REVIEW_CHARS}</p>
      </div>

      <p className="text-xs leading-5 text-[var(--ink-muted)]">Namamu tidak ditampilkan. Pemilik kos mungkin bisa menebak dari isi ulasan, jadi hindari menulis data pribadi.</p>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <button type="submit" disabled={isSubmitting} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Mengirim…" : "Kirim ulasan"}</button>
    </form>
  )
}
