"use client"

import { DashboardNav } from "./dashboard-nav"

export function AdminDashboard({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[var(--background)] lg:flex"><DashboardNav mode="admin" /><main className="min-w-0 flex-1"><div className="px-5 py-7 sm:px-8 sm:py-10"><div className="mx-auto max-w-7xl">{children}</div></div></main></div>
}
