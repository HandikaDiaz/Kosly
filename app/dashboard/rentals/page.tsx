"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  CircleCheck,
  Clock3,
  Search,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import { getRentStatus, type RentStatus } from "@/lib/rent-status"
import { TablePagination } from "@/components/botkos/table-pagination"

const statusCopy: Record<RentStatus, { label: string; className: string }> = {
  paid: { label: "Lunas", className: "status-paid" },
  overdue: { label: "Terlambat", className: "status-overdue" },
  due_soon: { label: "Segera jatuh tempo", className: "status-warning" },
  upcoming: { label: "Akan datang", className: "status-neutral" },
}

const formatDate = (value: number) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

const daysFromNow = (value: number, now: number) =>
  Math.ceil((value - now) / (24 * 60 * 60 * 1000))

const PAGE_SIZE = 5

export default function RentalsPage() {
  const [now] = useState(() => Date.now())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [propertyFilter, setPropertyFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const rows = useQuery(api.rentals.listMine, { now })
  const properties = useQuery(api.properties.listMine)

  if (!rows || !properties) {
    return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat status sewa…</div>
  }

  const enriched = rows.map((row) => ({
    ...row,
    status: getRentStatus({
      isPaid: row.currentCharge?.status === "paid",
      dueDate: row.nextDueDate,
      now,
    }),
  }))

  const counts = {
    paid: enriched.filter((row) => row.status === "paid").length,
    dueSoon: enriched.filter((row) => row.status === "due_soon").length,
    overdue: enriched.filter((row) => row.status === "overdue").length,
  }

  // Filtered rows by search, status, and property
  const filtered = enriched.filter((row) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      row.tenant.name.toLowerCase().includes(q) ||
      (row.room?.roomNumber ?? "").toLowerCase().includes(q) ||
      row.property.name.toLowerCase().includes(q)

    const matchesStatus = statusFilter === "all" || row.status === statusFilter
    const matchesProperty =
      propertyFilter === "all" || row.property._id === propertyFilter

    return matchesSearch && matchesStatus && matchesProperty
  })

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ── */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">Kontrol jatuh tempo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              Sewa kamar
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
              Pantau kamar yang sudah lunas, mendekati jatuh tempo, atau perlu segera
              ditindaklanjuti.
            </p>
          </div>
          <Link href="/dashboard/payments" className="button-secondary shrink-0">
            Review pembayaran <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* ── Summary Stats ── */}
        <section className="mt-9 grid gap-4 sm:grid-cols-3">
          <div className="border border-[var(--line)] bg-[#fffefa] p-5">
            <CircleCheck size={18} className="text-[var(--sage)]" />
            <p className="mt-4 text-2xl font-semibold text-[var(--ink)]">{counts.paid}</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Sudah lunas</p>
          </div>
          <div className="border border-[var(--line)] bg-[#fffefa] p-5">
            <Clock3 size={18} className="text-[var(--wood)]" />
            <p className="mt-4 text-2xl font-semibold text-[var(--ink)]">
              {counts.dueSoon}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Jatuh tempo ≤ 7 hari</p>
          </div>
          <div className="border border-[var(--line)] bg-[#fffefa] p-5">
            <CircleAlert size={18} className="text-[var(--warn)]" />
            <p className="mt-4 text-2xl font-semibold text-[var(--ink)]">
              {counts.overdue}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Sudah terlambat</p>
          </div>
        </section>

        {/* ── Search & Filter Section ── */}
        <div className="mt-8 flex flex-col gap-3 border border-[var(--line)] bg-[#fffefa] p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="text"
              className="field-input pl-10"
              placeholder="Cari nama tenant, nomor kamar, atau properti…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            {/* Property Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <Building2 size={15} className="text-[var(--wood)] shrink-0" />
              <select
                className="field-input w-full sm:w-auto font-medium"
                value={propertyFilter}
                onChange={(e) => {
                  setPropertyFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">Semua Properti</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <SlidersHorizontal size={15} className="text-[var(--wood)] shrink-0" />
              <select
                className="field-input w-full sm:w-auto font-medium"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">Semua Status</option>
                <option value="paid">Lunas</option>
                <option value="due_soon">Segera Jatuh Tempo</option>
                <option value="overdue">Terlambat</option>
                <option value="upcoming">Akan Datang</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table & List Section ── */}
        <section className="mt-4 overflow-hidden border border-[var(--line)] bg-[#fffefa]">
          <div className="hidden grid-cols-[.8fr_1.5fr_1.2fr_1fr_1fr_auto] gap-4 border-b border-[var(--line)] bg-[#f4f2ec]/50 px-5 py-3 text-xs font-semibold text-[var(--ink-muted)] lg:grid uppercase tracking-wider">
            <span>Kamar</span>
            <span>Tenant</span>
            <span>Properti</span>
            <span>Status</span>
            <span>Jatuh tempo</span>
            <span />
          </div>

          {paginatedRows.map((row) => {
            const status = statusCopy[row.status]
            const days = daysFromNow(row.nextDueDate, now)
            return (
              <Link
                href={`/dashboard/tenants/${row.tenant._id}`}
                key={row.tenant._id}
                className="grid gap-3 border-b border-[var(--line)] px-5 py-4 transition-colors last:border-0 hover:bg-[var(--background)] lg:grid-cols-[.8fr_1.5fr_1.2fr_1fr_1fr_auto] lg:items-center lg:gap-4"
              >
                <div>
                  <p className="font-mono text-lg font-semibold text-[var(--ink)]">
                    {row.room?.roomNumber ?? "-"}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Rp {row.room?.monthlyRent.toLocaleString("id-ID") ?? "-"}/bln
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[var(--ink)]">{row.tenant.name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Jatuh tempo tiap tanggal {row.tenant.dueDay}
                  </p>
                </div>

                <p className="text-sm text-[var(--ink-muted)]">{row.property.name}</p>

                <span className={`status-pill w-fit ${status.className}`}>
                  {status.label}
                </span>

                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {formatDate(row.nextDueDate)}
                  </p>
                  <p
                    className={`text-xs ${
                      days < 0 ? "text-[var(--warn)] font-medium" : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {row.status === "paid"
                      ? "Tagihan berikutnya"
                      : days < 0
                      ? `${Math.abs(days)} hari terlambat`
                      : `${days} hari lagi`}
                  </p>
                </div>

                <ArrowUpRight size={16} className="text-[var(--ink-muted)]" />
              </Link>
            )
          })}

          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-[var(--ink-muted)]">
              <WalletCards className="mx-auto mb-3 opacity-60" size={24} />
              {searchQuery || statusFilter !== "all" || propertyFilter !== "all"
                ? "Tidak ada data sewa kamar yang cocok dengan kriteria pencarian/filter."
                : "Belum ada tenant aktif."}
            </div>
          )}

          {/* Pagination Component (5 items per page) */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => setPage(p)}
          />
        </section>
      </div>
    </div>
  )
}

