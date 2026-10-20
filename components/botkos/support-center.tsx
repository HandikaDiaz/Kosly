"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bug, CheckCircle2, Lightbulb, LoaderCircle, MessageCircle, Send } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "./empty-state"
import { FieldLabel } from "./field-label"
import { StatusBadge } from "./status-badge"
import { PageLoader } from "./page-loader"
import { BotKosLogo } from "./botkos-logo"
import { FAQ_ITEMS } from "@/lib/faq"

const categoryOptions = [
  { value: "bug", label: "Bug", description: "Ada yang tidak berfungsi semestinya.", icon: Bug },
  { value: "masukan", label: "Masukan", description: "Ide untuk membuat BotKos lebih baik.", icon: Lightbulb },
  { value: "lain_lain", label: "Lain-lain", description: "Pertanyaan atau kebutuhan lainnya.", icon: MessageCircle },
] as const

export function SupportCenter() {
  const role = useQuery(api.owners.getCurrentRole)
  const isOwner = role === "owner"
  const tickets = useQuery(api.supportTickets.listMine, isOwner ? {} : "skip")
  const createTicket = useMutation(api.supportTickets.create)
  const [category, setCategory] = useState<(typeof categoryOptions)[number]["value"]>("bug")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedCategory = categoryOptions.find((item) => item.value === category) ?? categoryOptions[0]

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setSubmitted(false)
    setIsSubmitting(true)

    try {
      await createTicket({
        ...(isOwner ? {} : { name, contactEmail: email }),
        category,
        subject,
        message,
      })
      setSubject("")
      setMessage("")
      if (!isOwner) {
        setName("")
        setEmail("")
      }
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tiket belum dapat dikirim.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-[var(--background)] px-5 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* ── Top Navigation ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--gold-dark)]"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
          <Link href="/" aria-label="BotKos">
            <BotKosLogo size={28} />
          </Link>
        </div>

        <header className="mt-10 max-w-2xl">
          <p className="text-sm font-semibold text-[var(--gold-dark)]">Pusat Bantuan</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Temukan jawaban atau kirim tiket.</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)] sm:text-base">Cari jawaban cepat dari FAQ, atau ceritakan hal yang perlu dibantu oleh tim BotKos.</p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <section>
            <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
              <div>
                <p className="text-sm text-[var(--ink-muted)]">Pertanyaan umum</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">FAQ BotKos</h2>
              </div>
              <Link
                href="/faq"
                className="text-xs font-semibold text-[var(--gold-dark)] hover:underline"
              >
                Lihat di halaman FAQ →
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group border-b border-[var(--line)] py-3.5">
                  <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-[var(--ink)] marker:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <span>{item.question}</span>
                      <span className="shrink-0 text-base font-light text-[var(--gold-dark)] transition group-open:rotate-45">+</span>
                    </div>
                    <span className="mt-1 inline-block rounded bg-[var(--gold-pale)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--gold-dark)]">
                      {item.category}
                    </span>
                  </summary>
                  <p className="mt-2.5 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden border border-[var(--line)] bg-white shadow-[0_18px_40px_-32px_rgba(43,30,15,0.55)]">
            <div className="h-1 bg-[var(--gold)]" />
            <div className="p-6 sm:p-8">
              <div className="flex gap-4 border-b border-[var(--line)] pb-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold-pale)] text-[var(--gold-dark)]">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-[var(--ink-muted)]">{isOwner ? "Bantuan akun" : "Hubungi kami"}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Ajukan tiket</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {isOwner ? "Ceritakan kebutuhan Anda. Tiket akan otomatis terhubung ke akun ini." : "Berikan detail yang cukup agar tim kami dapat menindaklanjuti dengan tepat."}
                  </p>
                </div>
              </div>

              <form className="mt-7 space-y-8" onSubmit={(event) => void submit(event)}>
                {!isOwner ? (
                  <fieldset>
                    <legend className="text-sm font-semibold text-[var(--ink)]">Tentang Anda</legend>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">Kami menggunakan informasi ini hanya untuk menindaklanjuti tiket Anda.</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="support-name" label="Nama" required />
                        <input id="support-name" value={name} onChange={(event) => setName(event.target.value)} required className="field-input mt-2" placeholder="Nama Anda" />
                      </div>
                      <div>
                        <FieldLabel htmlFor="support-email" label="Email" required />
                        <input id="support-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="field-input mt-2" placeholder="nama@email.com" />
                      </div>
                    </div>
                  </fieldset>
                ) : (
                  <div className="flex gap-3 border border-[#6B8F71]/30 bg-[#6B8F71]/5 px-4 py-3 text-sm leading-6 text-[#527259]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>Tiket dikirim dari akun Anda. Nama, email, dan prioritas paket akan tercatat otomatis.</p>
                  </div>
                )}

                <fieldset>
                  <FieldLabel htmlFor="support-category-bug" label="Jenis bantuan" required hint={selectedCategory.description} />
                  <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Jenis bantuan">
                    {categoryOptions.map((item) => {
                      const Icon = item.icon
                      const isSelected = item.value === category

                      return (
                        <label key={item.value} className={`cursor-pointer border p-4 transition ${isSelected ? "border-[var(--gold)] bg-[var(--gold-pale)] shadow-[inset_0_0_0_1px_var(--gold)]" : "border-[var(--line)] bg-white hover:border-[var(--gold)]/60 hover:bg-[var(--gold-pale)]/40"}`}>
                          <input id={`support-category-${item.value}`} type="radio" name="support-category" value={item.value} checked={isSelected} onChange={() => setCategory(item.value)} className="sr-only" />
                          <Icon className={`size-4 ${isSelected ? "text-[var(--gold-dark)]" : "text-[var(--ink-muted)]"}`} aria-hidden="true" />
                          <span className="mt-3 block text-sm font-semibold text-[var(--ink)]">{item.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{item.description}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <fieldset className="border-t border-[var(--line)] pt-6">
                  <legend className="text-sm font-semibold text-[var(--ink)]">Ceritakan kebutuhan Anda</legend>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">Sertakan langkah yang Anda lakukan, hasil yang muncul, atau konteks penting lainnya.</p>
                  <div className="mt-5">
                    <FieldLabel htmlFor="support-subject" label="Subjek" required />
                    <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={160} className="field-input mt-2" placeholder="Contoh: Tombol konfirmasi pembayaran tidak merespons" />
                  </div>
                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-4">
                      <FieldLabel htmlFor="support-message" label="Pesan" required />
                      <span className="text-xs tabular-nums text-[var(--ink-faint)]">{message.length}/4000</span>
                    </div>
                    <textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={4000} rows={7} className="field-input mt-2 min-h-40 resize-y leading-6" placeholder="Jelaskan detail yang perlu kami ketahui..." />
                  </div>
                </fieldset>

                <div className="border-t border-[var(--line)] pt-5">
                  {error ? <p role="alert" className="mb-4 border-l-2 border-[var(--warn)] bg-[#C1502E]/5 px-4 py-3 text-sm leading-6 text-[var(--warn)]">{error}</p> : null}
                  {submitted ? <p role="status" className="mb-4 flex gap-2 border-l-2 border-[#6B8F71] bg-[#6B8F71]/5 px-4 py-3 text-sm leading-6 text-[#527259]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Tiket berhasil dikirim. Admin akan meninjau pesan Anda.</p> : null}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-[var(--ink-muted)]">Kami meninjau tiket Growth dan Pro pada hari yang sama.</p>
                    <button type="submit" disabled={isSubmitting} className="button-primary inline-flex min-h-11 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                      {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                      {isSubmitting ? "Mengirim..." : "Kirim tiket"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>

        {isOwner ? (
          <section className="mt-14">
            <div className="border-b border-[var(--line)] pb-4">
              <p className="text-sm text-[var(--ink-muted)]">Riwayat dukungan</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Tiket Saya</h2>
            </div>
            <div className="mt-5 space-y-3">
              {tickets === undefined ? (
                <PageLoader variant="inline" size="sm" message="Memuat riwayat tiket…" />
              ) : tickets.length === 0 ? (
                <EmptyState title="Belum ada tiket" description="Tiket yang Anda ajukan akan muncul di sini bersama balasan admin." />
              ) : tickets.map((ticket) => (
                <article key={ticket._id} className="border border-[var(--line)] bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs text-[var(--ink-muted)]">{ticket.category} · {new Date(ticket.createdAt).toLocaleDateString("id-ID")}</p>
                      <h3 className="mt-1 font-semibold text-[var(--ink)]">{ticket.subject}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{ticket.message}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  {ticket.replies.length ? <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">{ticket.replies.map((reply) => <div key={reply._id} className="bg-[var(--background)] p-3 text-sm leading-6"><p className="font-semibold text-[var(--ink)]">{reply.sender === "admin" ? "Admin BotKos" : "Anda"}</p><p className="text-[var(--ink-muted)]">{reply.message}</p></div>)}</div> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
