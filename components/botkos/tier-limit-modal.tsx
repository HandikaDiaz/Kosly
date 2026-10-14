"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

export type TierLimitInfo = {
  tier: "free" | "starter" | "growth" | "pro"
  resource: "kamar" | "properti"
  limit: number
  current?: number
}

const tierDetails = {
  free: { label: "Free", rooms: "3 kamar", properties: "1 properti" },
  starter: { label: "Starter", rooms: "10 kamar", properties: "1 properti" },
  growth: { label: "Growth", rooms: "30 kamar", properties: "3 properti" },
  pro: { label: "Pro", rooms: "kamar tidak terbatas", properties: "properti tidak terbatas" },
} as const

export const parseTierLimitError = (reason: unknown): TierLimitInfo | null => {
  const message = reason instanceof Error ? reason.message : String(reason)
  const match = message.match(/Tier\s+(Free|Starter|Growth|Pro)\s+maksimal\s+(\d+)\s+(kamar|properti)(?:\.\s+Saat ini sudah\s+(\d+)\s+\w+)?/i)
  if (!match) return null
  return {
    tier: match[1].toLowerCase() as TierLimitInfo["tier"],
    limit: Number(match[2]),
    resource: match[3].toLowerCase() as TierLimitInfo["resource"],
    current: match[4] ? Number(match[4]) : undefined,
  }
}

export function TierLimitModal({ info, onDismiss }: { info: TierLimitInfo; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false)
  const details = tierDetails[info.tier]
  const resourceLabel = info.resource === "kamar" ? "kamar" : "properti"

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onDismiss() }}>
      <div className="w-full max-w-md border border-[var(--line)] border-t-4 border-t-[var(--gold)] bg-[#fffefa] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="tier-limit-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff3d5] text-[var(--gold)]"><AlertTriangle size={18} /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Batas tier tercapai</p>
              <h2 id="tier-limit-title" className="mt-1 text-xl font-semibold text-[var(--ink)]">Upgrade untuk melanjutkan</h2>
            </div>
          </div>
          <button type="button" onClick={onDismiss} className="text-[var(--ink-muted)]" aria-label="Tutup pemberitahuan"><X size={18} /></button>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--ink)]">Akun Anda saat ini menggunakan tier <strong>{details.label}</strong> dan sudah mencapai batas {info.limit} {resourceLabel}{info.current !== undefined ? " (sudah ada " + info.current + " " + resourceLabel + ")." : "."}</p>
        <div className="mt-4 border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-muted)]">
          <p className="font-semibold text-[var(--ink)]">Yang tersedia di tier {details.label}</p>
          <p className="mt-2">• Maksimal {details.rooms}</p>
          <p>• Maksimal {details.properties}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDismiss} className="button-secondary">Nanti saja</button>
          <Link href="/dashboard/billing" onClick={onDismiss} className="button-primary"><span>Upgrade tier</span><ArrowRight size={16} /></Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
