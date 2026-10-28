"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { isRaporEnabled } from "@/lib/raporGate"

export const OwnerDisputesSection = ({ propertyId }: { propertyId: Id<"properties"> }) => isRaporEnabled() ? <EnabledOwnerDisputesSection propertyId={propertyId} /> : null

const EnabledOwnerDisputesSection = ({ propertyId }: { propertyId: Id<"properties"> }) => {
  const rows = useQuery(api.tenantRapor.ownerListDisputes, { propertyId })
  const respond = useMutation(api.tenantRapor.ownerRespondToDispute)
  const [note, setNote] = useState<Record<string, string>>({})
  return <section className="mt-10 border-t border-[var(--line)] pt-8"><h2 className="text-xl font-semibold">Sengketa Catatan Pembayaran</h2><p className="mt-2 text-sm text-[var(--ink-muted)]">Respons ini tidak mengubah catatan pembayaranmu; hanya memengaruhi apakah bulan itu ikut dihitung dalam Rapor Penghuni milik penyewa.</p><div className="mt-5 space-y-3">{rows?.length ? rows.map((row) => <article className="rounded-xl border border-[var(--line)] p-4" key={row.disputeId}><p className="font-semibold">{row.tenantName} · {row.periodId}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Alasan: {row.reason} · Status: {row.status}{row.status === "open" ? ` · ${row.daysRemaining} hari tersisa` : ""}</p>{row.note ? <p className="mt-2 text-sm">Catatan: {row.note}</p> : null}{row.status === "open" ? <><textarea className="mt-3 w-full rounded-lg border p-2 text-sm" maxLength={300} value={note[String(row.disputeId)] ?? ""} onChange={(event) => setNote((current) => ({ ...current, [String(row.disputeId)]: event.target.value }))} placeholder="Catatan opsional" /><div className="mt-3 flex gap-2"><button className="rounded-lg bg-[var(--wood)] px-3 py-2 text-sm text-white" onClick={() => void respond({ disputeId: row.disputeId, decision: "agree", note: note[String(row.disputeId)] })}>Setuju (periode tidak dihitung di rapor)</button><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void respond({ disputeId: row.disputeId, decision: "reject", note: note[String(row.disputeId)] })}>Tolak (catatan tetap)</button></div></> : row.ownerDecision ? <p className="mt-2 text-sm">Keputusan: {row.ownerDecision}</p> : null}</article>) : <p className="text-sm text-[var(--ink-muted)]">Belum ada sengketa catatan pembayaran.</p>}</div></section>
}
