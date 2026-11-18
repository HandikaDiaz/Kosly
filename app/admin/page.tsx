"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { BotChannelCard } from "@/components/botkos/bot-channel-card"
import { PageLoader } from "@/components/botkos/page-loader"

export default function AdminPage() {
  const billing = useQuery(api.admin.getBillingOverview)
  const reports = useQuery(api.reports.listOpen)
  const settings = useQuery(api.appSettings.getPublicSettings)
  const setPricingEnabled = useMutation(api.appSettings.setPricingEnabled)
  const [togglingPricing, setTogglingPricing] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  if (!billing || !reports || settings === undefined) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat ringkasan admin…"
        submessage="Menghitung transaksi billing dan antrean laporan"
      />
    )
  }

  const pricingEnabled = settings.pricingEnabled

  const handleTogglePricing = async () => {
    setTogglingPricing(true)
    setToggleError(null)
    try {
      await setPricingEnabled({ enabled: !pricingEnabled })
    } catch {
      setToggleError("Gagal mengubah pengaturan harga. Silakan coba lagi.")
    } finally {
      setTogglingPricing(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-[var(--ink-muted)]">Ringkasan operasional</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Ringkasan admin</h1>

      <section className="mt-7 border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-[var(--ink)]">Fitur Harga &amp; Paket Langganan</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  pricingEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {pricingEnabled ? "AKTIF (ON)" : "NONAKTIF (OFF)"}
              </span>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm text-[var(--ink-muted)]">
              {pricingEnabled
                ? "Halaman /harga, menu Langganan owner, dan batas kamar per tier sedang aktif."
                : "Saat OFF: halaman /harga, menu Langganan owner, dan batas 5 kamar disembunyikan agar pemilik kos 8–40 kamar bisa langsung mencoba tanpa hambatan."}
            </p>
            {toggleError ? <p className="mt-2 text-xs text-[var(--warn)]">{toggleError}</p> : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pricingEnabled}
            disabled={togglingPricing}
            onClick={() => void handleTogglePricing()}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              pricingEnabled
                ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                : "border-[var(--line)] bg-[#191512] text-[#FCFBF9] hover:bg-[#2a231f]"
            } disabled:opacity-60`}
          >
            <span>{togglingPricing ? "Menyimpan…" : pricingEnabled ? "Matikan Fitur Harga" : "Aktifkan Fitur Harga"}</span>
          </button>
        </div>
      </section>

      <section className="mt-9 grid gap-4 lg:grid-cols-[1.25fr_.75fr_.75fr_.75fr]">
        <div className="border border-[var(--gold)] bg-[#191512] p-6 text-[#FCFBF9] shadow-sm">
          <p className="text-sm text-[#A39B92]">Pending billing</p>
          <p className="mt-3 font-mono text-4xl tracking-[-0.08em] text-[#F4D084]">{billing.pending.length}</p>
          <p className="mt-8 border-t border-[#332B25] pt-4 text-sm text-[#A39B92]">Pembayaran menunggu review</p>
        </div>
        <div className="border border-[var(--line)] bg-white p-6 shadow-sm">
          <p className="text-sm text-[var(--ink-muted)]">Past due</p>
          <p className="mt-3 font-mono text-4xl tracking-[-0.08em] text-[var(--warn)]">{billing.pastDue.length}</p>
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Perlu ditindaklanjuti</p>
        </div>
        <div className="border border-[var(--line)] bg-white p-6 shadow-sm">
          <p className="text-sm text-[var(--ink-muted)]">Estimasi bulanan</p>
          <p className="mt-3 font-mono text-2xl tracking-[-0.06em] text-[var(--ink)]">Rp {Math.round(billing.monthlyRevenue).toLocaleString("id-ID")}</p>
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Dari subscription aktif</p>
        </div>
        <div className="border border-[var(--line)] bg-white p-6 shadow-sm">
          <p className="text-sm text-[var(--ink-muted)]">Laporan terbuka</p>
          <p className="mt-3 font-mono text-4xl tracking-[-0.08em] text-[var(--gold)]">{reports.length}</p>
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Masuk dari owner dan tenant</p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/setup" className="button-primary">Bantu setup kamar owner</Link>
        <Link href="/admin/billing" className="button-secondary">Review billing</Link>
        <Link href="/admin/verification" className="button-secondary">Review verifikasi</Link>
        <Link href="/admin/reports" className="button-secondary">Buka laporan</Link>
      </div>

      <section className="mt-12">
        <p className="text-sm text-[var(--ink-muted)]">Koneksi notifikasi</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">Hubungkan bot admin</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">Gunakan koneksi ini untuk menerima antrean baru dan menjalankan review dari Telegram atau WhatsApp.</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <BotChannelCard channel="telegram" />
          <BotChannelCard channel="whatsapp" />
        </div>
      </section>
    </div>
  )
}
