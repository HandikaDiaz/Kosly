"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { ImageUploadField } from "./image-upload-field"

export function SubscriptionForm({ onSubmitted }: { onSubmitted: () => void }) {
  const generateUploadUrl = useMutation(api.propertyPhotos.generateUploadUrl)
  const submitPayment = useMutation(api.subscriptions.submitPayment)
  const [tier, setTier] = useState<"starter" | "growth" | "pro">("starter")
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(null)
    if (!proof) { setError("Unggah bukti transfer terlebih dahulu."); return }
    setLoading(true)
    try {
      const url = await generateUploadUrl()
      const response = await fetch(url, { method: "POST", headers: { "content-type": proof.type }, body: proof })
      if (!response.ok) throw new Error("Upload bukti transfer gagal.")
      const uploaded = (await response.json()) as { storageId: string }
      await submitPayment({ tier, billingCycle, proofStorageId: uploaded.storageId as Id<"_storage"> })
      onSubmitted()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengajuan langganan gagal.")
    } finally { setLoading(false) }
  }

  return <div className="space-y-5 border border-[var(--line)] bg-[#fffefa] p-6">
    <div><h2 className="text-xl font-semibold text-[var(--ink)]">Ajukan upgrade</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">Pembayaran diperiksa manual oleh admin.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-[var(--ink)]">Tier<select className="field-input mt-2" value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}><option value="starter">Starter — Rp59.000/bln</option><option value="growth">Growth — Rp109.000/bln</option><option value="pro">Pro — Rp199.000/bln</option></select></label><label className="text-sm text-[var(--ink)]">Siklus<select className="field-input mt-2" value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as typeof billingCycle)}><option value="monthly">Bulanan</option><option value="annual">Tahunan</option></select></label></div>
    <div className="border border-[var(--line)] bg-[var(--background)] p-4 text-sm leading-6 text-[var(--ink-muted)]">Transfer manual ke rekening/QRIS admin. Simpan bukti transfer untuk diperiksa.</div>
    <ImageUploadField label="Bukti transfer" hint="JPG, PNG, atau WebP maksimal 5 MB." required value={proof} onChange={setProof} />
    {error && <p role="alert" className="text-sm text-[var(--warn)]">{error}</p>}
    <button type="button" disabled={loading} onClick={() => void submit()} className="button-primary disabled:opacity-60">{loading ? "Mengirim…" : "Kirim bukti transfer"}</button>
  </div>
}
