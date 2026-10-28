"use client"

import { useConvexAuth } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ArrowLeft, MessageSquare, ShieldCheck, Sparkles, Users } from "lucide-react"
import { GoogleLoginButton } from "@/components/botkos/google-login-button"
import { BotKosLogo } from "@/components/botkos/botkos-logo"
import { PageLoader } from "@/components/botkos/page-loader"
import { api } from "@/convex/_generated/api"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const role = useQuery(
    api.owners.getCurrentRole,
    isAuthenticated ? {} : "skip"
  )

  useEffect(() => {
    if (!isLoading && isAuthenticated && role !== undefined) {
      const destination = role === "admin" ? "/admin" : "/dashboard"
      router.replace(destination)
    }
  }, [isAuthenticated, isLoading, role, router])

  if (isLoading || isAuthenticated) {
    return (
      <PageLoader
        message="Memeriksa sesi Anda…"
        submessage="Menghubungkan ke akun BotKos Anda"
      />
    )
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      {/* Background Subtle Gradient Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--gold-light)]/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-[var(--wood)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Back link & Logo */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <BotKosLogo
              size={34}
              textClassName="text-lg font-black tracking-tight text-[var(--ink)]"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--wood)]"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-xl shadow-[var(--ink)]/5 sm:p-9">
          {/* Header pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/30 bg-[#fffbf2] px-3 py-1 text-xs font-semibold text-[var(--gold-dark)]">
            <Sparkles size={13} className="text-[var(--wood)]" />
            <span>Ruang Khusus Owner Kos</span>
          </div>

          <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Selamat Datang di BotKos
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            Masuk untuk mengelola kamar, pantau jatuh tempo penyewa, dan aktifkan pengingat sewa otomatis via bot.
          </p>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--line)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FFFFFF] px-3 text-[var(--ink-muted)] font-medium">
                Kemudahan untuk Anda
              </span>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--line)]/60 bg-[var(--background)]/60 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fff7ea] text-[var(--wood)]">
                <MessageSquare size={16} />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--ink)]">Pengingat Sewa Otomatis</p>
                <p className="text-[var(--ink-muted)] leading-relaxed">
                  Kirim tagihan dan notifikasi jatuh tempo langsung ke WhatsApp & Telegram penyewa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[var(--line)]/60 bg-[var(--background)]/60 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eefaf3] text-[#2d7a53]">
                <Users size={16} />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--ink)]">Catatan Penghuni & Kamar</p>
                <p className="text-[var(--ink-muted)] leading-relaxed">
                  Lihat kamar kosong vs terisi, riwayat pembayaran, serta profil penyewa dengan rapi.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[var(--line)]/60 bg-[var(--background)]/60 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f4ff] text-[#3b66de]">
                <ShieldCheck size={16} />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--ink)]">Aman & Terenkripsi</p>
                <p className="text-[var(--ink-muted)] leading-relaxed">
                  Data properti Anda privat dan aman. Autentikasi Google menjaga privasi akun Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Google Sign In Button - Dibawah card kemudahan untuk anda */}
          <div className="mt-7">
            <GoogleLoginButton text="Masuk dengan Akun Google" />
          </div>

          {/* Privacy Note */}
          <p className="mt-5 text-center text-[11px] leading-5 text-[var(--ink-muted)]">
            Dengan masuk, Anda menyetujui penggunaan BotKos untuk operasional kos.
            Akun Google hanya digunakan untuk verifikasi login.
          </p>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-[var(--ink-muted)]">
          © {new Date().getFullYear()} BotKos. Platform Asisten Cerdas Operasional Kos.
        </p>
      </div>
    </main>
  )
}
