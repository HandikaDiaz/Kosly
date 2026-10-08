"use client"

import { useState } from "react"
import { StatusBadge, type Status } from "./status-badge"
import { TablePagination } from "./table-pagination"

type LedgerItem = {
  room: string
  tenant: string
  date: string
  amount: string
  status: Status
  period?: string
  actions?: React.ReactNode
}

const PAGE_SIZE = 5

export function LedgerTable({ items, primaryLabel = "Kamar" }: { items: LedgerItem[]; primaryLabel?: string }) {
  const [page, setPage] = useState(1)
  const hasPeriod = items.some((item) => Boolean(item.period))
  const hasActions = items.some((item) => Boolean(item.actions))
  const gridClass = hasPeriod
    ? hasActions ? "grid-cols-[1fr_1.2fr_1fr_1fr_1fr_auto_auto]" : "grid-cols-[1fr_1.2fr_1fr_1fr_1fr_auto]"
    : hasActions ? "grid-cols-[1fr_1.5fr_1fr_1fr_auto_auto]" : "grid-cols-[1fr_1.5fr_1fr_1fr_auto]"

  // Calculate pagination
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedItems = items.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* ── Table Header ── */}
          <div
            className={`grid ${gridClass} gap-4 border-b border-[var(--line)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]`}
          >
            <span>{primaryLabel}</span>
            <span>Penyewa</span>
            {hasPeriod && <span>Periode</span>}
            <span>Tanggal</span>
            <span className="text-right">Jumlah</span>
            <span>Status</span>
            {hasActions ? <span className="text-right">Review</span> : null}
          </div>

          {/* ── Table Body ── */}
          {paginatedItems.map((item, idx) => (
            <div
              key={`${item.room}-${item.date}-${idx}`}
                className={`grid ${gridClass} items-center gap-4 border-b border-[var(--line)] px-5 py-3.5 text-sm transition-colors hover:bg-[#fffdfa]`}
            >
              <span className="font-mono font-semibold text-[var(--ink)]">
                {item.room}
              </span>
              <span className="text-[var(--ink)] font-medium">{item.tenant}</span>
              {hasPeriod && (
                <span className="font-mono text-xs text-[var(--wood)]">
                  {item.period ?? "-"}
                </span>
              )}
              <span className="font-mono text-xs text-[var(--ink-muted)]">
                {item.date}
              </span>
              <span className="text-right font-mono font-semibold text-[var(--ink)]">
                {item.amount}
              </span>
              <StatusBadge status={item.status} />
              {hasActions ? <div className="flex justify-end gap-2">{item.actions}</div> : null}
            </div>
          ))}
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
    </div>
  )
}

export type { LedgerItem }
