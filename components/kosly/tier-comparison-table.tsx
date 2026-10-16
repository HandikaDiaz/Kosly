"use client"

import Link from "next/link"
import { Check, Minus } from "lucide-react"
import { AuthAwareLink } from "@/components/botkos/auth-aware-link"
import {
  getTierLimits,
  getTierPrice,
  type SubscriptionTier,
} from "@/convex/lib/subscription_tiers"

type TierComparisonVariant = "landing" | "dashboard"
type FeatureValue = boolean | string
type TierFeature = {
  label: string
  description: string
  values: Record<SubscriptionTier, FeatureValue>
}

const tierOrder: SubscriptionTier[] = ["free", "starter", "growth", "pro"]
const tierLabels: Record<SubscriptionTier, string> = {
  free: "Gratis",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
}
const tierDescriptions: Record<SubscriptionTier, string> = {
  free: "Untuk mencoba, selamanya",
  starter: "Untuk pemilik kos kecil",
  growth: "Untuk kos aktif yang berkembang",
  pro: "Untuk portofolio besar",
}

export const tierFeatures: TierFeature[] = [
  {
    label: "Dashboard kamar, piutang, reminder otomatis",
    description:
      "Pantau status kamar, piutang, dan pengingat jatuh tempo dalam satu dashboard.",
    values: { free: true, starter: true, growth: true, pro: true },
  },
  {
    label: "Bot Telegram & WhatsApp",
    description:
      "Notifikasi, konfirmasi bukti bayar, /status, dan perintah operasional dari chat.",
    values: { free: true, starter: true, growth: true, pro: true },
  },
  {
    label: "Verifikasi & badge Terverifikasi",
    description:
      "Bangun kepercayaan tenant dengan verifikasi identitas dan properti.",
    values: { free: true, starter: true, growth: true, pro: true },
  },
  {
    label: "Skor Kesehatan Kos & Prediksi Arus Kas",
    description:
      "Baca kesehatan operasional dan arah kas sebelum masalah membesar.",
    values: { free: false, starter: false, growth: true, pro: true },
  },
  {
    label: "Laporan bulanan",
    description:
      "Ringkasan okupansi dan kas dikirim otomatis ke chat tiap awal bulan.",
    values: { free: false, starter: false, growth: true, pro: true },
  },
  {
    label: "Tambah/Edit kamar via chat bot",
    description: "Ubah kamar, harga, dan status tanpa membuka dashboard.",
    values: { free: false, starter: false, growth: true, pro: true },
  },
  {
    label: "Pengelola tambahan",
    description:
      "Berikan akses pengelolaan properti kepada staff dalam akun owner yang sama.",
    values: {
      free: false,
      starter: false,
      growth: "1 orang",
      pro: "Unlimited",
    },
  },
  {
    label: "Akses API",
    description:
      "Entitlement untuk integrasi API pada tahap pengembangan berikutnya.",
    values: { free: false, starter: false, growth: false, pro: true },
  },
  {
    label: "Onboarding khusus",
    description: "Entitlement layanan setup langsung bersama tim BotKos.",
    values: { free: false, starter: false, growth: false, pro: true },
  },
  {
    label: "Prioritas respons support",
    description:
      "Best-effort untuk Gratis/Starter, hari yang sama untuk Growth, plus dedicated untuk Pro.",
    values: {
      free: "Best-effort",
      starter: "Best-effort",
      growth: "Hari yang sama",
      pro: "Hari yang sama + dedicated",
    },
  },
]

const formatPrice = (tier: SubscriptionTier, cycle: "monthly" | "annual") => {
  const price = getTierPrice(tier, cycle)
  return price === 0 ? "Rp0" : "Rp" + price.toLocaleString("id-ID")
}

const formatLimit = (value: number | null, label: string) =>
  value === null ? "Unlimited " + label : value + " " + label

const renderValue = (value: FeatureValue, variant: TierComparisonVariant) => {
  if (value === true)
    return (
      <Check
        size={17}
        aria-label="Tersedia"
        className={
          variant === "landing" ? "text-[#D6B15E]" : "text-[var(--sage)]"
        }
      />
    )
  if (value === false)
    return (
      <Minus
        size={17}
        aria-label="Tidak tersedia"
        className={
          variant === "landing" ? "text-white/25" : "text-[var(--ink-muted)]/50"
        }
      />
    )
  return <span className="text-xs font-semibold">{value}</span>
}

