"use client"

import Link from "next/link"
import { Lock, ArrowRight, X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

export type SubscriptionLockInfo = {
  propertyName: string
  /** The tier the owner needs to regain access (the tier that was previously active). */
  requiredTier: "starter" | "growth" | "pro"
}

const tierDetails = {
  starter: { label: "Starter", properties: "2 properti", rooms: "10 kamar", price: "Rp 59.000/bulan" },
  growth: { label: "Growth", properties: "3 properti", rooms: "30 kamar", price: "Rp 109.000/bulan" },
  pro: { label: "Pro", properties: "properti tak terbatas", rooms: "kamar tak terbatas", price: "Rp 199.000/bulan" },
} as const

export function SubscriptionLockModal({
  info,
  onDismiss,
}: {
  info: SubscriptionLockInfo
  onDismiss: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const details = tierDetails[info.requiredTier]

  useEffect(() => {
    setMounted(true)
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onDismiss() }
    document.addEventListener("keydown", handleEscape)
    return () => { setMounted(false); document.removeEventListener("keydown", handleEscape) }
  }, [onDismiss])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onDismiss() }}
    >
      <div
        className="w-full max-w-md border border-[var(--line)] border-t-4 border-t-red-500 bg-[#fffefa] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-lock-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Lock size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                Properti dikunci sistem
              </p>
              <h2 id="subscription-lock-title" className="mt-1 text-xl font-semibold text-[var(--ink)]">
                {info.propertyName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 text-[var(--ink)]">
          Properti ini dikunci otomatis karena langganan Anda sudah berakhir dan melebihi batas tier{" "}
          <strong>Free</strong> (maks. 1 properti). Upgrade untuk mengaktifkan kembali akses.
        </p>

        <div className="mt-4 border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-muted)]">
          <p className="font-semibold text-[var(--ink)]">
            Tier yang disarankan: <span className="text-[var(--wood)]">{details.label}</span>
          </p>
          <ul className="mt-2 space-y-1">
            <li>• Maksimal {details.properties}</li>
            <li>• Maksimal {details.rooms}</li>
            <li>• Mulai dari {details.price}</li>
          </ul>
        </div>

        <p className="mt-4 text-xs text-[var(--ink-muted)]">
          Setelah admin mengonfirmasi pembayaran, properti ini akan terbuka otomatis.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDismiss} className="button-secondary">
            Nanti saja
          </button>
          <Link href="/dashboard/billing" onClick={onDismiss} className="button-primary">
            <span>Upgrade langganan</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}
