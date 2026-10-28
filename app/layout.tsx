import type { Metadata } from "next"
import "./globals.css"
import { ConvexProvider } from "@/components/convex-provider"
import { SessionRouteGuard } from "@/components/botkos/session-route-guard"
import { PostHogProvider } from "@/components/posthog-provider"
import { getSiteUrl } from "@/lib/siteUrl"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "BotKos | Pencatatan Kos dan Penyewa", template: "%s | BotKos" },
  description:
    "BotKos membantu pemilik kos mencatat kamar, penyewa, pembayaran, dan pengingat melalui dashboard serta bot.",
  icons: {
    icon: [
      { url: "/botkos-logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/botkos-logo.png",
    apple: "/botkos-logo.png",
  },
  openGraph: {
    title: "BotKos | Pencatatan Kos dan Penyewa",
    description:
      "BotKos membantu pemilik kos mencatat kamar, penyewa, pembayaran, dan pengingat melalui dashboard serta bot.",
    url: getSiteUrl(),
    siteName: "BotKos",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BotKos | Pencatatan Kos dan Penyewa",
    description: "Pencatatan kos, penyewa, pembayaran, dan pengingat dalam satu tempat.",
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
        <PostHogProvider>
          <ConvexProvider>
            <SessionRouteGuard>{children}</SessionRouteGuard>
          </ConvexProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
