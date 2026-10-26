import { PageLoader } from "@/components/botkos/page-loader"

export default function Loading() {
  return (
    <PageLoader
      message="Menyiapkan Rapor Penghuni…"
      submessage="Memverifikasi keaslian dan status keamanan tautan"
    />
  )
}
