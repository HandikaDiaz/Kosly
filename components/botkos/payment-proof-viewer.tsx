"use client"

import { Check, ExternalLink, X } from "lucide-react"
import { useState } from "react"

export function PaymentProofViewer({ tenant, amount, proofUrl, onConfirm, onReject }: { tenant: string; amount: string; proofUrl?: string; onConfirm?: () => Promise<unknown>; onReject?: () => Promise<unknown> }) {
  const [state, setState] = useState<"pending" | "confirmed" | "rejected">("pending")
  const confirm = async () => { if (onConfirm) await onConfirm(); setState("confirmed") }
  const reject = async () => { if (onReject) await onReject(); setState("rejected") }
  return <div className="border border-[var(--line)] bg-[#fffefa] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--ink)]">{tenant}</p><p className="mt-1 font-mono text-lg text-[var(--ink)]">{amount}</p></div><span className="text-xs text-[var(--ink-muted)]">Bukti transfer</span></div><div className="mt-5 flex min-h-28 items-center justify-center border border-dashed border-[var(--line)] bg-[#F4F2EC] text-sm text-[var(--ink-muted)]">{proofUrl ? <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[var(--wood)] underline">Lihat bukti <ExternalLink size={14} /></a> : "Preview bukti akan muncul setelah upload"}</div>{state === "pending" ? <div className="mt-5 flex gap-2"><button type="button" onClick={() => void confirm()} className="button-primary"><Check size={15} />Konfirmasi</button><button type="button" onClick={() => void reject()} className="button-secondary"><X size={15} />Tolak</button></div> : <p className={`mt-4 text-sm font-medium ${state === "confirmed" ? "text-[var(--sage)]" : "text-[var(--warn)]"}`}>{state === "confirmed" ? "Pembayaran dikonfirmasi." : "Pembayaran ditolak."}</p>}</div>
}
