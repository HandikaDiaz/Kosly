import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pusat Bantuan",
  description: "Bantuan penggunaan dashboard, bot, pembayaran, dan pencatatan kos di BotKos.",
  alternates: { canonical: "/bantuan" },
}

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
