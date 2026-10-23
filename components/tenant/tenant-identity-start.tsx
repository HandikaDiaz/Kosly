"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export const TenantIdentityStart = () => {
  const start = useMutation(api.tenantIdentity.startVerification)
  const claim = useMutation(api.tenantIdentity.claimVerifiedSession)
  const [challenge, setChallenge] = useState<{ challengeId: string; pollSecret: string; code: string; expiresAt: number; botLinks: { telegram?: string; whatsapp?: string } } | null>(null)
  const [noticeAccepted, setNoticeAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = useQuery(api.tenantIdentity.getChallengeStatus, challenge ? { challengeId: challenge.challengeId as never, pollSecret: challenge.pollSecret } : "skip")

  useEffect(() => {
    if (status?.status !== "verified" || !challenge) return
    void claim({ challengeId: challenge.challengeId as never, pollSecret: challenge.pollSecret }).then(async ({ token }) => {
      await fetch("/api/penghuni/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      window.location.reload()
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Sesi gagal dibuat."))
  }, [challenge, claim, status?.status])

  const begin = async () => {
    setError(null)
    try { setChallenge(await start({ noticeAccepted })) } catch (cause) { setError(cause instanceof Error ? cause.message : "Verifikasi gagal dimulai.") }
  }

  if (!challenge) return <div className="space-y-4"><label className="flex gap-3 text-sm"><input type="checkbox" checked={noticeAccepted} onChange={(event) => setNoticeAccepted(event.target.checked)} /> Saya memahami bahwa BotKos hanya memakai nomor ini untuk pencocokan masa tinggal.</label><button className="rounded-xl bg-[var(--wood)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={!noticeAccepted} onClick={begin}>Mulai verifikasi</button>{error ? <p className="text-sm text-red-600">{error}</p> : null}</div>
  return <div className="space-y-4"><p className="text-sm">Kirim kode berikut ke bot. Kode hanya berlaku 10 menit:</p><p className="rounded-xl bg-[var(--secondary)] p-4 text-center font-mono text-xl font-bold tracking-widest">{challenge.code}</p>{challenge.botLinks.whatsapp ? <a className="block rounded-xl border p-3 text-sm" href={challenge.botLinks.whatsapp}>Buka WhatsApp</a> : null}{challenge.botLinks.telegram ? <a className="block rounded-xl border p-3 text-sm" href={challenge.botLinks.telegram}>Buka Telegram</a> : null}<p className="text-sm text-[var(--ink-muted)]">Status: {status?.status ?? "menunggu pesan"}</p>{error ? <p className="text-sm text-red-600">{error}</p> : null}</div>
}
