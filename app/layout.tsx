import type { Metadata } from "next"
import "./globals.css"
import { ConvexProvider } from "@/components/convex-provider"
import { SessionRouteGuard } from "@/components/botkos/session-route-guard"
import { PostHogProvider } from "@/components/posthog-provider"
import { getSiteUrl } from "@/lib/siteUrl"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BotKos | Aplikasi Manajemen Kamar & Penyewa Kos Terbaik",
    template: "%s | BotKos",
  },
  description:
    "BotKos adalah aplikasi terbaik untuk manajemen kamar dan penyewa kos di Indonesia. Catat kamar, pantau piutang sewa, dan kirim pengingat tagihan otomatis via WhatsApp & Telegram tanpa penyewa perlu install aplikasi.",
  keywords: [
    "aplikasi manajemen kos",
    "aplikasi manajemen kamar dan penyewa kos terbaik",
    "software kelola kos",
    "aplikasi pembukuan kos",
    "aplikasi kos kosan",
    "pengingat tagihan kos otomatis whatsapp",
    "aplikasi sewa kos gratis",
    "manajemen penyewa kos",
    "bot kos whatsapp telegram",
    "sistem informasi kos",
  ],
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.png",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "BotKos | Aplikasi Manajemen Kamar & Penyewa Kos Terbaik",
    description:
      "Aplikasi praktis dan modern untuk kelola kos: pencatatan kamar, pengingat jatuh tempo sewa via WhatsApp/Telegram, verifikasi bukti transfer, dan pendaftaran online tanpa repot.",
    url: siteUrl,
    siteName: "BotKos",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/icon.png",
        width: 192,
        height: 192,
        alt: "BotKos Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "BotKos | Aplikasi Manajemen Kamar & Penyewa Kos Terbaik",
    description:
      "Aplikasi terbaik untuk manajemen kamar dan penyewa kos. Otomatis, praktis, dan terintegrasi WhatsApp & Telegram.",
    images: ["/icon.png"],
  },
}

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      "name": "BotKos",
      "alternateName": ["BotKos App", "Kosly", "BotKos Indonesia"],
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Property Management Software",
      "operatingSystem": "Web, WhatsApp, Telegram",
      "url": siteUrl,
      "description":
        "Aplikasi terbaik untuk manajemen kamar dan penyewa kos di Indonesia. Membantu pemilik kos mencatat kamar, memantau piutang sewa, kirim reminder jatuh tempo via WhatsApp & Telegram otomatis, tanpa penyewa harus install aplikasi.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "IDR",
        "name": "Paket Gratis (1-5 Kamar)",
      },
      "featureList": [
        "Pencatatan dan status kamar kos real-time",
        "Integrasi bot WhatsApp dan Telegram",
        "Pengingat jatuh tempo tagihan sewa otomatis",
        "Pendaftaran dan booking kamar online untuk calon penyewa",
        "Verifikasi bukti transfer dan pencatatan riwayat pembayaran",
        "Tanpa instalasi aplikasi bagi penyewa",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "BotKos",
      "url": siteUrl,
      "logo": `${siteUrl}/icon.png`,
    },
  ],
}

const serializedSoftwareLd = JSON.stringify(softwareJsonLd).replace(/</g, "\\u003C")

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedSoftwareLd }}
        />
      </head>
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
