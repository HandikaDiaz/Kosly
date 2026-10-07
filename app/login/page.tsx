import Link from "next/link"
import { GoogleLoginButton } from "@/components/botkos/google-login-button"
import { BotKosLogo } from "@/components/botkos/botkos-logo"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/">
          <BotKosLogo size={32} textClassName="text-base font-extrabold text-[var(--ink)] tracking-tight" />
        </Link>
        <div className="mt-10 border border-[var(--line)] bg-[#FFFFFF] p-7 sm:p-9 shadow-sm">
          <p className="text-sm font-semibold text-[var(--gold-dark)]">Ruang Owner</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
            Masuk ke BotKos.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
            Gunakan akun Google Anda untuk masuk atau membuat ruang owner baru.
          </p>
          <div className="mt-8">
            <GoogleLoginButton />
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-[var(--ink-muted)]">
            BotKos memakai akun Google hanya untuk autentikasi. Data properti tetap aman dan terisolasi.
          </p>
        </div>
      </div>
    </main>
  )
}
