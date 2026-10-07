import { cn } from "@/lib/utils"

type Status = "available" | "occupied" | "pending" | "paid" | "overdue" | "rejected" | "booked"

const statusCopy: Record<Status, { label: string; className: string }> = {
  available: { label: "Kosong", className: "bg-[#6B8F71]/12 text-[#527259]" },
  occupied: { label: "Terisi", className: "bg-[#1C2B2D]/8 text-[#1C2B2D]" },
  pending: { label: "Menunggu review", className: "bg-[#8B5E34]/12 text-[#8B5E34]" },
  paid: { label: "Lunas", className: "bg-[#6B8F71]/12 text-[#527259]" },
  overdue: { label: "Belum bayar", className: "bg-[#C1502E]/12 text-[#A83E21]" },
  rejected: { label: "Ditolak", className: "bg-[#C1502E]/10 text-[#A83E21]" },
  booked: { label: "Dipesan", className: "bg-[#8B5E34]/12 text-[#8B5E34]" },
}

export function StatusBadge({ status }: { status: Status }) {
  const item = statusCopy[status]
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", item.className)}>{item.label}</span>
}

export type { Status }
