import { cn } from "@/lib/utils"

type Status = "available" | "occupied" | "pending" | "pending_payment" | "paid" | "overdue" | "past_due" | "rejected" | "booked" | "refund_pending" | "refunded" | "forfeited" | "open" | "in_progress" | "resolved" | "closed" | "free" | "starter" | "growth" | "pro" | "guest"

const statusCopy: Record<Status, { label: string; className: string }> = {
  available: { label: "Kosong", className: "bg-[#6B8F71]/12 text-[#527259]" },
  occupied: { label: "Terisi", className: "bg-[#1C2B2D]/8 text-[#1C2B2D]" },
  pending: { label: "Menunggu review", className: "bg-[#8B5E34]/12 text-[#8B5E34]" },
  pending_payment: { label: "Menunggu pembayaran", className: "bg-[#B28236]/14 text-[#9F722A]" },
  paid: { label: "Lunas", className: "bg-[#6B8F71]/12 text-[#527259]" },
  overdue: { label: "Belum bayar", className: "bg-[#C1502E]/12 text-[#A83E21]" },
  past_due: { label: "Past due", className: "bg-[#C1502E]/12 text-[#A83E21]" },
  rejected: { label: "Ditolak", className: "bg-[#C1502E]/10 text-[#A83E21]" },
  booked: { label: "Dipesan", className: "bg-[#8B5E34]/12 text-[#8B5E34]" },
  refund_pending: { label: "Menunggu refund", className: "bg-[#B28236]/14 text-[#9F722A]" },
  refunded: { label: "Sudah dikembalikan", className: "bg-[#6B8F71]/12 text-[#527259]" },
  forfeited: { label: "Dipotong atau hangus", className: "bg-[#C1502E]/12 text-[#A83E21]" },
  open: { label: "Terbuka", className: "bg-[#C1502E]/12 text-[#A83E21]" },
  in_progress: { label: "Sedang ditangani", className: "bg-[#B28236]/14 text-[#9F722A]" },
  resolved: { label: "Selesai", className: "bg-[#6B8F71]/12 text-[#527259]" },
  closed: { label: "Ditutup", className: "bg-[#1C2B2D]/8 text-[#1C2B2D]" },
  free: { label: "Gratis", className: "bg-[#1C2B2D]/8 text-[#1C2B2D]" },
  starter: { label: "Starter", className: "bg-[#8B5E34]/12 text-[#8B5E34]" },
  growth: { label: "Growth", className: "bg-[#B28236]/14 text-[#9F722A]" },
  pro: { label: "Pro", className: "bg-[#191512] text-[#F4D084]" },
  guest: { label: "Guest", className: "bg-[#1C2B2D]/8 text-[#1C2B2D]" },
}

export function StatusBadge({ status }: { status: Status }) {
  const item = statusCopy[status]
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", item.className)}>{item.label}</span>
}

export type { Status }
