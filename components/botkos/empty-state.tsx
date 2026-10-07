import { Inbox } from "lucide-react"

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center border border-dashed border-[var(--line)] px-6 py-14 text-center">
    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5E34]/10 text-[var(--wood)]"><Inbox size={18} /></span>
    <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
}
