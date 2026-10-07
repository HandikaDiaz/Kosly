"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Building2,
  Phone,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import { TablePagination } from "@/components/botkos/table-pagination"

const PAGE_SIZE = 5

const tenantStatusCopy: Record<string, { label: string; className: string }> = {
  active: { label: "Aktif", className: "status-paid" },
  pending: { label: "Pending", className: "status-warning" },
  inactive: { label: "Non-aktif", className: "status-neutral" },
}

export default function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [propertyFilter, setPropertyFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const tenants = useQuery(api.tenants.listMine)
  const properties = useQuery(api.properties.listMine)

  if (!tenants || !properties) {
    return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat data tenant…</div>
  }

  // Filter tenants by search, status, and property
  const filtered = tenants.filter(({ tenant, property, room }) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      tenant.name.toLowerCase().includes(q) ||
      tenant.phone.toLowerCase().includes(q) ||
      (room?.roomNumber ?? "").toLowerCase().includes(q) ||
      (property?.name ?? "").toLowerCase().includes(q)

    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter
    const matchesProperty =
      propertyFilter === "all" || tenant.propertyId === propertyFilter

    return matchesSearch && matchesStatus && matchesProperty
  })

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedTenants = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ── */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">Data penyewa</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              Tenant
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
              Kelola daftar penyewa kos, kontak, status masa sewa, dan properti yang ditempati.
            </p>
          </div>
        </div>

        {/* ── Search & Filter Section ── */}
        <div className="mt-8 flex flex-col gap-3 border border-[var(--line)] bg-[#fffefa] p-4 md:flex-row md:items-center md:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="text"
              className="field-input pl-10"
              placeholder="Cari nama tenant, no. telepon, nomor kamar, atau properti…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Filters */}
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
                <option value="active">Aktif</option>
                <option value="pending">Pending</option>
                <option value="inactive">Non-aktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table & List Section ── */}
        <section className="mt-4 overflow-hidden border border-[var(--line)] bg-[#fffefa]">
          <div className="hidden grid-cols-[1.5fr_1.2fr_1fr_1fr_auto] gap-4 border-b border-[var(--line)] bg-[#f4f2ec]/50 px-5 py-3 text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider md:grid">
            <span>Tenant</span>
            <span>Properti & Kamar</span>
            <span>No. Telepon</span>
            <span>Status</span>
            <span />
          </div>

          {paginatedTenants.map(({ tenant, property, room }) => {
            const statusConfig = tenantStatusCopy[tenant.status] ?? {
              label: tenant.status,
              className: "status-neutral",
            }

            return (
              <Link
                key={tenant._id}
                href={`/dashboard/tenants/${tenant._id}`}
                className="grid gap-3 border-b border-[var(--line)] px-5 py-4 transition-colors last:border-0 hover:bg-[var(--background)] md:grid-cols-[1.5fr_1.2fr_1fr_1fr_auto] md:items-center md:gap-4"
              >
                {/* Tenant Name */}
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--wood)]/10 text-[var(--wood)]">
                    <Users size={16} />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{tenant.name}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      Tanggal jatuh tempo: setiap tgl {tenant.dueDay}
                    </p>
                  </div>
                </div>

                {/* Property & Room */}
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {property?.name ?? "-"}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Kamar {room?.roomNumber ?? "-"}
                  </p>
                </div>

                {/* Contact Phone */}
                <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                  <Phone size={13} className="shrink-0 text-[var(--wood)]" />
                  <span>{tenant.phone || "-"}</span>
                </div>

                {/* Status */}
                <div>
                  <span className={`status-pill w-fit ${statusConfig.className}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Action arrow */}
                <ArrowUpRight size={16} className="text-[var(--ink-muted)]" />
              </Link>
            )
          })}

          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-[var(--ink-muted)]">
              <Users className="mx-auto mb-3 opacity-60" size={24} />
              {searchQuery || statusFilter !== "all" || propertyFilter !== "all"
                ? "Tidak ada tenant yang cocok dengan kriteria pencarian atau filter."
                : "Belum ada tenant."}
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

