"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { useParams, usePathname } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { propertyTabUrl, type PropertyTab, formatBadge } from "@/lib/propertyTabs"
import { PageLoader } from "./page-loader"

type TabDefinition = {
  tab: PropertyTab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const tabs: TabDefinition[] = [
  { tab: "summary", label: "Ringkasan", icon: LayoutDashboard },
  { tab: "rooms", label: "Kamar", icon: DoorOpen },
  { tab: "tenants", label: "Penghuni", icon: Users },
  { tab: "public", label: "Publik", icon: Globe },
  { tab: "location", label: "Lokasi", icon: MapPin },
  { tab: "reviews", label: "Ulasan", icon: Star },
]

export function PropertyTabs({ children }: { children: React.ReactNode }) {
  const params = useParams<{ propertyId: string }>()
  const pathname = usePathname()
  const propertyId = params.propertyId as Id<"properties">

  const property = useQuery(api.properties.getMine, { propertyId })
  const badges = useQuery(api.dashboard.getPropertyTabBadges, { propertyId })
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [pathname])

  if (property === undefined || badges === undefined) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat detail kos…"
        submessage="Mengambil informasi kamar dan status"
      />
    )
  }

  if (!property) {
    return (
      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-lg rounded-3xl border border-[var(--line)] bg-[#fffefa] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Building2 size={28} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-[var(--ink)]">
            Properti Tidak Ditemukan
          </h1>
          <p className="mt-2 text-xs text-[var(--ink-muted)] sm:text-sm">
            Properti ini mungkin telah dihapus atau Anda tidak memiliki akses.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/properties"
              className="button-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-xs font-semibold"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Daftar Properti</span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const activeTab: PropertyTab =
    tabs.find(({ tab }) => {
      if (tab === "summary") return pathname.endsWith(`/properties/${params.propertyId}`)
      const subpath =
        tab === "rooms"
          ? "kamar"
          : tab === "tenants"
            ? "penghuni"
            : tab === "public"
              ? "halaman-publik"
              : tab === "location"
                ? "verifikasi"
                : tab === "applications"
                  ? "pengajuan"
                  : "ulasan"
      return pathname.includes(`/properties/${params.propertyId}/${subpath}`)
    })?.tab ?? "summary"

  const publicUrl = `/kos/${property.publicSlug ?? property.slug}`

  return (
    <div className="min-w-0 bg-[var(--background)]">
      {/* ── Top Bar with Back Navigation & Quick Header ── */}
      <header className="border-b border-[var(--line)] bg-[#fffefa] px-4 pt-3.5 pb-2 sm:px-6 sm:pt-5 sm:pb-3">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb / Back Link */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/dashboard/properties"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] transition hover:text-[var(--wood)]"
            >
              <ArrowLeft
                size={14}
                className="transition-transform group-hover:-translate-x-0.5"
              />
              <span>Daftar Properti</span>
            </Link>

            {property.isPublished && (
              <Link
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--wood)] hover:underline"
              >
                <span>Lihat Halaman Publik</span>
                <ExternalLink size={12} />
              </Link>
            )}
          </div>

          {/* Property Name & Badges */}
          <div className="mt-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                {property.name}
              </h1>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--ink-muted)]">
                <MapPin size={12} className="shrink-0 text-[var(--wood)]" />
                <span className="truncate">{property.address}</span>
              </p>
            </div>

            {/* Quick Status Chips */}
            <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  badges.isPublished
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                <Globe size={10} />
                {badges.isPublished ? "Dipublikasikan" : "Draft"}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  badges.locationVerified
                    ? "bg-sky-100 text-sky-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <ShieldCheck size={10} />
                {badges.locationVerified ? "Lokasi Valid" : "Lokasi Belum"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sticky Horizontal Pill Navigation Bar (Mobile-first Swipeable) ── */}
      <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[#fffefa]/95 px-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-7xl">
          <nav
            aria-label="Bagian Properti"
            className="-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 py-2.5 no-scrollbar sm:mx-0 sm:px-0"
          >
            {tabs.map(({ tab, label, icon: Icon }) => {
              const active = activeTab === tab
              const count =
                tab === "tenants"
                  ? badges.applicationsOpen + (badges.disputesOpen ?? 0) + (badges.occupiedWithoutTenant ?? 0)
                  : tab === "reviews"
                    ? badges.reviewsUnreplied
                    : 0
              const badgeText = formatBadge(count)

              return (
                <Link
                  key={tab}
                  ref={active ? activeRef : undefined}
                  href={propertyTabUrl(params.propertyId, tab)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 snap-center shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wood)] ${
                    active
                      ? "bg-[var(--wood)] text-white shadow-sm font-bold"
                      : "bg-stone-100/80 text-[var(--ink-muted)] hover:bg-stone-200/70 hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon size={14} className={active ? "text-white" : "text-[var(--ink-muted)]"} />
                  <span>{label}</span>
                  {badgeText && (
                    <span
                      className={`ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        active
                          ? "bg-white text-[var(--wood)]"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {badgeText}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      <main className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 sm:py-7">
        {children}
      </main>
    </div>
  )
}
