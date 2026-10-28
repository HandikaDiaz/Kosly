"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { REPORT_NOTE_MAX, REPORT_REASONS } from "@/convex/lib/ownerTrustRules"

const reasonLabels: Record<(typeof REPORT_REASONS)[number], string> = { penipuan_dp: "Dugaan penipuan DP", kos_tidak_sesuai: "Kos tidak sesuai informasi", pemilik_tidak_merespons: "Pemilik tidak merespons", informasi_tidak_akurat: "Informasi tidak akurat", lainnya: "Lainnya" }

export const ReportPropertyForm = ({ slug }: { slug: string }) => {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("lainnya")
  const [note, setNote] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const report = useMutation(api.reports.reportProperty)
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try { await report({ slug, reason, note: note || undefined }); setMessage("Laporan sudah diterima dan akan ditinjau tim BotKos.") } catch { setMessage("Laporan tidak dapat diproses.") }
  }
  return message ? <div className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--background)] p-5 text-sm">{message}</div> : <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-5"><label className="block text-sm font-semibold">Alasan<select value={reason} onChange={(event) => setReason(event.target.value as (typeof REPORT_REASONS)[number])} className="mt-2 block w-full rounded-xl border border-[var(--line)] bg-white p-3 font-normal">{REPORT_REASONS.map((item) => <option key={item} value={item}>{reasonLabels[item]}</option>)}</select></label><label className="block text-sm font-semibold">Catatan opsional<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={REPORT_NOTE_MAX} className="mt-2 block min-h-32 w-full rounded-xl border border-[var(--line)] bg-white p-3 font-normal" /></label><button type="submit" className="button-primary w-full">Kirim laporan</button></form>
}
