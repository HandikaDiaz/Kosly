"use client"

import { useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Link as LinkIcon,
  LoaderCircle,
  Plus,
  RotateCcw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react"

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

export const TenantRaporSection = ({
  records,
  consent,
  preview,
  consentText,
  shares = [],
  view = "all",
}: {
  records: RecordItem[]
  consent: Consent
  preview: Preview
  consentText: {
    version: string
    title: string
    paragraphs: readonly string[]
    buttons: { agree: string; decline: string }
  }
  shares?: Share[]
  view?: "all" | "payments" | "rapor"
}) => {
  const [targetPeriodId, setTargetPeriodId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState("sudah_bayar")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Share link creation states
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [shareLabel, setShareLabel] = useState("")
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  const callDispute = async (body: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/penghuni/disputes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error("Permintaan sengketa belum dapat diproses.")
      window.location.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan belum dapat diproses.")
    } finally {
      setBusy(false)
    }
  }

  const consentCall = async (action: "grant" | "withdraw") => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/penghuni/rapor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, textVersion: consentText.version }),
      })
      if (!response.ok) throw new Error("Persetujuan belum dapat disimpan.")
      window.location.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Persetujuan belum dapat disimpan.")
    } finally {
      setBusy(false)
    }
  }

  const handleCreateShare = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setShareFeedback(null)
    try {
      const res = await fetch("/api/penghuni/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", forLabel: shareLabel.trim() || undefined }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? "Gagal membuat tautan berbagi.")
      setShareFeedback("Tautan berhasil dibuat! Silakan salin tautan di bawah.")
      setShareLabel("")
      setIsCreatingShare(false)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tautan.")
    } finally {
      setBusy(false)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm("Apakah Anda yakin ingin mencabut tautan ini? Calon pemilik kos tidak akan dapat membukanya lagi.")) return
    setBusy(true)
    try {
      await fetch("/api/penghuni/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke", shareId }),
      })
      window.location.reload()
    } catch {
      setError("Gagal mencabut tautan.")
      setBusy(false)
    }
  }

  const handleCopyLink = async (share: Share) => {
    const fullUrl = `${window.location.origin}/rapor/${share.shareId}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedShareId(share.shareId)
      setTimeout(() => setCopiedShareId(null), 2500)
    } catch {
      // fallback
    }
  }

  const showPayments = view === "all" || view === "payments"
  const showRapor = view === "all" || view === "rapor"

  return (
    <div className="space-y-10">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 animate-in fade-in">
          {error}
        </div>
      )}

      {/* ── Section 1: Payment Records & Disputes ── */}
      {showPayments && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                Riwayat Pembayaran Sewa
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Daftar pembayaran sewa yang tercatat dan terkonfirmasi di kos Anda.
              </p>
            </div>
            <span className="rounded-full bg-[var(--gold-pale)] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
              {records.reduce((acc, r) => acc + r.periods.length, 0)} Periode Tercatat
            </span>
          </div>

          {records.length > 0 ? (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={`${record.propertyName}-${record.periodLabel}`}
                  className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"
                >
                  <div className="border-b border-[var(--line)] bg-[var(--background)]/60 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-[var(--ink)]">
                      {record.propertyName}
                    </p>
                    <span className="text-xs font-medium text-[var(--ink-muted)]">
                      {record.periodLabel}
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--line)] p-2 sm:p-3">
                    {record.periods.map((period) => (
                      <div
                        key={period.periodId}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 transition hover:bg-[var(--background)]/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar size={15} className="text-[var(--wood)] shrink-0" />
                          <span className="text-xs font-medium text-[var(--ink)]">
                            {period.monthLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {period.disputeStatus ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200">
                              <ShieldAlert size={12} />
                              Sengketa: {period.disputeStatus}
                            </span>
                          ) : period.status === "tepat_waktu" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Tepat Waktu
                            </span>
                          ) : period.status === "terlambat" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              <Clock size={12} />
                              Terlambat {period.daysLate ? `${period.daysLate} hari` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 border border-red-200">
                              <AlertCircle size={12} />
                              Belum Dibayar
                            </span>
                          )}

                          {!period.disputeStatus && (
                            <button
                              type="button"
                              onClick={() => setTargetPeriodId(period.periodId)}
                              className="text-[11px] font-semibold text-[var(--ink-muted)] hover:text-[var(--gold-dark)] hover:underline"
                            >
                              Pertanyakan
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--background)] p-8 text-center">
              <Calendar size={32} className="mx-auto text-[var(--ink-muted)] opacity-60" />
              <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
                Belum Ada Catatan Pembayaran
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--ink-muted)]">
                Catatan pembayaran akan muncul setelah pemilik kos mengonfirmasi pembayaran bulanan Anda.
              </p>
            </div>
          )}

          {/* ── Dispute Modal / Form Box ── */}
          {targetPeriodId && (
            <div className="rounded-2xl border-2 border-[var(--gold)]/40 bg-white p-5 shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                <HelpCircle size={17} className="text-[var(--gold-dark)]" />
                <span>Pertanyakan Catatan Pembayaran</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                Periode yang dipertanyakan tidak akan dihitung ke Rapor selama proses sengketa berlangsung. Pemilik kos memiliki 14 hari untuk merespons.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="dispute-reason" className="block text-xs font-semibold text-[var(--ink)]">
                    Alasan Sengketa
                  </label>
                  <select
                    id="dispute-reason"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="field-input mt-1.5 text-xs"
                  >
                    <option value="sudah_bayar">Sudah bayar tepat waktu</option>
                    <option value="tanggal_salah">Tanggal pencatatan salah</option>
                    <option value="bukan_masa_tinggal_saya">Bukan masa tinggal saya</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="dispute-note" className="block text-xs font-semibold text-[var(--ink)]">
                      Catatan Penjelasan (Opsional)
                    </label>
                    <span className="text-[11px] text-[var(--ink-muted)]">{note.length}/300</span>
                  </div>
                  <textarea
                    id="dispute-note"
                    maxLength={300}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tuliskan keterangan detail atau bukti transfer yang relevan..."
                    className="field-input mt-1.5 min-h-[80px] text-xs"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setTargetPeriodId(null)}
                  className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink-muted)] hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void callDispute({
                      action: "create",
                      periodId: targetPeriodId,
                      reason: disputeReason,
                      note: note.trim() || undefined,
                    })
                  }
                  className="button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
                >
                  {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Kirim Pertanyaan Sengketa</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Section 2: Rapor Certificate & Share Links ── */}
      {showRapor && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
              Rapor Penghuni & Tautan Berbagi
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Pratinjau sertifikat Rapor Penghuni dan kelola tautan berbagi untuk calon pemilik kos baru Anda.
            </p>
          </div>

          {/* Rapor Preview Card */}
          <div className="overflow-hidden rounded-2xl border-2 border-[var(--line)] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold-pale)] text-[var(--gold-dark)]">
                  <Award size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold-dark)]">
                    Pratinjau Rapor Resmi
                  </p>
                  <p className="font-semibold text-sm text-[var(--ink)]">
                    Status Rekam Jejak Sewa
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                {preview.available ? "Rapor Tersedia" : "Belum Cukup Data"}
              </span>
            </div>

            <div className="mt-5">
              {preview.available ? (
                <div>
                  <div className="rounded-xl border border-[var(--gold)]/30 bg-gradient-to-r from-[var(--gold-pale)]/40 to-amber-50/20 p-5 text-center">
                    <p className="text-xs text-[var(--ink-muted)]">Kategori Ketepatan Pembayaran</p>
                    <p className="mt-1 text-2xl font-extrabold text-[var(--ink)]">
                      {preview.tierLabel ?? preview.label}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                      Bulan Terbit: {preview.generatedMonth ?? "Bulan ini"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                      <p className="text-[11px] text-[var(--ink-muted)]">Total Kos</p>
                      <p className="font-bold text-base text-[var(--ink)]">{preview.tenancyBucket ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                      <p className="text-[11px] text-[var(--ink-muted)]">Lama Tinggal</p>
                      <p className="font-bold text-base text-[var(--ink)]">{preview.monthsBucket ?? "-"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--background)] p-6 text-center text-xs text-[var(--ink-muted)] leading-5">
                  <p className="font-semibold text-[var(--ink)]">Rapor Belum Tersedia</p>
                  <p className="mt-1">
                    Anda membutuhkan setidaknya satu masa tinggal yang dikonfirmasi dan pembayaran sewa terverifikasi untuk menghasilkan Rapor Penghuni.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Consent Agreement Box */}
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--wood)]" />
              <h3 className="font-bold text-sm text-[var(--ink)]">{consentText.title}</h3>
            </div>

            <div className="mt-3 space-y-2 text-xs leading-5 text-[var(--ink-muted)]">
              {consentText.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    consent.active && !consent.needsReconsent ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Status: {consent.active && !consent.needsReconsent ? "Persetujuan Aktif" : "Belum Aktif"}
                </span>
              </div>

              {consent.active && !consent.needsReconsent ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void consentCall("withdraw")}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Tarik Persetujuan
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void consentCall("grant")}
                  className="button-primary px-4 py-2 text-xs font-semibold"
                >
                  {consentText.buttons.agree}
                </button>
              )}
            </div>
          </div>

          {/* Active Shares List & Creation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--ink)]">Tautan Berbagi Rapor</h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Tautan rahasia satu kali buka yang dapat Anda berikan kepada calon pemilik kos.
                </p>
              </div>

              {consent.active && !isCreatingShare && (
                <button
                  type="button"
                  onClick={() => setIsCreatingShare(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-sm hover:bg-[var(--background)]"
                >
                  <Plus size={14} />
                  <span>Buat Tautan</span>
                </button>
              )}
            </div>

            {shareFeedback && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {shareFeedback}
              </div>
            )}

            {/* Create Share Modal / Inline Card */}
            {isCreatingShare && (
              <form
                onSubmit={handleCreateShare}
                className="rounded-2xl border-2 border-[var(--gold)]/40 bg-white p-5 shadow-sm animate-in fade-in"
              >
                <h4 className="font-bold text-xs text-[var(--ink)]">Buat Tautan Berbagi Baru</h4>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  Tautan ini berlaku selama 7 hari dan hanya dapat dibuka satu kali.
                </p>

                <div className="mt-3">
                  <label htmlFor="share-label" className="block text-xs font-semibold text-[var(--ink)]">
                    Label Catatan (Opsional)
                  </label>
                  <input
                    id="share-label"
                    type="text"
                    value={shareLabel}
                    onChange={(e) => setShareLabel(e.target.value)}
                    placeholder="Contoh: Untuk Pemilik Kos Lavender"
                    className="field-input mt-1.5 text-xs"
                    maxLength={50}
                  />
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingShare(false)}
                    className="rounded-xl border border-[var(--line)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="button-primary inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold"
                  >
                    {busy ? <LoaderCircle size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                    <span>Buat Sekarang</span>
                  </button>
                </div>
              </form>
            )}

            {shares.length > 0 ? (
              <div className="space-y-3">
                {shares.map((share) => {
                  const isCopied = copiedShareId === share.shareId
                  const isActive = share.status === "active"

                  return (
                    <div
                      key={share.shareId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <LinkIcon size={15} className="text-[var(--wood)] shrink-0" />
                          <p className="font-semibold text-xs text-[var(--ink)] truncate">
                            {share.forLabel || "Tautan Rapor Penghuni"}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isActive ? "Aktif" : share.status === "revealed" ? "Sudah Dibuka" : "Kedaluwarsa/Dicabut"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                          Kedaluwarsa: {new Date(share.expiresAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(share)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--background)] shadow-sm"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span>{isCopied ? "Tersalin!" : "Salin Tautan"}</span>
                          </button>
                        )}
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleRevokeShare(share.shareId)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            title="Cabut tautan"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-muted)] italic">
                Belum ada tautan berbagi yang dibuat.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
