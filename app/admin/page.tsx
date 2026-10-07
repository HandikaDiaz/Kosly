"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AdminPage() {
  const billing = useQuery(api.admin.getBillingOverview)
  const reports = useQuery(api.reports.listOpen)
  if (!billing || !reports) return <p className="text-sm text-[var(--ink-muted)]">Memuat ringkasan admin…</p>
  return <div><p className="text-sm text-[var(--ink-muted)]">Operasional internal</p><h1 className="mt-2 text-3xl font-semibold text-[var(--ink)]">Ringkasan admin</h1><div className="mt-8 grid gap-4 md:grid-cols-4"><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Pending billing</p><p className="mt-2 font-mono text-3xl text-[var(--ink)]">{billing.pending.length}</p></div><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Past due</p><p className="mt-2 font-mono text-3xl text-[var(--warn)]">{billing.pastDue.length}</p></div><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Estimasi bulanan</p><p className="mt-2 font-mono text-2xl text-[var(--ink)]">Rp {Math.round(billing.monthlyRevenue).toLocaleString("id-ID")}</p></div><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Laporan terbuka</p><p className="mt-2 font-mono text-3xl text-[var(--ink)]">{reports.length}</p></div></div><div className="mt-8 flex gap-3"><Link href="/admin/billing" className="button-primary">Review billing</Link><Link href="/admin/verification" className="button-secondary">Review verifikasi</Link></div></div>
}
