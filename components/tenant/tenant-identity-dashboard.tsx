"use client"

type Candidate = { linkId: string; propertyName: string; period: string; status: "pending" | "confirmed" | "rejected" }

export const TenantIdentityDashboard = ({ identity, candidates }: { identity: { maskedPhone: string }; candidates: Candidate[] }) => {
  const decide = async (linkId: string, decision: "confirm" | "reject") => { await fetch("/api/penghuni/tenancy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ linkId, decision }) }); window.location.reload() }
  const logout = async () => { await fetch("/api/penghuni/logout", { method: "POST" }); window.location.reload() }
  return <div className="space-y-6"><p className="text-sm">Nomor terverifikasi: <span className="font-semibold">{identity.maskedPhone}</span></p><div className="space-y-3">{candidates.length ? candidates.map((candidate) => <div className="rounded-xl border border-[var(--line)] p-4" key={candidate.linkId}><p className="font-semibold">{candidate.propertyName}</p><p className="text-sm text-[var(--ink-muted)]">{candidate.period}</p>{candidate.status === "pending" ? <div className="mt-3 flex gap-2"><button className="rounded-lg bg-[var(--wood)] px-3 py-2 text-sm text-white" onClick={() => decide(candidate.linkId, "confirm")}>Ini saya</button><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => decide(candidate.linkId, "reject")}>Bukan saya</button></div> : candidate.status === "confirmed" ? <p className="mt-2 text-sm text-green-700">Terkonfirmasi</p> : <p className="mt-2 text-sm text-[var(--ink-muted)]">Ditolak</p>}</div>) : <p className="text-sm text-[var(--ink-muted)]">Belum ada masa tinggal yang cocok.</p>}</div><button className="text-sm underline" onClick={logout}>Keluar</button></div>
}
