"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SubscriptionForm } from "@/components/botkos/subscription-form"

export default function BillingPage() {
  const data = useQuery(api.subscriptions.getMine)
  if (!data) return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat langganan…</div>
  return <div className="px-5 py-7 sm:px-8 sm:py-10"><div className="mx-auto max-w-4xl"><p className="text-sm text-[var(--ink-muted)]">Billing owner</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Langganan</h1><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Tier aktif</p><p className="mt-2 text-xl font-semibold capitalize text-[var(--ink)]">{data.activeTier}</p></div><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Total kamar</p><p className="mt-2 text-xl font-semibold text-[var(--ink)]">{data.roomCount}</p></div><div className="border border-[var(--line)] bg-[#fffefa] p-5"><p className="text-xs text-[var(--ink-muted)]">Status</p><p className="mt-2 text-xl font-semibold capitalize text-[var(--ink)]">{data.subscription?.status ?? "active"}</p></div></div>{data.upgradeRequired && <div className="mt-6 border border-[var(--gold)] bg-[#fff8e8] p-5 text-sm text-[var(--ink)]">Jumlah kamar Anda menyarankan upgrade ke tier <strong className="capitalize">{data.recommendedTier}</strong>. Fitur tetap dapat digunakan seperti biasa.</div>}<div className="mt-8"><SubscriptionForm onSubmitted={() => window.location.reload()} /></div></div></div>
}
