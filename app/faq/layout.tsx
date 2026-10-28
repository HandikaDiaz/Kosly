import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pertanyaan Umum",
  description: "Jawaban singkat tentang cara kerja BotKos untuk pemilik kos dan penyewa.",
  alternates: { canonical: "/faq" },
}

export default function FaqLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
