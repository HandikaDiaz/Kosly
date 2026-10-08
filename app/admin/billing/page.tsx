"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "@/components/botkos/empty-state"
import { LedgerTable } from "@/components/botkos/ledger-table"

const formatMoney = (value: number) => `Rp ${value.toLocaleString("id-ID")}`

export default function AdminBillingPage() {
  const data = useQuery(api.admin.getBillingOverview)
  const approve = useMutation(api.admin.approveSubscription)
  const reject = useMutation(api.admin.rejectSubscription)
  const [error, setError] = useState<string | null>(null)

  if (!data) return <p className="text-sm text-[var(--ink-muted)]">Memuat billing…</p>

  const decide = async (id: typeof data.pending[number]["subscription"]["_id"], action: "approve" | "reject") => {
    setError(null)
    try {
      if (action === "approve") await approve({ subscriptionId: id })
      else {
        const reason = window.prompt("Alasan penolakan")?.trim()
        if (!reason) throw new Error("Alasan penolakan wajib diisi.")
        await reject({ subscriptionId: id, reason })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Review billing gagal.")
    }
  }

  const pendingItems = data.pending.map(({ subscription, owner, proofUrl }) => ({
    room: subscription.tier,
    tenant: owner?.name ?? owner?.email ?? "Owner",
    period: subscription.billingCycle,
    date: new Date(subscription._creationTime).toLocaleDateString("id-ID"),
    amount: formatMoney(subscription.priceAmount),
    status: "pending_payment" as const,
    actions: <>
      {proofUrl ? <a href={proofUrl} target="_blank" rel="noreferrer" className="button-secondary whitespace-nowrap px-3 py-2 text-xs">Bukti</a> : null}
      <button type="button" onClick={() => void decide(subscription._id, "approve")} className="button-primary whitespace-nowrap px-3 py-2 text-xs">Approve</button>
      <button type="button" onClick={() => void decide(subscription._id, "reject")} className="button-secondary whitespace-nowrap px-3 py-2 text-xs">Reject</button>
    </>,
  }))

  const pastDueItems = data.pastDue.map(({ subscription, owner }) => ({
    room: subscription.tier,
    tenant: owner?.name ?? owner?.email ?? "Owner",
    period: subscription.billingCycle,
    date: new Date(subscription._creationTime).toLocaleDateString("id-ID"),
    amount: formatMoney(subscription.priceAmount),
    status: "past_due" as const,
  }))

  return (
    <div>
      <p className="text-sm text-[var(--ink-muted)]">Operasional internal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Review langganan</h1>
      {error ? <p role="alert" className="mt-4 border-l-2 border-[var(--warn)] bg-[#C1502E]/5 px-4 py-3 text-sm text-[var(--warn)]">{error}</p> : null}

      <section className="mt-9">
        <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="text-sm text-[var(--ink-muted)]">Buku besar billing</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Menunggu pembayaran</h2></div><span className="font-mono text-sm text-[var(--gold-dark)]">{data.pending.length} item</span></div>
        <div className="ledger-paper mt-5 overflow-hidden">{pendingItems.length ? <LedgerTable items={pendingItems} primaryLabel="Tier" /> : <EmptyState title="Billing bersih" description="Tidak ada pembayaran yang menunggu review saat ini." />}</div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="text-sm text-[var(--ink-muted)]">Perlu ditindaklanjuti</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Past due</h2></div><span className="font-mono text-sm text-[var(--warn)]">{data.pastDue.length} item</span></div>
        <div className="ledger-paper mt-5 overflow-hidden">{pastDueItems.length ? <LedgerTable items={pastDueItems} primaryLabel="Tier" /> : <EmptyState title="Tidak ada past due" description="Semua subscription berada dalam periode yang aman." />}</div>
      </section>
    </div>
  )
}
