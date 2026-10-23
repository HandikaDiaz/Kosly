"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export const RentalApplicationsSection = ({ propertyId }: { propertyId: Id<"properties"> }) => {
  const applications = useQuery(api.applications.ownerList, { propertyId })
  const accept = useMutation(api.applications.acceptApplication)
  const decline = useMutation(api.applications.declineApplication)
  const release = useMutation(api.applications.releaseHold)
  const setContact = useMutation(api.applications.setContactForApplicants)
  const [busy, setBusy] = useState<string | null>(null)
  const [contact, setContactValue] = useState("")
  const decide = async (id: Id<"rentalApplications">, action: "accept" | "decline" | "release") => {
    setBusy(String(id))
    try { if (action === "accept") await accept({ applicationId: id }); else if (action === "decline") await decline({ applicationId: id }); else await release({ applicationId: id }) } finally { setBusy(null) }
  }
  return <section className="mt-10 border border-[var(--line)] bg-white p-5"><div className="flex items-end justify-between border-b border-[var(--line)] pb-3"><div><p className="text-sm text-[var(--ink-muted)]">Pengajuan Sewa</p><h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">Minat calon penyewa</h2></div><span className="text-xs text-[var(--ink-muted)]">BotKos mencatat, tidak memproses atau memverifikasi pembayaran.</span></div><div className="mt-4 flex gap-2"><input className="field-input flex-1" value={contact} onChange={(event) => setContactValue(event.target.value)} placeholder="Kontak untuk calon penyewa (+62...)" /><button className="button-secondary text-xs" onClick={() => void setContact({ propertyId, contact })}>Simpan kontak</button></div><p className="mt-1 text-xs text-[var(--ink-muted)]">Kontak dibagikan hanya setelah pengajuan diterima.</p><div className="mt-4 space-y-3">{applications?.length ? applications.map((application) => <div key={String(application._id)} className="border border-[var(--line)] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{application.code} · Kamar {application.roomId}</span><span>{application.status}</span></div><p className="mt-1 text-xs text-[var(--ink-muted)]">Nama: {application.applicantName ?? "-"} · Mulai: {application.moveInDate} · Durasi: {application.durationMonths} bulan</p><div className="mt-3 flex flex-wrap gap-2">{application.status === "submitted" && <><button className="button-primary text-xs" disabled={busy === String(application._id)} onClick={() => void decide(application._id, "accept")}>Terima</button><button className="button-secondary text-xs" disabled={busy === String(application._id)} onClick={() => void decide(application._id, "decline")}>Tolak</button></>}{application.status === "accepted" && <button className="button-secondary text-xs" disabled={busy === String(application._id)} onClick={() => void decide(application._id, "release")}>Lepas</button>}</div></div>) : <p className="text-sm text-[var(--ink-muted)]">Belum ada pengajuan.</p>}</div></section>
}
