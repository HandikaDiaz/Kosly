"use client"

import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  DoorOpen,
  FileText,
  Share2,
  Sparkles,
  Users,
} from "lucide-react"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { computeActionItems, formatBadge, propertyTabUrl } from "@/lib/propertyTabs"
import { PageLoader } from "./page-loader"

export function PropertySummaryPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const id = propertyId as Id<"properties">

  const property = useQuery(api.properties.getMine, { propertyId: id })
  const rooms = useQuery(api.rooms.listForProperty, { propertyId: id })
  const badges = useQuery(api.dashboard.getPropertyTabBadges, { propertyId: id })
  const [copied, setCopied] = useState(false)

  const registrationUrl =
    property && typeof window !== "undefined"
      ? `${window.location.origin}/${property.slug}/daftar`
      : ""

  const actions = useMemo(() => (badges ? computeActionItems(badges) : []), [badges])

  if (property === undefined || rooms === undefined || badges === undefined) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat ringkasan properti…"
        submessage="Menghitung ketersediaan kamar dan status penghuni"
      />
    )
  }

  if (!property) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const occupiedCount = rooms.filter((room) => room.status === "occupied").length
  const availableCount = rooms.filter((room) => room.status === "available").length
  const occupancyPct = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* ── Key Metrics Cards ── */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--wood)]/10 text-[var(--wood)]">
              <DoorOpen size={20} />
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
              {occupancyPct}% Terisi
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Kamar Kos
            </p>
            <p className="mt-0.5 font-mono text-2xl font-extrabold text-[var(--ink)]">
              {rooms.length} <span className="text-xs font-normal text-[var(--ink-muted)]">kamar</span>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              <strong className="text-emerald-700">{occupiedCount} terisi</strong> ·{" "}
              <strong className="text-[var(--wood)]">{availableCount} kosong</strong>
            </p>
          </div>
          <div className="mt-3.5 pt-3 border-t border-[var(--line)]">
            <Link
              href={propertyTabUrl(propertyId, "rooms")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wood)] hover:underline"
            >
              <span>Kelola Kamar</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Users size={20} />
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
              {badges.applicationsOpen} pengajuan
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Penghuni Aktif
            </p>
            <p className="mt-0.5 font-mono text-2xl font-extrabold text-[var(--ink)]">
              {badges.tenantsActive} <span className="text-xs font-normal text-[var(--ink-muted)]">penghuni</span>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Kelola data penghuni, jatuh tempo, dan pengajuan masuk
            </p>
          </div>
          <div className="mt-3.5 pt-3 border-t border-[var(--line)]">
            <Link
              href={propertyTabUrl(propertyId, "tenants")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wood)] hover:underline"
            >
              <span>Kelola Penghuni</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Action Center Section (Perlu Tindakan) ── */}
      <section className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--gold-pale)] text-[var(--gold-dark)]">
              <Sparkles size={15} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)] sm:text-lg">
                Pusat Tindakan
              </h2>
              <p className="text-[11px] text-[var(--ink-muted)] sm:text-xs">
                Hal-hal yang membutuhkan respon dari pemilik kos.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {actions.length > 0 ? (
            <div className="divide-y divide-[var(--line)]">
              {actions.map((item) => (
                <Link
                  key={item.key}
                  href={propertyTabUrl(propertyId, item.tab)}
                  className="group flex min-h-14 items-center justify-between gap-3 py-3 transition hover:bg-stone-50/70 -mx-2 px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                      <AlertCircle size={16} />
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--wood)] transition-colors">
                        {item.label}
                      </span>
                      <p className="text-[11px] text-[var(--ink-muted)]">
                        Klik untuk membuka bagian {item.tab}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.count ? (
                      <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-black shadow-sm">
                        {formatBadge(item.count)}
                      </span>
                    ) : null}
                    <ArrowRight
                      size={16}
                      className="text-[var(--ink-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--wood)]"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
              <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
              <p className="mt-1.5 text-xs font-semibold text-emerald-950 sm:text-sm">
                Semua Beres!
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-700">
                Tidak ada pengajuan sewa atau sengketa yang membutuhkan tindakan saat ini.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Registration Link Section ── */}
      <section className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3.5">
          <div>
            <h2 className="text-base font-bold text-[var(--ink)] sm:text-lg">
              Link Pendaftaran Calon Penghuni
            </h2>
            <p className="text-[11px] text-[var(--ink-muted)] sm:text-xs">
              Bagikan tautan ini jika ada calon penghuni yang ingin mendaftar langsung ke kos Anda.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 font-mono text-xs text-[var(--wood)]">
              <span className="block truncate">{registrationUrl}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <button
                type="button"
                onClick={() => void copy()}
                className="button-secondary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Salin Link</span>
                  </>
                )}
              </button>

              {typeof navigator !== "undefined" && "share" in navigator ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigator.share({
                      title: property.name,
                      text: `Daftar kamar di ${property.name}`,
                      url: registrationUrl,
                    })
                  }
                  className="button-secondary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold"
                >
                  <Share2 size={14} />
                  <span>Bagikan</span>
                </button>
              ) : null}
            </div>
          </div>

          {copied && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>Tautan pendaftaran berhasil disalin!</span>
            </p>
          )}
        </div>
      </section>

      {/* ── Quick Shortcuts Grid ── */}
      <section className="rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-6 shadow-sm">
        <h2 className="text-base font-bold text-[var(--ink)] sm:text-lg">
          Navigasi Cepat
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--ink-muted)] sm:text-xs">
          Pilih menu di bawah ini untuk mengakses bagian spesifik kos Anda:
        </p>

        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Link
            href={propertyTabUrl(propertyId, "rooms")}
            className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--background)] p-3 transition hover:border-[var(--wood)] hover:bg-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
              <DoorOpen size={16} />
            </span>
            <p className="mt-2 text-xs font-bold text-[var(--ink)]">Kelola Kamar</p>
            <p className="text-[10px] text-[var(--ink-muted)]">{rooms.length} kamar terdaftar</p>
          </Link>

          <Link
            href={propertyTabUrl(propertyId, "tenants")}
            className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--background)] p-3 transition hover:border-[var(--wood)] hover:bg-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Users size={16} />
            </span>
            <p className="mt-2 text-xs font-bold text-[var(--ink)]">Kelola Penghuni</p>
            <p className="text-[10px] text-[var(--ink-muted)]">{badges.tenantsActive} penghuni aktif</p>
          </Link>

          <Link
            href={propertyTabUrl(propertyId, "applications")}
            className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--background)] p-3 transition hover:border-[var(--wood)] hover:bg-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <FileText size={16} />
            </span>
            <p className="mt-2 text-xs font-bold text-[var(--ink)]">Pengajuan Sewa</p>
            <p className="text-[10px] text-[var(--ink-muted)]">
              {badges.applicationsOpen} perlu ditinjau
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
