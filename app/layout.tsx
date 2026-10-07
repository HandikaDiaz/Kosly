import type { Metadata } from "next"
import "./globals.css"
import { ConvexProvider } from "@/components/convex-provider"

export const metadata: Metadata = {
  title: "BotKos | Platform Manajemen Kos Modern & Otomatisasi Bot",
  description: "Kelola properti, penyewa, pembayaran, dan notifikasi bot otomatis secara efisien dengan BotKos.",
  metadataBase: new URL("https://botkos.id"),
  icons: {
    icon: "/BotKos-Logo.png",
    shortcut: "/BotKos-Logo.png",
    apple: "/BotKos-Logo.png",
  },
  openGraph: {
    title: "BotKos | Platform Manajemen Kos Modern",
    description: "Kelola properti, penyewa, pembayaran, dan notifikasi bot otomatis secara efisien dengan BotKos.",
    url: "https://botkos.id",
    siteName: "BotKos",
    locale: "id_ID",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ConvexProvider>{children}</ConvexProvider>
      </body>
    </html>
  )
}
