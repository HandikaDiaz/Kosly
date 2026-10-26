import { PageLoader } from "@/components/botkos/page-loader"

export default function Loading() {
  return (
    <PageLoader
      message="Memverifikasi tautan ulasan…"
      submessage="Menghubungkan ke sistem BotKos"
    />
  )
}
