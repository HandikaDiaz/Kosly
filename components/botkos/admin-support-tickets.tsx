"use client"

import { useState } from "react"
import { CalendarDays, CheckCircle2, Inbox, LoaderCircle, Mail, MessageSquareText, Send, UserRound } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { EmptyState } from "./empty-state"
import { FieldLabel } from "./field-label"
import { StatusBadge } from "./status-badge"
import { PageLoader } from "./page-loader"

const statuses = ["all", "open", "in_progress", "resolved", "closed"] as const
const categories = ["all", "bug", "masukan", "lain_lain"] as const
type TicketStatus = Exclude<(typeof statuses)[number], "all">

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Tetap terbuka" },
  { value: "in_progress", label: "Sedang ditangani" },
  { value: "resolved", label: "Selesai" },
  { value: "closed", label: "Ditutup" },
]

const categoryLabel = (category: (typeof categories)[number]) => {
  if (category === "lain_lain") return "Lain-lain"
  if (category === "masukan") return "Masukan"
  if (category === "bug") return "Bug"
  return "Semua kategori"
}

const dateTime = (timestamp: number) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(timestamp)

export function AdminSupportTickets() {
  const [status, setStatus] = useState<(typeof statuses)[number]>("all")
  const [category, setCategory] = useState<(typeof categories)[number]>("all")
  const [selectedId, setSelectedId] = useState<Id<"support_tickets"> | null>(null)
  const [reply, setReply] = useState("")
  const [replyStatus, setReplyStatus] = useState<TicketStatus>("in_progress")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tickets = useQuery(api.supportTickets.listAdmin, {
    ...(status === "all" ? {} : { status }),
    ...(category === "all" ? {} : { category }),
  })
  const detail = useQuery(api.supportTickets.getAdminDetail, selectedId ? { ticketId: selectedId } : "skip")
  const replyAsAdmin = useMutation(api.supportTickets.replyAsAdmin)

  const submitReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      await replyAsAdmin({ ticketId: selectedId, message: reply, status: replyStatus })
      setReply("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Balasan belum dapat disimpan.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">Operasional internal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Tiket bantuan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">Tiket Growth dan Pro yang masih terbuka otomatis diprioritaskan di urutan teratas.</p>
        </div>
        <div className="flex items-center gap-2 self-start border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-muted)] lg:self-auto">
          <Inbox className="size-4 text-[var(--gold-dark)]" aria-hidden="true" />
          {tickets === undefined ? "Memuat antrean" : `${tickets.length} tiket ditampilkan`}
        </div>
      </header>

      <section className="mt-6 flex flex-col gap-4 border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Saring antrean</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Persempit daftar tiket yang perlu ditangani.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="ticket-status-filter" label="Status" />
            <select id="ticket-status-filter" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="field-input mt-2 min-w-44">
              <option value="all">Semua status</option>
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="ticket-category-filter" label="Kategori" />
            <select id="ticket-category-filter" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="field-input mt-2 min-w-44">
              {categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
            </select>
          </div>
        </div>
      </section>

      {error ? <p role="alert" className="mt-5 border-l-2 border-[var(--warn)] bg-[#C1502E]/5 px-4 py-3 text-sm leading-6 text-[var(--warn)]">{error}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(21rem,.82fr)_minmax(0,1.18fr)]">
        <section aria-label="Daftar tiket">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Antrean tiket</h2>
            <span className="text-xs text-[var(--ink-muted)]">Pilih untuk membuka detail</span>
          </div>
          <div className="space-y-3">
            {tickets === undefined ? (
              <PageLoader variant="inline" size="sm" message="Memuat antrean tiket…" />
            ) : tickets.length === 0 ? (
              <EmptyState title="Tidak ada tiket" description="Belum ada tiket yang sesuai filter ini." />
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedId === ticket._id
                const isPriority = (ticket.priorityTier === "growth" || ticket.priorityTier === "pro") && ticket.status === "open"

                return (
                  <button
                    type="button"
                    key={ticket._id}
                    onClick={() => setSelectedId(ticket._id)}
                    aria-pressed={isSelected}
                    className={`relative w-full overflow-hidden border bg-white p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${isSelected ? "border-[var(--gold)] shadow-[0_14px_28px_-24px_rgba(43,30,15,.72)]" : "border-[var(--line)] hover:border-[var(--gold)]/70"}`}
                  >
                    {isPriority ? <span className="absolute inset-y-0 left-0 w-1 bg-[var(--gold)]" /> : null}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isPriority ? <span className="text-xs font-semibold text-[var(--gold-dark)]">Prioritas hari ini</span> : null}
                          <span className="text-xs text-[var(--ink-muted)]">{categoryLabel(ticket.category)}</span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--ink)]">{ticket.subject}</h3>
                      </div>
                      <StatusBadge status={ticket.priorityTier} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[var(--ink-muted)]"><UserRound className="size-3.5 shrink-0" aria-hidden="true" />{ticket.name}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="min-h-[36rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_-32px_rgba(43,30,15,0.55)]">
          {detail === undefined ? (
            <div className="flex min-h-[36rem] items-center justify-center p-6">
              <EmptyState title="Pilih tiket" description="Pilih tiket dari antrean untuk melihat detail dan mengirim balasan." />
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2"><StatusBadge status={detail.ticket.status} /><StatusBadge status={detail.ticket.priorityTier} /></div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{detail.ticket.subject}</h2>
                  <div className="mt-4 grid gap-2 text-sm text-[var(--ink-muted)] sm:grid-cols-2">
                    <span className="flex items-center gap-2"><UserRound className="size-4 text-[var(--gold-dark)]" aria-hidden="true" />{detail.ticket.name}</span>
                    <span className="flex items-center gap-2 break-all"><Mail className="size-4 shrink-0 text-[var(--gold-dark)]" aria-hidden="true" />{detail.ticket.contactEmail}</span>
                    <span className="flex items-center gap-2"><CalendarDays className="size-4 text-[var(--gold-dark)]" aria-hidden="true" />{dateTime(detail.ticket.createdAt)}</span>
                    <span className="flex items-center gap-2"><MessageSquareText className="size-4 text-[var(--gold-dark)]" aria-hidden="true" />{categoryLabel(detail.ticket.category)}</span>
                  </div>
                </div>
              </div>

              <section className="mt-6" aria-labelledby="ticket-message-title">
                <h3 id="ticket-message-title" className="text-sm font-semibold text-[var(--ink)]">Pesan pengirim</h3>
                <p className="mt-3 whitespace-pre-wrap border-l-2 border-[var(--gold)] bg-[var(--background)] px-4 py-4 text-sm leading-7 text-[var(--ink)]">{detail.ticket.message}</p>
              </section>

              <section className="mt-7" aria-labelledby="ticket-replies-title">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 id="ticket-replies-title" className="text-sm font-semibold text-[var(--ink)]">Riwayat balasan</h3>
                  <span className="text-xs text-[var(--ink-muted)]">{detail.replies.length} balasan</span>
                </div>
                {detail.replies.length === 0 ? (
                  <p className="mt-3 border border-dashed border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--ink-muted)]">Belum ada balasan. Kirim respons pertama di bawah ini.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {detail.replies.map((item) => (
                      <div key={item._id} className={`border-l-2 pl-4 ${item.sender === "admin" ? "border-[var(--gold)]" : "border-[var(--line-strong)]"}`}>
                        <p className="text-sm font-semibold text-[var(--ink)]">{item.sender === "admin" ? "Admin BotKos" : detail.ticket.name}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-muted)]">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <form onSubmit={(event) => void submitReply(event)} className="mt-8 border-t border-[var(--line)] pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--gold-pale)] text-[var(--gold-dark)]"><Send className="size-4" aria-hidden="true" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--ink)]">Kirim balasan</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">Owner akan menerima notifikasi bot bila tiket terhubung ke akun mereka.</p>
                  </div>
                </div>
                <div className="mt-5">
                  <FieldLabel htmlFor="ticket-reply" label="Balasan admin" required />
                  <textarea id="ticket-reply" required value={reply} onChange={(event) => setReply(event.target.value)} rows={6} className="field-input mt-2 min-h-36 resize-y leading-6" placeholder="Tulis balasan yang jelas untuk pengirim tiket..." />
                </div>
                <div className="mt-5 flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <FieldLabel htmlFor="ticket-next-status" label="Status setelah balasan" />
                    <select id="ticket-next-status" value={replyStatus} onChange={(event) => setReplyStatus(event.target.value as TicketStatus)} className="field-input mt-2 min-w-52">
                      {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="button-primary inline-flex min-h-11 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
                    {isSubmitting ? "Menyimpan..." : "Simpan balasan"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
