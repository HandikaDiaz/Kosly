import type { Metadata } from "next"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const metadata: Metadata = { title: "Laporkan kos - BotKos", robots: { index: false, follow: false }, referrer: "no-referrer" }
export default function ReportLayout({ children }: { children: React.ReactNode }) { return children }
