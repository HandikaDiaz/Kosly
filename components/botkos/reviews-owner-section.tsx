"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MAX_REPLY_CHARS } from "@/convex/lib/reviewRules"

const reasons = ["tidak_pernah_menginap", "isi_menyerang_atau_palsu", "data_pribadi", "lainnya"] as const
const monthYear = (timestamp: number) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(timestamp))

export function ReviewsOwnerSection({ propertyId }: { propertyId: Id<"properties"> }) {
  const reviews = useQuery(api.reviews.ownerListReviews, { propertyId })
  const reply = useMutation(api.reviews.ownerReplyToReview)
  const report = useMutation(api.reviews.reportReview)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({})
  const [reportReasons, setReportReasons] = useState<Record<string, (typeof reasons)[number]>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const summary = useMemo(() => {
    const items = reviews ?? []
    return { count: items.length, average: items.length ? (items.reduce((total, item) => total + item.rating, 0) / items.length).toFixed(1) : "0.0", unanswered: items.filter((item) => !item.ownerReply).length }
  }, [reviews])

  if (!reviews) return null
  const submitReply = async (reviewId: Id<"reviews">) => {
    if (!window.confirm("Balasan akan dikirim dan tidak bisa diedit atau dihapus setelah dikirim. Lanjutkan?")) return
    setBusy(String(reviewId)); setError(null); setNotice(null)
    try { await reply({ reviewId, text: replyTexts[String(reviewId)] ?? "" }); setReplyTexts((current) => ({ ...current, [String(reviewId)]: "" })); setNotice("Balasan berhasil dikirim.") } catch (reason) { setError(reason instanceof Error ? reason.message : "Balasan belum dapat dikirim.") } finally { setBusy(null) }
  }
  const submitReport = async (reviewId: Id<"reviews">) => {
    setBusy(`report-${String(reviewId)}`); setError(null); setNotice(null)
    try { await report({ reviewId, reason: reportReasons[String(reviewId)] ?? "lainnya", ...(reportNotes[String(reviewId)] ? { note: reportNotes[String(reviewId)] } : {}) }); setNotice("Laporan terkirim.") } catch (reason) { setError(reason instanceof Error ? reason.message : "Laporan belum dapat dikirim.") } finally { setBusy(null) }
  }

  return <section className="mt-8 border border-[var(--line)] bg-[#fffefa] p-5 sm:p-6"><div><p className="text-sm text-[var(--ink-muted)]">Kepercayaan penghuni</p><h2 className="mt-1 text-xl font-semibold">Ulasan penghuni</h2><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="border border-[var(--line)] p-3"><p className="text-xl font-bold">{summary.count}</p><p className="text-xs text-[var(--ink-muted)]">Total</p></div><div className="border border-[var(--line)] p-3"><p className="text-xl font-bold">{summary.average}</p><p className="text-xs text-[var(--ink-muted)]">Rata-rata</p></div><div className="border border-[var(--line)] p-3"><p className="text-xl font-bold">{summary.unanswered}</p><p className="text-xs text-[var(--ink-muted)]">Belum dibalas</p></div></div></div>{notice ? <p className="mt-4 text-sm text-[var(--sage)]">{notice}</p> : null}{error ? <p role="alert" className="mt-4 text-sm text-[var(--warn)]">{error}</p> : null}<div className="mt-5 space-y-4">{reviews.map((item) => <article key={String(item.reviewId)} className="border border-[var(--line)] bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><span className="text-[var(--gold)]" aria-label={`${item.rating} dari 5`}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span><span className="text-xs text-[var(--ink-muted)]">{monthYear(item.createdAt)} · {item.status}</span></div>{item.text ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.text}</p> : null}<p className="mt-2 text-xs text-[var(--ink-muted)]">{item.stayLabel}</p>{item.ownerReply ? <div className="mt-4 border-l-2 border-[var(--wood)] pl-3"><p className="text-xs font-semibold">Balasan pemilik</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.ownerReply.text}</p></div> : <div className="mt-4"><label className="text-xs font-semibold" htmlFor={`reply-${String(item.reviewId)}`}>Balas ulasan</label><textarea id={`reply-${String(item.reviewId)}`} value={replyTexts[String(item.reviewId)] ?? ""} onChange={(event) => setReplyTexts((current) => ({ ...current, [String(item.reviewId)]: event.target.value.slice(0, MAX_REPLY_CHARS) }))} maxLength={MAX_REPLY_CHARS} rows={3} className="field-input mt-2" /><p className="mt-1 text-right text-xs text-[var(--ink-muted)]">{(replyTexts[String(item.reviewId)] ?? "").length}/{MAX_REPLY_CHARS}</p><button type="button" disabled={busy === String(item.reviewId)} onClick={() => void submitReply(item.reviewId)} className="button-secondary mt-2">{busy === String(item.reviewId) ? "Mengirim…" : "Kirim balasan"}</button></div>}<details className="mt-4 border-t border-[var(--line)] pt-3"><summary className="cursor-pointer text-xs font-semibold">Laporkan ulasan</summary>{item.alreadyReported ? <p className="mt-2 text-sm text-[var(--sage)]">Laporan terkirim</p> : <div className="mt-3 space-y-2"><label className="block text-xs">Alasan<select value={reportReasons[String(item.reviewId)] ?? "lainnya"} onChange={(event) => setReportReasons((current) => ({ ...current, [String(item.reviewId)]: event.target.value as (typeof reasons)[number] }))} className="field-input mt-1">{reasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}</select></label><textarea value={reportNotes[String(item.reviewId)] ?? ""} onChange={(event) => setReportNotes((current) => ({ ...current, [String(item.reviewId)]: event.target.value }))} rows={2} placeholder="Catatan opsional" className="field-input" /><p className="text-xs text-[var(--ink-muted)]">Laporan ditinjau oleh tim BotKos. Ulasan tidak otomatis disembunyikan.</p><button type="button" disabled={busy === `report-${String(item.reviewId)}`} onClick={() => void submitReport(item.reviewId)} className="button-secondary">{busy === `report-${String(item.reviewId)}` ? "Mengirim…" : "Kirim laporan"}</button></div>}</details></article>)}</div></section>
}
