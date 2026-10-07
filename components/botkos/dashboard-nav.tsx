"use client"

import Link from "next/link"
import { Building2, ChevronDown, Clock3, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, Users, X, WalletCards } from "lucide-react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@/convex/_generated/api"
import { BotKosLogo } from "./botkos-logo"

export function DashboardNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const owner = useQuery(api.owners.me)
  const { signOut } = useAuthActions()
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-[#2A231F] bg-[#191512] px-5 text-[#FCFBF9] backdrop-blur sm:px-8 lg:hidden">
        <Link href="/dashboard">
          <BotKosLogo size={28} textClassName="tracking-tight text-white font-extrabold text-base" />
        </Link>
        <button type="button" aria-label="Buka menu" onClick={() => setOpen(true)} className="rounded-md p-2 text-[#FCFBF9] hover:bg-white/10">
          <Menu size={20} />
        </button>
      </header>

      <aside className={`${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#2A231F] bg-[#191512] text-[#FCFBF9] px-5 py-6 transition-transform lg:sticky lg:top-0 lg:h-svh lg:shrink-0 overflow-y-auto`}>
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <BotKosLogo size={32} textClassName="tracking-tight text-white font-extrabold text-xl" />
          </Link>
          <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="rounded-md p-1 text-[#A39B92] hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 rounded-md border border-[#332B25] bg-[#221C18] p-3">
          <p className="text-[11px] text-[#A39B92]">Akun Owner</p>
          <p className="mt-1 flex items-center justify-between text-sm font-semibold text-white">
            {owner?.name ?? "Owner"} <ChevronDown size={15} className="text-[#A39B92]" />
          </p>
          <p className="mt-0.5 truncate text-xs text-[#A39B92]">{owner?.email ?? "Data akun"}</p>
        </div>

        <nav className="mt-8 space-y-1 text-sm">
          <Link className={`nav-link ${pathname === "/dashboard" ? "nav-link-active" : ""}`} href="/dashboard">
            <LayoutDashboard size={16} />Ringkasan
          </Link>
          <Link className={`nav-link ${pathname.startsWith("/dashboard/properties") ? "nav-link-active" : ""}`} href="/dashboard/properties">
            <Building2 size={16} />Properti &amp; kamar
          </Link>
          <Link className={`nav-link ${pathname.startsWith("/dashboard/rentals") ? "nav-link-active" : ""}`} href="/dashboard/rentals">
            <Clock3 size={16} />Sewa kamar
          </Link>
          <Link className={`nav-link ${pathname.startsWith("/dashboard/tenants") ? "nav-link-active" : ""}`} href="/dashboard/tenants">
            <Users size={16} />Tenant
          </Link>
          <Link className={`nav-link ${pathname.startsWith("/dashboard/payments") ? "nav-link-active" : ""}`} href="/dashboard/payments">
            <ReceiptText size={16} />Pembayaran
          </Link>
          <Link className={`nav-link ${pathname.startsWith("/dashboard/billing") ? "nav-link-active" : ""}`} href="/dashboard/billing">
            <WalletCards size={16} />Langganan
          </Link>
        </nav>

        <div className="mt-auto space-y-1 border-t border-[#332B25] pt-4 text-sm">
          <Link className={`nav-link ${pathname.startsWith("/dashboard/settings") ? "nav-link-active" : ""}`} href="/dashboard/settings">
            <Settings size={16} />Pengaturan
          </Link>
          <button type="button" onClick={() => void signOut()} className="nav-link w-full text-left">
            <LogOut size={16} />Keluar
          </button>
        </div>
      </aside>

      {open ? <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} /> : null}
    </>
  )
}
