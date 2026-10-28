import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pembayaran Kamar",
  robots: { index: false, follow: false },
}

export default function PaymentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
