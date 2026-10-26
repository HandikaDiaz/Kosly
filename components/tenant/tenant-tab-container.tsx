"use client"

import { useState } from "react"
import {
  Award,
  CalendarCheck,
  CreditCard,
  FileText,
  ShieldCheck,
  User,
} from "lucide-react"
import { TenantIdentityDashboard } from "./tenant-identity-dashboard"
import { TenantRaporSection } from "./tenant-rapor-section"

type Candidate = {
  linkId: string
  propertyName: string
  period: string
  status: "pending" | "confirmed" | "rejected"
}

type RecordItem = {
  propertyName: string
  periodLabel: string
  periods: Array<{
    periodId: string
    monthLabel: string
    status: "tepat_waktu" | "terlambat" | "belum_dibayar"
    daysLate?: number
    disputeStatus?: string
  }>
}

type Consent = {
  active: boolean
  grantedAt?: number
  needsReconsent: boolean
}

type Preview = {
  label: string
  available: boolean
  tier?: "always" | "usually"
  tierLabel?: string
  tenancyBucket?: string
  monthsBucket?: string
  generatedMonth?: string
}

type Share = {
  shareId: string
  forLabel?: string
  createdAt: number
  expiresAt: number
  status: string
  revealedSummary?: {
    tier: string
    tenancyBucket: string
    monthsBucket: string
    generatedMonth: string
  }
}

export function TenantTabContainer({
  identity,
  candidates,
  records,
  consent,
  preview,
  consentText,
  shares,
}: {
  identity: { maskedPhone: string }
  candidates: Candidate[]
  records: RecordItem[]
  consent: Consent
  preview: Preview
  consentText: {
    version: string
    title: string
    paragraphs: readonly string[]
    buttons: { agree: string; decline: string }
  }
  shares: Share[]
}) {
  const [activeTab, setActiveTab] = useState<"profil" | "pembayaran" | "rapor">("profil")

  const pendingCandidateCount = candidates.filter((c) => c.status === "pending").length

  return (
    <div className="space-y-6">
      {/* ── Tab Navigation Pill Bar ── */}
      <div className="flex border-b border-[var(--line)] bg-white/70 p-1 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("profil")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-semibold transition-all ${
            activeTab === "profil"
              ? "bg-[var(--gold)] text-white shadow-sm"
              : "text-[var(--ink-muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]"
          }`}
        >
          <User size={15} />
          <span>Profil & Verifikasi</span>
          {pendingCandidateCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "profil" ? "bg-white text-[var(--gold-dark)]" : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingCandidateCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pembayaran")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-semibold transition-all ${
            activeTab === "pembayaran"
              ? "bg-[var(--gold)] text-white shadow-sm"
              : "text-[var(--ink-muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]"
          }`}
        >
          <CreditCard size={15} />
          <span>Riwayat Pembayaran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rapor")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-semibold transition-all ${
            activeTab === "rapor"
              ? "bg-[var(--gold)] text-white shadow-sm"
              : "text-[var(--ink-muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]"
          }`}
        >
          <Award size={15} />
          <span>Rapor & Bagikan</span>
          {preview.available && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "rapor" ? "bg-white text-[var(--gold-dark)]" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Siap
            </span>
          )}
        </button>
      </div>

      {/* ── Tab Content Views ── */}
      <div className="pt-2 animate-in fade-in duration-200">
        {activeTab === "profil" && (
          <TenantIdentityDashboard identity={identity} candidates={candidates} />
        )}

        {activeTab === "pembayaran" && (
          <TenantRaporSection
            records={records}
            consent={consent}
            preview={preview}
            consentText={consentText}
            shares={shares}
            view="payments"
          />
        )}

        {activeTab === "rapor" && (
          <TenantRaporSection
            records={records}
            consent={consent}
            preview={preview}
            consentText={consentText}
            shares={shares}
            view="rapor"
          />
        )}
      </div>
    </div>
  )
}