export function TierComparisonTable({
  variant = "landing",
  activeTier,
  ctaHref = "/login",
}: {
  variant?: TierComparisonVariant
  activeTier?: SubscriptionTier
  ctaHref?: string
}) {
  const landing = variant === "landing"
  return (
    <section
      className={
        landing
          ? "overflow-hidden rounded-[2rem] border border-white/15 bg-[#15110E] text-white shadow-2xl"
          : "overflow-hidden border border-[var(--line)] bg-[#fffefa] text-[var(--ink)]"
      }
    >
      <div
        className={
          landing
            ? "grid gap-0 border-b border-white/10 md:grid-cols-4"
            : "grid gap-0 border-b border-[var(--line)] md:grid-cols-4"
        }
      >
        {tierOrder.map((tier) => {
          const limits = getTierLimits(tier)
          const active = activeTier === tier
          const cardClass =
            (landing
              ? "border-white/10 bg-white/[0.02] p-6 md:border-r"
              : "border-[var(--line)] bg-white p-5 md:border-r") +
            (tier === "growth"
              ? landing
                ? " bg-[#8B6A2E]/20"
                : " bg-[#fff8e8]"
              : "") +
            (active ? " ring-2 ring-inset ring-[var(--gold)]" : "")
          return (
            <div key={tier} className={cardClass}>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={
                    landing
                      ? "text-lg font-semibold"
                      : "text-lg font-semibold text-[var(--ink)]"
                  }
                >
                  {tierLabels[tier]}
                </p>
                {tier === "growth" && (
                  <span className="rounded-full bg-[var(--gold)] px-2 py-1 text-[10px] font-bold tracking-wider text-[#21170C] uppercase">
                    Populer
                  </span>
                )}
                {active && (
                  <span className="rounded-full border border-[var(--gold)] px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--gold)] uppercase">
                    Aktif
                  </span>
                )}
              </div>
              <p
                className={
                  landing
                    ? "mt-2 min-h-10 text-xs leading-5 text-white/55"
                    : "mt-2 min-h-10 text-xs leading-5 text-[var(--ink-muted)]"
                }
              >
                {tierDescriptions[tier]}
              </p>
              <p
                className={
                  landing
                    ? "mt-5 text-2xl font-semibold text-[#F4D084]"
                    : "mt-5 text-2xl font-semibold text-[var(--ink)]"
                }
              >
                {formatPrice(tier, "monthly")}
                <span className="text-xs font-normal opacity-60">/bln</span>
              </p>
              <p
                className={
                  landing
                    ? "mt-1 text-[11px] text-white/45"
                    : "mt-1 text-[11px] text-[var(--ink-muted)]"
                }
              >
                {formatPrice(tier, "annual")}/tahun
              </p>
              <div
                className={
                  landing
                    ? "mt-4 space-y-1 text-xs text-white/70"
                    : "mt-4 space-y-1 text-xs text-[var(--ink-muted)]"
                }
              >
                <p>{formatLimit(limits.maxRooms, "kamar")}</p>
                <p>{formatLimit(limits.maxProperties, "properti")}</p>
              </div>
              {landing ? (
                <AuthAwareLink
                  authenticatedHref="/dashboard/billing"
                  className="mt-5 flex w-full items-center justify-center rounded-full border border-[#D6B15E]/60 px-4 py-2.5 text-xs font-semibold text-[#F4D084] transition hover:bg-[#D6B15E] hover:text-[#21170C]"
                >
                  {tier === "free"
                    ? "Mulai Gratis"
                    : "Pilih " + tierLabels[tier]}
                </AuthAwareLink>
              ) : (
                <Link
                  href={ctaHref}
                  className="button-secondary mt-5 w-full justify-center text-xs"
                >
                  {tier === "free"
                    ? "Mulai Gratis"
                    : "Pilih " + tierLabels[tier]}
                </Link>
              )}
            </div>
          )
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr
              className={
                landing
                  ? "border-b border-white/10 text-white/45"
                  : "border-b border-[var(--line)] text-[var(--ink-muted)]"
              }
            >
              <th className="w-[42%] px-5 py-4 font-medium">Fitur</th>
              {tierOrder.map((tier) => (
                <th
                  key={tier}
                  className="px-4 py-4 text-center text-xs font-semibold"
                >
                  {tierLabels[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tierFeatures.map((feature) => (
              <tr
                key={feature.label}
                className={
                  landing
                    ? "border-b border-white/10"
                    : "border-b border-[var(--line)]"
                }
              >
                <td className="px-5 py-4">
                  <p
                    className={
                      landing
                        ? "font-medium text-white"
                        : "font-medium text-[var(--ink)]"
                    }
                  >
                    {feature.label}
                  </p>
                  <p
                    className={
                      landing
                        ? "mt-1 max-w-md text-xs leading-5 text-white/45"
                        : "mt-1 max-w-md text-xs leading-5 text-[var(--ink-muted)]"
                    }
                  >
                    {feature.description}
                  </p>
                </td>
                {tierOrder.map((tier) => (
                  <td key={tier} className="px-4 py-4 text-center align-top">
                    {renderValue(feature.values[tier], variant)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
