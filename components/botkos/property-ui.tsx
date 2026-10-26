import type { ReactNode } from "react"
import { Inbox } from "lucide-react"

export const SectionCard = ({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) => <section className={`rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 shadow-sm sm:p-6 ${className}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[var(--ink)] sm:text-xl">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{description}</p> : null}</div>{action}</div><div className="mt-5">{children}</div></section>

export const StatusChip = ({ children, variant = "neutral" }: { children: ReactNode; variant?: "neutral" | "success" | "warning" | "danger" }) => { const styles = { neutral: "border-[var(--line)] bg-white text-[var(--ink-muted)]", success: "border-emerald-200 bg-emerald-50 text-emerald-800", warning: "border-amber-200 bg-amber-50 text-amber-800", danger: "border-red-200 bg-red-50 text-red-800" }; return <span className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[variant]}`}>{children}</span> }

export const EmptyState = ({ children, action }: { children: ReactNode; action?: ReactNode }) => <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-6 text-center"><Inbox className="mx-auto text-[var(--wood)]" size={24} /><p className="mt-3 text-sm text-[var(--ink-muted)]">{children}</p>{action ? <div className="mt-4">{action}</div> : null}</div>

export const StickyActionBar = ({ children }: { children: ReactNode }) => <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[#fffefa]/95 px-4 py-3 shadow-lg backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:shadow-none" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>{children}</div>
