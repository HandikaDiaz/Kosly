"use client"

import { useState } from "react"
import { useConvex } from "convex/react"
import { api } from "@/convex/_generated/api"
import { truncateReviewText } from "@/convex/lib/reviewRules"

type PublicReview = { rating: number; text?: string; stayLabel: string; monthYear: string; ownerReply?: { text: string; monthYear: string } }
type PublicReviewPage = { reviews: PublicReview[]; nextCursor: string | null }
const Stars = ({ rating }: { rating: number }) => <span className="text-[var(--gold)]" aria-label={`${rating} dari 5`}>{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>

export function PublicReviews({ slug, initial, reviewCount, ratingAverage }: { slug: string; initial: PublicReviewPage; reviewCount: number; ratingAverage: number | null }) {
  const [reviews, setReviews] = useState(initial.reviews)
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const convex = useConvex()

  if (reviewCount === 0) return <p className="mt-4 text-sm text-[var(--ink-muted)]">Belum ada ulasan dari penghuni.</p>
  return <div>
    <div className="flex flex-wrap items-center gap-3">
      {ratingAverage !== null ? <><span className="text-2xl font-bold">{ratingAverage.toFixed(1)}</span><Stars rating={Math.round(ratingAverage)} /></> : null}
      <span className="text-sm text-[var(--ink-muted)]">{reviewCount} ulasan</span>
    </div>
    <details className="mt-4 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm"><summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wood)]">Bagaimana ulasan ini dikumpulkan?</summary><p className="mt-2 leading-6 text-[var(--ink-muted)]">Ulasan hanya bisa ditulis oleh penghuni yang tercatat tinggal di kos ini lewat BotKos, dan dikirim lewat link pribadi sekali pakai. Pemilik tidak bisa menghapus atau mengubah ulasan, hanya membalas.</p></details>
    <div className="mt-5 space-y-4">
      {reviews.map((review, index) => {
        const preview = review.text ? truncateReviewText(review.text) : null
        return <article key={`${review.monthYear}-${index}`} className="rounded-xl border border-[var(--line)] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><Stars rating={review.rating} /><time className="text-xs text-[var(--ink-muted)]">{review.monthYear}</time></div>{preview ? preview.truncated ? <details className="mt-3 text-sm leading-6"><summary className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wood)]">{preview.text} Baca selengkapnya</summary><p className="mt-2 whitespace-pre-wrap">{review.text}</p></details> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{review.text}</p> : null}<p className="mt-3 text-xs text-[var(--ink-muted)]">{review.stayLabel}</p>{review.ownerReply ? <div className="mt-4 border-l-2 border-[var(--wood)] pl-3"><p className="text-xs font-semibold">Balasan pemilik</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{review.ownerReply.text}</p><time className="mt-1 block text-xs text-[var(--ink-muted)]">{review.ownerReply.monthYear}</time></div> : null}</article>
      })}
    </div>
    {error ? <p role="alert" className="mt-3 text-sm text-[var(--warn)]">{error}</p> : null}
    {cursor ? <button type="button" disabled={loadingMore} onClick={async () => { if (!cursor) return; setLoadingMore(true); setError(null); try { const nextPage = await convex.query(api.reviews.listPublishedReviews, { slug, cursor, limit: 10 }); if (!nextPage) throw new Error("Ulasan berikutnya belum dapat dimuat."); setReviews((current) => [...current, ...nextPage.reviews]); setCursor(nextPage.nextCursor) } catch (reason) { setError(reason instanceof Error ? reason.message : "Ulasan berikutnya belum dapat dimuat. Coba lagi nanti.") } finally { setLoadingMore(false) } }} className="button-secondary mt-5 w-full">{loadingMore ? "Memuat…" : "Lihat ulasan lainnya"}</button> : null}
  </div>
}
