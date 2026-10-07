import { AdminDashboard } from "@/components/botkos/admin-dashboard"
import { AdminGate } from "@/components/botkos/admin-gate"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate><AdminDashboard>{children}</AdminDashboard></AdminGate>
}
