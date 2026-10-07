"use client"

import Link from "next/link"
import { ArrowUpRight, CalendarClock, CircleAlert, Plus, WalletCards } from "lucide-react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import { RoomTag } from "./room-tag"
import { LedgerTable } from "./ledger-table"
import { DashboardAnalytics } from "./dashboard-analytics"
import { SubscriptionBanner } from "./subscription-banner"

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`

export function DashboardOverview() {
  const [now] = useState(() => Date.now())
  const data = useQuery(api.dashboard.getOverview, { now })
  if (!data) return <div className="p-8 text-sm text-[var(--ink-muted)]">Memuat data dashboard…</div>
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

        <section className="mt-9 grid gap-4 lg:grid-cols-[1.25fr_.75fr_.75fr]">
          {/* Main Stat Card - Dark Charcoal + Gold Accent */}
          <div className="border border-[var(--gold)] bg-[#191512] p-6 text-[#FCFBF9] sm:p-7 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#A39B92]">Pembayaran terkonfirmasi</p>
                <p className="mt-3 font-mono text-4xl tracking-[-0.08em] text-[#F4D084]">
                  {money(data.totals.confirmedAmount)}
                </p>
              </div>
              <div className="p-2.5 bg-[#26201B] border border-[var(--gold)] text-[var(--gold)] rounded-md">
                <WalletCards size={24} />
              </div>
            </div>
            <div className="mt-8 border-t border-[#332B25] pt-4 text-sm text-[#A39B92]">
              Dari {data.totals.rooms} kamar
            </div>
          </div>

          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <p className="text-sm text-[var(--ink-muted)]">Menunggu review</p>
            <p className="mt-3 font-mono text-4xl tracking-[-0.08em] text-[var(--gold)]">
              {data.totals.pendingPayments}
            </p>
            <p className="mt-8 text-sm text-[var(--ink-muted)]">Bukti pembayaran baru</p>
          </div>

          <div className="border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-sm">
            <p className="text-sm text-[var(--ink-muted)]">Tagihan overdue</p>
            <p className="mt-3 font-mono text-4xl tracking-[-0.08em] text-[var(--warn)]">
              {data.totals.overduePayments}
            </p>
            <p className="mt-8 text-sm text-[var(--ink-muted)]">Tagihan sewa belum dibayar</p>
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
                href={`/dashboard/properties/${firstProperty._id}`}
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
