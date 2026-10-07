import { KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge, type Status } from "./status-badge"

export function RoomTag({ number, rent, status = "available", deadline, selected = false, onClick }: { number: string; rent: string; status?: Status; deadline?: string; selected?: boolean; onClick?: () => void }) {
  const content = <>
    <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-[var(--background)] bg-[var(--wood)]" />
    <KeyRound className="mb-6 text-[var(--wood)]" size={18} strokeWidth={1.7} />
    <span className="font-mono text-3xl tracking-[-0.08em] text-[var(--ink)]">{number}</span>
    <span className="mt-2 text-xs text-[var(--ink-muted)]">{rent}/bulan</span>
    <StatusBadge status={status} />
    {deadline && <span className="mt-2 text-[10px] text-[var(--warn)]">sampai {deadline}</span>}
  </>
  const className = cn("relative flex min-h-40 min-w-32 flex-col items-center justify-center border border-[var(--line)] bg-[#fffefa] px-4 py-5 text-center shadow-[4px_5px_0_rgba(139,94,52,.06)] transition-transform hover:-translate-y-1", selected && "-translate-y-1 border-[var(--wood)] ring-2 ring-[var(--wood)]/15")
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <div className={className}>{content}</div>
}
