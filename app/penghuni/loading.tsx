import { PageLoader } from "@/components/botkos/page-loader"

export default function Loading() {
  return (
    <PageLoader
      message="Memuat Portal Penghuni…"
      submessage="Mengambil data identitas, catatan sewa, dan rapor Anda"
    />
  )
}
