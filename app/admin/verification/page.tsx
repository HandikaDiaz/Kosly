"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "@/components/botkos/empty-state"

export default function AdminVerificationPage() {
  const identity = useQuery(api.verifications.listPendingIdentity)
  const properties = useQuery(api.verifications.listPendingProperties)
  const reviewIdentity = useMutation(api.verifications.reviewIdentity)
  const reviewProperty = useMutation(api.verifications.reviewProperty)
  const [error, setError] = useState<string | null>(null)
  const sensitiveFileUrl = (storageId: string, fileType: "ktp" | "selfie" | "ownership_proof") => {
    const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
    return siteUrl ? `${siteUrl.replace(/\/$/, "")}/sensitive-file?storageId=${encodeURIComponent(storageId)}&fileType=${fileType}` : null
  }

  if (!identity || !properties) return <p className="text-sm text-[var(--ink-muted)]">Memuat verifikasi…</p>

  const review = async (kind: "identity" | "property", id: string, decision: "approved" | "rejected") => {
    setError(null)
    try {
      const reason = decision === "rejected" ? window.prompt("Alasan penolakan")?.trim() : undefined
      if (decision === "rejected" && !reason) throw new Error("Alasan penolakan wajib diisi.")
      if (kind === "identity") await reviewIdentity({ ownerId: id as never, decision, reason })
      else await reviewProperty({ propertyId: id as never, decision, reason })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review verifikasi gagal.")
    }
  }

  return (
    <div>
      <p className="text-sm text-[var(--ink-muted)]">Operasional internal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Review verifikasi</h1>
      {error ? <p role="alert" className="mt-4 border-l-2 border-[var(--warn)] bg-[#C1502E]/5 px-4 py-3 text-sm text-[var(--warn)]">{error}</p> : null}

      <section className="mt-9">
        <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="text-sm text-[var(--ink-muted)]">Daftar review</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Identitas owner</h2></div><span className="font-mono text-sm text-[var(--gold-dark)]">{identity.length} item</span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {identity.length ? identity.map(({ owner, ktpStorageId, selfieStorageId }) => <article key={owner._id} className="border border-[var(--line)] border-t-4 border-t-[var(--gold)] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--ink)]">{owner.name ?? owner.email ?? "Owner"}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">KTP dan selfie</p></div><span className="status-pill status-warning">Menunggu review</span></div><div className="mt-4 grid grid-cols-2 gap-2">{[[ktpStorageId, "ktp"], [selfieStorageId, "selfie"]].map(([storageId, fileType], index) => { const url = storageId ? sensitiveFileUrl(storageId, fileType as "ktp" | "selfie") : null; return url ? <a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt={index === 0 ? "KTP" : "Selfie"} crossOrigin="use-credentials" className="h-36 w-full rounded-sm object-cover" /></a> : null })}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void review("identity", owner._id, "approved")} className="button-primary">Approve</button><button type="button" onClick={() => void review("identity", owner._id, "rejected")} className="button-secondary">Reject</button></div></article>) : <div className="md:col-span-2"><EmptyState title="Identitas sudah bersih" description="Tidak ada KTP atau selfie owner yang menunggu review." /></div>}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><div><p className="text-sm text-[var(--ink-muted)]">Daftar review</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Properti</h2></div><span className="font-mono text-sm text-[var(--gold-dark)]">{properties.length} item</span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {properties.length ? properties.map(({ property, photos, ownershipProofStorageId }) => { const ownershipProofUrl = ownershipProofStorageId ? sensitiveFileUrl(ownershipProofStorageId, "ownership_proof") : null; return <article key={property._id} className="border border-[var(--line)] border-t-4 border-t-[var(--gold)] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--ink)]">{property.name}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Foto properti dan bukti kepemilikan</p></div><span className="status-pill status-warning">Menunggu review</span></div><div className="mt-4 grid grid-cols-3 gap-2">{photos.map((photo) => photo.url ? <img key={photo._id} src={photo.url} alt="Foto properti" className="h-24 w-full rounded-sm object-cover" /> : null)}</div>{ownershipProofUrl ? <a href={ownershipProofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-[var(--gold-dark)] underline underline-offset-2">Buka bukti kepemilikan</a> : null}<div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void review("property", property._id, "approved")} className="button-primary">Approve</button><button type="button" onClick={() => void review("property", property._id, "rejected")} className="button-secondary">Reject</button></div></article> }) : <div className="md:col-span-2"><EmptyState title="Properti sudah bersih" description="Tidak ada properti yang menunggu review saat ini." /></div>}
        </div>
      </section>
    </div>
  )
}
