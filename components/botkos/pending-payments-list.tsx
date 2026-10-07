"use client"

import { useState } from "react"
import { Check, X, ExternalLink, Image as ImageIcon } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"
import { TablePagination } from "./table-pagination"

export type PendingPaymentItem = {
  paymentId: Id<"payments">
  roomNumber: string
  tenantName: string
  billingPeriod?: string
  paidAtDate: string
  amount: number
  proofUrl?: string
}

interface PendingPaymentsListProps {
  items: PendingPaymentItem[]
  onConfirm: (paymentId: Id<"payments">) => Promise<void>
  onReject: (paymentId: Id<"payments">) => Promise<void>
}

const PAGE_SIZE = 5

export function PendingPaymentsList({
  items,
  onConfirm,
  onReject,
}: PendingPaymentsListProps) {
  const [page, setPage] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{
    url: string
    title: string
    paymentId: Id<"payments">
  } | null>(null)

  // Calculate pagination
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedItems = items.slice(startIndex, startIndex + PAGE_SIZE)

  const handleConfirmAction = async (paymentId: Id<"payments">) => {
    setProcessingId(paymentId)
    try {
      await onConfirm(paymentId)
      if (previewImage?.paymentId === paymentId) setPreviewImage(null)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectAction = async (paymentId: Id<"payments">) => {
    setProcessingId(paymentId)
    try {
      await onReject(paymentId)
      if (previewImage?.paymentId === paymentId) setPreviewImage(null)
    } finally {
      setProcessingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-[var(--ink-muted)]">
        Tidak ada pembayaran yang menunggu review saat ini.
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* ── Table Header (Horizontal layout kesamping) ── */}
          <div className="grid grid-cols-[0.9fr_1.3fr_1.1fr_1.2fr_1.2fr_auto] gap-4 border-b border-[var(--line)] bg-[#f4f2ec]/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            <span>Kamar</span>
            <span>Penyewa</span>
            <span>Periode / Tanggal</span>
            <span>Nominal</span>
            <span>Bukti Transfer</span>
            <span className="text-right">Keputusan / Aksi</span>
          </div>

          {/* ── Table Body ── */}
          {paginatedItems.map((item) => {
            const isProcessing = processingId === item.paymentId

            return (
              <div
                key={item.paymentId}
                className="grid grid-cols-[0.9fr_1.3fr_1.1fr_1.2fr_1.2fr_auto] items-center gap-4 border-b border-[var(--line)] px-5 py-3.5 text-sm transition-colors hover:bg-[#fffdfa]"
              >
                {/* 1. Kamar */}
                <span className="font-mono font-semibold text-[var(--ink)]">
                  Kamar {item.roomNumber}
                </span>

                {/* 2. Penyewa */}
                <span className="font-semibold text-[var(--ink)] truncate">
                  {item.tenantName}
                </span>

                {/* 3. Periode & Tanggal */}
                <div className="flex flex-col text-xs font-mono text-[var(--ink-muted)]">
                  <span className="text-[var(--ink)]">
                    {item.billingPeriod ?? "-"}
                  </span>
                  <span className="text-[11px] opacity-75">{item.paidAtDate}</span>
                </div>

                {/* 4. Nominal */}
                <span className="font-mono font-semibold text-[var(--wood)]">
                  Rp {item.amount.toLocaleString("id-ID")}
                </span>

                {/* 5. Bukti Transfer */}
                <div>
                  {item.proofUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImage({
                          url: item.proofUrl!,
                          title: `${item.tenantName} · Kamar ${item.roomNumber}`,
                          paymentId: item.paymentId,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--wood)] hover:underline font-medium"
                    >
                      <ImageIcon size={14} />
                      Lihat bukti
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--ink-muted)] italic">
                      Tidak ada foto
                    </span>
                  )}
                </div>

                {/* 6. Aksi (Setujui / Tolak) */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleConfirmAction(item.paymentId)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1 border border-transparent bg-[var(--wood)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[var(--wood)]/90 disabled:opacity-50"
                  >
                    <Check size={14} />
                    Setujui
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRejectAction(item.paymentId)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1 border border-[var(--line)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-all hover:bg-black/5 disabled:opacity-50"
                  >
                    <X size={14} />
                    Tolak
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Table Pagination (Only shown if > 5 items) ── */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={items.length}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => setPage(p)}
      />

      {/* ── Image Proof Lightbox Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-xl w-full border border-[var(--line)] bg-[#fffefa] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <p className="text-xs font-mono text-[var(--wood)]">
                  Bukti Pembayaran
                </p>
                <h3 className="text-base font-semibold text-[var(--ink)]">
                  {previewImage.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded border border-[var(--line)] p-1 text-[var(--ink-muted)] hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex max-h-[60vh] items-center justify-center overflow-auto border border-[var(--line)] bg-slate-900 p-2">
              <img
                src={previewImage.url}
                alt="Bukti pembayaran"
                className="max-h-[55vh] max-w-full object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--wood)] hover:underline"
              >
                Buka di tab baru <ExternalLink size={13} />
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void handleConfirmAction(previewImage.paymentId)
                  }
                  className="button-primary text-xs py-1.5 px-3"
                >
                  <Check size={14} /> Setujui
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleRejectAction(previewImage.paymentId)
                  }
                  className="button-secondary text-xs py-1.5 px-3"
                >
                  <X size={14} /> Tolak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
