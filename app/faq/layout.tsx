import type { Metadata } from "next"
import { FAQ_ITEMS } from "@/lib/faq"
import { getSiteUrl } from "@/lib/siteUrl"

export const metadata: Metadata = {
  title: "Pertanyaan Umum - Aplikasi Manajemen Kos Terbaik",
  description:
    "Pertanyaan yang sering diajukan seputar BotKos: aplikasi terbaik untuk manajemen kamar kos, pencatatan penyewa, pengingat tagihan otomatis via WhatsApp & Telegram, dan pembukuan kos.",
  keywords: [
    "aplikasi manajemen kos terbaik",
    "aplikasi manajemen kamar dan penyewa kos",
    "aplikasi pengelola kos",
    "software kos kosan",
    "aplikasi pencatatan kamar kos",
    "pengingat sewa kos whatsapp",
    "aplikasi kos gratis",
    "faq botkos",
  ],
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ - Aplikasi Manajemen Kos & Penyewa Terbaik | BotKos",
    description:
      "Temukan jawaban seputar BotKos, aplikasi praktis untuk kelola kamar kos, penagihan sewa otomatis WhatsApp, dan pembukuan kos.",
    url: `${getSiteUrl()}/faq`,
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
}

export default function FaqLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  const serializedLd = JSON.stringify(faqJsonLd).replace(/</g, "\\u003C")

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializedLd }}
      />
      {children}
    </>
  )
}
