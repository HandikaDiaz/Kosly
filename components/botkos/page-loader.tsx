"use client"

import Image from "next/image"

type PageLoaderProps = {
  /** Pesan utama yang ditampilkan di bawah animasi */
  message?: string
  /** Pesan sekunder opsional */
  submessage?: string
  /** "full" = satu layar penuh (min-h-svh), "inline" = mengisi wadah parent */
  variant?: "full" | "inline"
  /** Ukuran logo */
  size?: "sm" | "md" | "lg"
  /** Custom className tambahan */
  className?: string
}

export function PageLoader({
  message = "Memuat halaman…",
  submessage,
  variant = "full",
  size = "md",
  className = "",
}: PageLoaderProps) {
  const isInline = variant === "inline"

  const logoDimension = size === "sm" ? 32 : size === "lg" ? 52 : 42
  const ringSize = size === "sm" ? "h-16 w-16" : size === "lg" ? "h-24 w-24" : "h-20 w-20"
  const orbitSize = size === "sm" ? "h-20 w-20" : size === "lg" ? "h-28 w-28" : "h-24 w-24"

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 ${
        isInline ? "min-h-[320px] w-full py-12" : "min-h-svh w-full"
      } bg-[var(--background)] px-5 select-none ${className}`}
    >
      {/* ── Animated Center Stage ── */}
      <div className="relative flex items-center justify-center">
        {/* Ambient subtle warm glow */}
        <div
          className="absolute h-28 w-28 rounded-full bg-[var(--gold)]/15 blur-2xl animate-loader-pulse pointer-events-none"
          aria-hidden="true"
        />

        {/* Outer orbital ring with rotating indicator dot */}
        <div
          className={`absolute ${orbitSize} rounded-full border border-[var(--line)] opacity-50 animate-loader-spin`}
          aria-hidden="true"
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-[var(--gold-dark)] shadow-[0_0_8px_rgba(178,130,54,0.6)]" />
        </div>

        {/* Counter-rotating gradient arc ring */}
        <div
          className={`absolute ${ringSize} rounded-full border-2 border-transparent border-t-[var(--wood)] border-r-[var(--gold-light)] opacity-70 animate-loader-spin-reverse`}
          aria-hidden="true"
        />

        {/* Soft breathing container for BotKos logo */}
        <div className="relative z-10 flex items-center justify-center rounded-2xl bg-[#FFFFFF] p-2.5 shadow-md border border-[var(--line)]/60 animate-loader-breathe">
          <Image
            src="/BotKos-Logo.png"
            alt="BotKos"
            width={logoDimension}
            height={logoDimension}
            className="rounded-xl object-contain shrink-0"
            priority
          />
        </div>
      </div>

      {/* ── Status Text & Shimmer Bar ── */}
      <div className="flex flex-col items-center gap-2.5 text-center">
        <p className="text-sm font-semibold tracking-tight text-[var(--ink)] animate-loader-fade">
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-[var(--ink-muted)]">
            {submessage}
          </p>
        )}
        {/* Sleek shimmer progress bar */}
        <div
          className="relative h-1 w-36 overflow-hidden rounded-full bg-[var(--line)]/70 mt-1"
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 h-full w-20 rounded-full bg-gradient-to-r from-transparent via-[var(--wood)] to-transparent animate-loader-shimmer" />
        </div>
      </div>
    </div>
  )
}
