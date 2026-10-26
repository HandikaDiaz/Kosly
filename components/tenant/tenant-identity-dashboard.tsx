"use client"

import { useState } from "react"
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  HelpCircle,
  LoaderCircle,
  LogOut,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react"

type Candidate = {
  linkId: string
  propertyName: string
  period: string
  status: "pending" | "confirmed" | "rejected"
}

export const TenantIdentityDashboard = ({
  identity,
  candidates,
}: {
  identity: { maskedPhone: string }
  candidates: Candidate[]
}) => {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const decide = async (linkId: string, decision: "confirm" | "reject") => {
    setBusyId(linkId)
    try {
      await fetch("/api/penghuni/tenancy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ linkId, decision }),
      })
      window.location.reload()
    } catch {
      setBusyId(null)
    }
  }

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/penghuni/logout", { method: "POST" })
      window.location.reload()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Verified Profile Card ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[var(--ink-muted)]">Nomor Terverifikasi</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Aktif
              </span>
            </div>
            <p className="font-mono text-base font-bold text-[var(--ink)]">
              {identity.maskedPhone}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--ink-muted)] shadow-sm transition hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50"
        >
          {isLoggingOut ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          <span>Keluar Sesi</span>
        </button>
      </div>

      {/* ── Tenancy Candidates Section ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
            Daftar Masa Tinggal & Kos
          </h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            Konfirmasi masa tinggal di bawah agar rekam jejak pembayaran sewa Anda dapat dihitung ke dalam Rapor Penghuni.
          </p>
        </div>

        {candidates.length > 0 ? (
          <div className="grid gap-3">
            {candidates.map((candidate) => {
              const isBusy = busyId === candidate.linkId

              return (
                <div
                  key={candidate.linkId}
                  className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-[var(--wood)] shrink-0" />
                        <h3 className="font-semibold text-[var(--ink)] truncate">
                          {candidate.propertyName}
                        </h3>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                        <Calendar size={13} />
                        <span>Periode: {candidate.period}</span>
                      </div>
                    </div>

                    {/* Status / Actions */}
                    <div>
                      {candidate.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => decide(candidate.linkId, "confirm")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isBusy ? (
                              <LoaderCircle size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            <span>Ini Saya</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => decide(candidate.linkId, "reject")}
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink-muted)] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            <X size={13} />
                            <span>Bukan Saya</span>
                          </button>
                        </div>
                      ) : candidate.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Terkonfirmasi</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          <X size={13} />
                          <span>Ditolak / Bukan Saya</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--background)] p-8 text-center">
            <Building2 size={32} className="mx-auto text-[var(--ink-muted)] opacity-60" />
            <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
              Belum Ada Masa Tinggal yang Terhubung
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--ink-muted)]">
              Pemilik kos Anda belum mendaftarkan nomor telepon ini ke kamar sewa, atau data sedang dalam proses verifikasi.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
