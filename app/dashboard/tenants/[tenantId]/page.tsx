"use client"

import Link from "next/link"
import { ArrowLeft, Calendar, Phone, TriangleAlert } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { LedgerTable } from "@/components/botkos/ledger-table"

export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params.tenantId as Id<"tenants">
  const tenant = useQuery(api.tenants.getMine, { tenantId })
  const payments = useQuery(api.payments.listForTenant, { tenantId })
  const updateDecision = useMutation(api.tenants.updateLeaseDecision)
  const setLifecycleStatus = useMutation(api.tenants.setLifecycleStatus)
  const handleOverdueFlag = useMutation(api.tenants.handleOverdueFlag)

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moveOutInput, setMoveOutInput] = useState<string>("")
  const [showMoveOutForm, setShowMoveOutForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!tenant || !payments) {
    return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat tenant…</div>
  }

  const ledger = payments.map((payment) => ({
    room: tenant.room?.roomNumber ?? tenant.roomId.slice(-4),
    tenant: tenant.name,
    period: payment.billingPeriod,
    date: new Date(payment.paidAt).toLocaleDateString("id-ID"),
    amount: `Rp ${payment.amount.toLocaleString("id-ID")}`,
    status: payment.status === "confirmed" ? "paid" as const : payment.status === "rejected" ? "rejected" as const : "pending" as const,
  }))

  const saveDecision = async (decision: "continue" | "not_continuing") => {
    setError(null)
    setMessage(null)
    try {
      await updateDecision({ tenantId, decision })
      setMessage(decision === "continue" ? "Tenant ditandai lanjut sewa." : "Tenant ditandai tidak lanjut dan kamar dikosongkan.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Keputusan tenant gagal disimpan.")
    }
  }

  const saveMoveOutDate = async () => {
    if (!moveOutInput) { setError("Pilih tanggal pindah terlebih dahulu."); return }
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      await setLifecycleStatus({
        tenantId,
        lifecycle_status: "akan_pindah",
        move_out_date: new Date(moveOutInput).getTime(),
      })
      setMessage("Tenant ditandai akan pindah.")
      setShowMoveOutForm(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan tanggal pindah.")
    } finally {
      setSubmitting(false)
    }
  }

  const cancelMoveOut = async () => {
    setError(null)
    setMessage(null)
    try {
      await setLifecycleStatus({ tenantId, lifecycle_status: "active" })
      setMessage("Status pindah dibatalkan. Tenant kembali aktif.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal membatalkan status pindah.")
    }
  }

  const doOverdueAction = async (action: "tandai_kosong" | "masih_tunggu") => {
    setError(null)
    setMessage(null)
    try {
      await handleOverdueFlag({ tenantId, action })
      setMessage(action === "tandai_kosong" ? "Kamar ditandai kosong. Tenant diarsipkan." : "Tindakan dicatat. Reminder tagihan tetap berjalan.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Aksi gagal disimpan.")
    }
  }

  const dueDateFormatted = new Date(tenant.realDueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  const moveOutFormatted = tenant.move_out_date ? new Date(tenant.move_out_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null
  const flaggedFormatted = tenant.flagged_overdue_at ? new Date(tenant.flagged_overdue_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null
  const lifecycleStatus = tenant.lifecycle_status ?? "active"

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/tenants" className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]">
          <ArrowLeft size={15} />Kembali ke tenant
        </Link>

        <header className="mt-10 flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">Tenant</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{tenant.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-[var(--ink-muted)]"><Phone size={14} />{tenant.phone}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`status-pill ${tenant.isCurrentPeriodPaid ? "status-paid" : "status-warning"}`}>
              {tenant.isCurrentPeriodPaid ? `Lunas (${tenant.currentPeriod})` : `Tagihan ${tenant.currentPeriod} Belum Lunas`}
            </span>
            <span className={`status-pill ${lifecycleStatus === "akan_pindah" ? "status-warning" : lifecycleStatus === "moved_out" ? "status-overdue" : "status-paid"}`}>
              {lifecycleStatus === "akan_pindah" ? "Akan Pindah" : lifecycleStatus === "moved_out" ? "Sudah Pindah" : "Aktif"}
            </span>
          </div>
        </header>

        {/* ── Overdue Flag Alert ── */}
        {tenant.flagged_overdue_at && lifecycleStatus !== "moved_out" && (
          <section className="mt-6 border border-[var(--warn)]/30 bg-[var(--warn)]/5 p-5">
            <div className="flex items-start gap-3">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--warn)]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">Tenant nunggak lebih dari 5 hari tanpa kabar</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">Diflag sejak {flaggedFormatted}. Sistem tidak mengubah status apa pun secara otomatis — keputusan ada di tangan Anda.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void doOverdueAction("tandai_kosong")} className="button-secondary text-xs">
                    Tandai Kamar Kosong
                  </button>
                  <button type="button" onClick={() => void doOverdueAction("masih_tunggu")} className="button-secondary text-xs">
                    Masih Tunggu
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Lifecycle: Akan Pindah ── */}
        {lifecycleStatus === "akan_pindah" && moveOutFormatted && (
          <section className="mt-6 border border-[var(--wood)]/30 bg-[var(--wood)]/5 p-5">
            <div className="flex items-start gap-3">
              <Calendar size={18} className="mt-0.5 shrink-0 text-[var(--wood)]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">Kamar akan kosong pada {moveOutFormatted}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Billing & reminder berjalan normal hingga tanggal tersebut. Kamar otomatis menjadi tersedia saat tanggal tiba.
                </p>
                <button type="button" onClick={() => void cancelMoveOut()} className="mt-3 button-secondary text-xs">
                  Batalkan Status Pindah
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Feedback messages */}
        {message && <p className="mt-4 text-sm text-[var(--sage)]">{message}</p>}
        {error && <p className="mt-4 text-sm text-[var(--warn)]">{error}</p>}

        {/* ── Stats Grid ── */}
        <section className="mt-9 grid gap-4 sm:grid-cols-3">
          <div className="border border-[var(--line)] bg-[#fffefa] p-5">
            <p className="text-xs text-[var(--ink-muted)]">Kamar</p>
            <p className="mt-3 font-mono text-2xl text-[var(--ink)]">{tenant.room?.roomNumber ?? tenant.roomId.slice(-6)}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Tanggal tagihan per bulan: Tgl {tenant.dueDay}</p>
          </div>
          <div className="border border-[var(--line)] bg-[#fffefa] p-5">
            <p className="text-xs text-[var(--ink-muted)]">Mulai tinggal</p>
            <p className="mt-3 font-mono text-2xl text-[var(--ink)]">{new Date(tenant.startedAt).toLocaleDateString("id-ID")}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Tipe: {tenant.payment_type === "tahunan" ? "Tahunan" : "Bulanan"}
            </p>
          </div>
          <div className="border border-[var(--line)] bg-[#fffefa] p-5">
            <p className="text-xs text-[var(--ink-muted)]">{tenant.isCurrentPeriodPaid ? "Jatuh tempo berikutnya" : "Jatuh tempo tagihan"}</p>
            <p className="mt-3 font-mono text-xl text-[var(--ink)]">{dueDateFormatted}</p>
            <p className="mt-1 text-xs text-[var(--wood)]">
              {tenant.isCurrentPeriodPaid ? "✓ Sewa bulan ini sudah lunas" : "⚠ Menunggu pembayaran"}
            </p>
          </div>
        </section>

        {/* ── Keputusan masa sewa ── */}
        <section className="mt-9 border border-[var(--line)] bg-[#fffefa] p-5">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Keputusan masa sewa</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Tentukan apakah tenant akan melanjutkan sewa atau kamar disiapkan untuk penghuni baru.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveDecision("continue")} className="button-primary">Lanjut sewa</button>
            <button type="button" onClick={() => void saveDecision("not_continuing")} className="button-secondary">Tidak lanjut</button>
          </div>
          {tenant.leaseDecision ? (
            <p className="mt-3 text-xs text-[var(--ink-muted)]">
              Keputusan terakhir: {tenant.leaseDecision === "continue" ? "lanjut sewa" : tenant.leaseDecision === "not_continuing" ? "tidak lanjut" : "belum diputuskan"}
            </p>
          ) : null}
        </section>

        {/* ── Set Akan Pindah ── */}
        {lifecycleStatus === "active" && tenant.status === "active" && (
          <section className="mt-6 border border-[var(--line)] bg-[#fffefa] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Set Akan Pindah</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  Catat rencana pindah tenant. Billing tetap berjalan hingga tanggal tersebut.
                </p>
              </div>
              {!showMoveOutForm && (
                <button type="button" onClick={() => setShowMoveOutForm(true)} className="button-secondary shrink-0">
                  Set Tanggal Pindah
                </button>
              )}
            </div>
            {showMoveOutForm && (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1.5">Tanggal pindah</label>
                  <input
                    type="date"
                    className="field-input"
                    value={moveOutInput}
                    onChange={(e) => setMoveOutInput(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <button type="button" onClick={() => void saveMoveOutDate()} className="button-primary" disabled={submitting}>
                  {submitting ? "Menyimpan…" : "Simpan"}
                </button>
                <button type="button" onClick={() => { setShowMoveOutForm(false); setMoveOutInput("") }} className="button-secondary">
                  Batal
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── Riwayat Pembayaran ── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Riwayat pembayaran</h2>
          <div className="mt-5 border border-[var(--line)] bg-[#fffefa]">
            {ledger.length ? <LedgerTable items={ledger} /> : <p className="p-6 text-sm text-[var(--ink-muted)]">Belum ada pembayaran.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
