import { PageLoader } from "@/components/botkos/page-loader"

export default function Loading() {
  return (
    <PageLoader
      message="Memuat Informasi Kos…"
      submessage="Menyiapkan foto, ketersediaan kamar, dan ulasan penghuni"
    />
  )
}
