"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck } from "lucide-react"

export function AdminDashboard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tabs = [["/admin", "Ringkasan"], ["/admin/billing", "Billing"], ["/admin/verification", "Verifikasi"], ["/admin/reports", "Laporan"]]
  return <div className="min-h-svh bg-[var(--background)]"><header className="border-b border-[#332B25] bg-[#191512] px-5 py-5 text-white sm:px-8"><div className="mx-auto flex max-w-7xl items-center gap-3"><ShieldCheck className="text-[#F4D084]" size={22} /><div><p className="text-xs uppercase tracking-[0.2em] text-[#A39B92]">BotKos</p><p className="font-semibold">Admin Dashboard</p></div></div></header><nav className="border-b border-[var(--line)] bg-[#fffefa] px-5 sm:px-8"><div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto">{tabs.map(([href, label]) => <Link key={href} href={href} className={`border-b-2 px-1 py-4 text-sm ${pathname === href ? "border-[var(--wood)] font-semibold text-[var(--ink)]" : "border-transparent text-[var(--ink-muted)]"}`}>{label}</Link>)}</div></nav><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</main></div>
}
