"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LedgerTable } from "./ledger-table"
import { PendingPaymentsList, type PendingPaymentItem } from "./pending-payments-list"
import { Clock, CheckCircle2, Receipt } from "lucide-react"

export function PaymentsLive() {
  const rows = useQuery(api.payments.listMine)
  const confirmMutation = useMutation(api.payments.confirm)
  const rejectMutation = useMutation(api.payments.reject)

  if (!rows) {
    return (
      <div className="p-8 text-sm text-[var(--ink-muted)]">
        Memuat data pembayaran…
      </div>
    )
  }

  // Filter pending review rows
  const pendingRows = rows.filter(
    (row) => row.payment.status === "pending_review"
  )

  // Map pending items for table list
  const pendingItems: PendingPaymentItem[] = pendingRows.map((row) => ({
    paymentId: row.payment._id,
    roomNumber: row.room?.roomNumber ?? "-",
    tenantName: row.tenant?.name ?? "Tenant",
    billingPeriod: row.payment.billingPeriod,
    paidAtDate: new Date(row.payment.paidAt).toLocaleDateString("id-ID"),
    amount: row.payment.amount,
    proofUrl: row.proofUrl ?? undefined,
  }))

  // Map history items for LedgerTable
  const historyItems = rows
    .filter((row) => row.payment.status !== "pending_review")
    .map((row) => ({
      room: `Kamar ${row.room?.roomNumber ?? "-"}`,
      tenant: row.tenant?.name ?? "Tenant",
      period: row.payment.billingPeriod,
      date: new Date(row.payment.paidAt).toLocaleDateString("id-ID"),
      amount: `Rp ${row.payment.amount.toLocaleString("id-ID")}`,
      status:
        row.payment.status === "confirmed"
          ? ("paid" as const)
          : ("rejected" as const),
    }))

  const confirmedCount = rows.filter(
    (row) => row.payment.status === "confirmed"
  ).length

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ── */}
        <p className="text-sm text-[var(--ink-muted)]">Keuangan &amp; Transaksi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Pembayaran
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
          Kelola bukti transfer dari penyewa. Persetujuan pembayaran tetap dilakukan
          secara manual oleh pemilik kos.
        </p>

        {/* ── Summary Cards Header ── */}
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="border border-[var(--line)] bg-[#fffefa] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--wood)]">
              <Clock size={15} />
              Menunggu Review
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[var(--ink)]">
              {pendingRows.length} <span className="text-xs font-normal text-[var(--ink-muted)]">transaksi</span>
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[#fffefa] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sage)]">
              <CheckCircle2 size={15} />
              Telah Dikonfirmasi
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[var(--ink)]">
              {confirmedCount} <span className="text-xs font-normal text-[var(--ink-muted)]">transaksi</span>
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[#fffefa] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
              <Receipt size={15} />
              Total Catatan
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[var(--ink)]">
              {rows.length} <span className="text-xs font-normal text-[var(--ink-muted)]">transaksi</span>
            </p>
          </div>
        </div>

        {/* ── Section 1: Menunggu Keputusan (List Tabel Kesamping) ── */}
        <section className="mt-9 border border-[var(--line)] bg-[#fffefa]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-semibold text-[var(--ink)]">
                Menunggu keputusan ({pendingRows.length})
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                Periksa detail transfer dan berikan persetujuan atau penolakan.
              </p>
            </div>
          </div>

          {/* List Kesamping */}
          <PendingPaymentsList
            items={pendingItems}
            onConfirm={async (paymentId) => {
              await confirmMutation({ paymentId })
            }}
            onReject={async (paymentId) => {
              await rejectMutation({
                paymentId,
                reason: "Ditolak oleh owner.",
              })
            }}
          />
        </section>

        {/* ── Section 2: Riwayat Pembayaran (Ledger Table Kesamping) ── */}
        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--ink)]">
              Riwayat pembayaran
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Daftar transaksi yang sudah disetujui atau ditolak sebelumnya.
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[#fffefa]">
            {historyItems.length ? (
              <LedgerTable items={historyItems} />
            ) : (
              <p className="p-6 text-sm text-[var(--ink-muted)]">
                Belum ada riwayat pembayaran yang diverifikasi.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
