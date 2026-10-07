"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AdminReportsPage() {
  const reports = useQuery(api.reports.listOpen)
  const updateStatus = useMutation(api.reports.updateStatus)
  const [error, setError] = useState<string | null>(null)
  if (!reports) return <p className="text-sm text-[var(--ink-muted)]">Memuat laporan…</p>
  return <div><p className="text-sm text-[var(--ink-muted)]">Admin / Laporan</p><h1 className="mt-2 text-3xl font-semibold text-[var(--ink)]">Laporan terbuka</h1>{error && <p role="alert" className="mt-4 text-sm text-[var(--warn)]">{error}</p>}<div className="mt-8 space-y-3">{reports.length ? reports.map((report) => <article key={report._id} className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-sm leading-6 text-[var(--ink)]">{report.description}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => void updateStatus({ reportId: report._id, status: "reviewed" }).catch((reason) => setError(reason instanceof Error ? reason.message : "Status gagal diubah."))} className="button-secondary">Tandai reviewed</button><button type="button" onClick={() => void updateStatus({ reportId: report._id, status: "resolved" }).catch((reason) => setError(reason instanceof Error ? reason.message : "Status gagal diubah."))} className="button-primary">Selesaikan</button></div></article>) : <p className="border border-dashed border-[var(--line)] p-6 text-sm text-[var(--ink-muted)]">Tidak ada laporan terbuka.</p>}</div></div>
}
