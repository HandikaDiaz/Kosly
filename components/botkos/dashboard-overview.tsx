"use client"

import Link from "next/link"
import { ArrowUpRight, CalendarClock, CircleAlert, Plus, WalletCards } from "lucide-react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import { propertyTabUrl } from "@/lib/propertyTabs"
import { RoomTag } from "./room-tag"
import { LedgerTable } from "./ledger-table"
import { DashboardAnalytics } from "./dashboard-analytics"
import { SubscriptionBanner } from "./subscription-banner"
import { PageLoader } from "./page-loader"

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`

export function DashboardOverview() {
  const [now] = useState(() => Date.now())
  const data = useQuery(api.dashboard.getOverview, { now })
  if (!data) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat ringkasan dashboard…"
        submessage="Mengumpulkan performa sewa dan okupansi kamar Anda"
      />
    )
  }
  const firstProperty = data.properties[0]
  const ledger = data.recentPayments.map((payment) => ({
    room: payment.roomNumber,
    tenant: payment.tenantName,
    period: (payment as typeof payment & { billingPeriod?: string }).billingPeriod,
    date: new Date(payment.paidAt).toLocaleDateString("id-ID"),
    amount: money(payment.amount),
    status: payment.status === "confirmed" ? ("paid" as const) : payment.status === "rejected" ? ("rejected" as const) : ("pending" as const),
  }))

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">Ringkasan operasional</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              Selamat datang, {data.owner.name ?? "Owner"}.
            </h1>
          </div>
          <Link href="/onboarding" className="button-secondary w-fit">
            <Plus size={16} />Tambah properti
          </Link>
        </header>
        <SubscriptionBanner />

        <section className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Main Stat Card - Expected Monthly Rent */}
          <div className="border border-[var(--gold)] bg-[#191512] p-6 text-[#FCFBF9] shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-[#A39B92]">Sewa masuk bulan ini</p>
                <p className="mt-3 font-mono text-3xl tracking-[-0.06em] text-[#F4D084]">
                  {money(data.totals.expectedMonthlyRent)}
                </p>
              </div>
              <div className="rounded-md border border-[var(--gold)] bg-[#26201B] p-2 text-[var(--gold)]">
                <WalletCards size={20} />
              </div>
            </div>
            <div className="mt-6 border-t border-[#332B25] pt-3 text-xs text-[#A39B92]">
              Sudah masuk: <span className="font-semibold text-[#FCFBF9]">{money(data.totals.collectedMonthlyRent)}</span>
            </div>
          </div>

          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <p className="text-sm text-[var(--ink-muted)]">Belum dibayar bulan ini</p>
            <p className="mt-3 font-mono text-3xl tracking-[-0.06em] text-[var(--warn)]">
              {money(data.totals.unpaidMonthlyRent)}
            </p>
            <p className="mt-6 text-xs text-[var(--ink-muted)]">
              {data.totals.overduePayments} telat · {data.totals.unpaidChargesCount} tagihan terbuka
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <p className="text-sm text-[var(--ink-muted)]">Kamar kosong &amp; akan kosong</p>
            <p className="mt-3 font-mono text-3xl tracking-[-0.06em] text-[var(--ink)]">
              {data.totals.availableRooms} <span className="text-base font-normal text-[var(--ink-muted)]">kosong</span>
            </p>
            <p className="mt-6 text-xs text-[var(--ink-muted)]">
              {data.totals.vacatingRoomsCount} penghuni akan pindah · {data.totals.occupiedRooms}/{data.totals.rooms} terisi
            </p>
          </div>

          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <p className="text-sm text-[var(--ink-muted)]">Menunggu review</p>
            <p className="mt-3 font-mono text-3xl tracking-[-0.06em] text-[var(--gold)]">
              {data.totals.pendingPayments}
            </p>
            <p className="mt-6 text-xs text-[var(--ink-muted)]">
              Bukti transfer baru · {data.totals.activeBookings} booking aktif
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h2 className="font-semibold text-[var(--ink)]">Belum bayar &amp; jatuh tempo</h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Diurutkan dari yang paling mendesak</p>
              </div>
              <Link href="/dashboard/payments" className="text-xs font-semibold text-[var(--gold-dark)] hover:underline">
                Kelola tagihan <ArrowUpRight className="inline" size={13} />
              </Link>
            </div>
            {data.unpaidCharges.length ? (
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {data.unpaidCharges.slice(0, 6).map((charge) => (
                  <li key={charge._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        Kamar {charge.roomNumber} · {charge.tenantName}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {charge.propertyName} · Jatuh tempo {new Date(charge.dueDate).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold text-[var(--ink)]">{money(charge.amount)}</p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          charge.isOverdue
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {charge.isOverdue ? "Telat bayar" : "Belum bayar"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--ink-muted)]">Semua tagihan sewa saat ini sudah lunas.</p>
            )}
          </div>

          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h2 className="font-semibold text-[var(--ink)]">Kamar akan kosong</h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Penghuni yang berencana pindah / tidak lanjut</p>
              </div>
              <Link href="/dashboard/tenants" className="text-xs font-semibold text-[var(--gold-dark)] hover:underline">
                Lihat penghuni <ArrowUpRight className="inline" size={13} />
              </Link>
            </div>
            {data.vacatingTenants.length ? (
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {data.vacatingTenants.slice(0, 6).map((tenant) => (
                  <li key={tenant._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        Kamar {tenant.roomNumber} · {tenant.tenantName}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">{tenant.propertyName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {tenant.moveOutDate
                        ? `Keluar ${new Date(tenant.moveOutDate).toLocaleDateString("id-ID")}`
                        : "Akan pindah"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--ink-muted)]">
                Belum ada penghuni yang tercatat akan pindah. Saat ini ada {data.totals.availableRooms} kamar kosong.
              </p>
            )}
          </div>
        </section>

        <DashboardAnalytics data={data.analytics} />

        {firstProperty ? (
          <section className="mt-12">
            <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
              <div>
                <p className="text-sm text-[var(--ink-muted)]">Rak kamar</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {firstProperty.name}
                </h2>
              </div>
              <Link
              href={propertyTabUrl(String(firstProperty._id), "summary")}
                className="text-sm font-semibold text-[var(--gold-dark)] hover:underline"
              >
                Kelola kamar <ArrowUpRight className="ml-1 inline" size={15} />
              </Link>
            </div>
            <div className="mt-7 flex gap-4 overflow-x-auto pb-3">
              {firstProperty.rooms.slice(0, 12).map((room) => (
                <RoomTag
                  key={room._id}
                  number={room.roomNumber}
                  rent={(room.monthlyRent / 1000000).toFixed(2).replace(".00", "") + " jt"}
                  status={room.status}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="mt-12 border border-dashed border-[var(--line)] p-8 text-sm text-[var(--ink-muted)]">
            Belum ada properti. Selesaikan onboarding untuk membuat link pendaftaran.
          </div>
        )}

        <section className="mt-12">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-sm text-[var(--ink-muted)]">Buku besar</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                Pembayaran terbaru
              </h2>
            </div>
            <Link href="/dashboard/payments" className="text-sm font-semibold text-[var(--gold-dark)] hover:underline">
              Lihat semua <ArrowUpRight className="ml-1 inline" size={15} />
            </Link>
          </div>
          <div className="mt-5 border border-[var(--line)] bg-[#FFFFFF]">
            {ledger.length ? <LedgerTable items={ledger} /> : <p className="p-6 text-sm text-[var(--ink-muted)]">Belum ada pembayaran.</p>}
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6">
            <div className="flex items-center gap-3">
              <CalendarClock className="text-[var(--gold)]" size={19} />
              <h2 className="font-semibold text-[var(--ink)]">Kondisi kamar</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
              {data.totals.availableRooms} kosong · {data.totals.bookedRooms} dipesan · {data.totals.occupiedRooms} terisi.
            </p>
          </div>
          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6">
            <div className="flex items-center gap-3">
              <CircleAlert className="text-[var(--gold)]" size={19} />
              <h2 className="font-semibold text-[var(--ink)]">Booking aktif</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
              Ada {data.totals.activeBookings} booking yang perlu dipantau sampai pelunasan.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
