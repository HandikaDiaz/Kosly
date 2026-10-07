import { DashboardNav } from "@/components/botkos/dashboard-nav"
import { OwnerGate } from "@/components/botkos/owner-gate"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerGate>
      <div className="min-h-svh bg-[var(--background)] lg:flex">
        <DashboardNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </OwnerGate>
  )
}
