"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "@/components/botkos/empty-state"

export default function AdminReportsPage() {
  const reports = useQuery(api.reports.listOpen)
  const updateStatus = useMutation(api.reports.updateStatus)
  const [error, setError] = useState<string | null>(null)
  if (!reports) return <p className="text-sm text-[var(--ink-muted)]">Memuat laporan…</p>

  const update = async (reportId: typeof reports[number]["_id"], status: "reviewed" | "resolved") => {
    setError(null)
    try { await updateStatus({ reportId, status }) } catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diubah.") }
  }

  return (
    <div>
      <p className="text-sm text-[var(--ink-muted)]">Operasional internal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Laporan terbuka</h1>
      {error ? <p role="alert" className="mt-4 border-l-2 border-[var(--warn)] bg-[#C1502E]/5 px-4 py-3 text-sm text-[var(--warn)]">{error}</p> : null}
      <section className="mt-9">
        <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="text-sm text-[var(--ink-muted)]">Daftar tindak lanjut</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Laporan masuk</h2></div><span className="font-mono text-sm text-[var(--warn)]">{reports.length} item</span></div>
        <div className="mt-5 space-y-3">{reports.length ? reports.map((report) => <article key={report._id} className="border border-[var(--line)] bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm leading-6 text-[var(--ink)]">{report.description}</p><p className="mt-3 font-mono text-xs text-[var(--ink-muted)]">Dibuat {new Date(report._creationTime).toLocaleDateString("id-ID")}</p></div><span className="status-pill status-overdue shrink-0">Terbuka</span></div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void update(report._id, "reviewed")} className="button-secondary">Tandai reviewed</button><button type="button" onClick={() => void update(report._id, "resolved")} className="button-primary">Selesaikan</button></div></article>) : <EmptyState title="Tidak ada laporan terbuka" description="Semua laporan sudah ditindaklanjuti. Tidak ada pekerjaan baru untuk admin." />}</div>
      </section>
    </div>
  )
}
