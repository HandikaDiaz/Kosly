import Link from "next/link"
import { getLegalMode, legalPages, legalUrl } from "@/content/legal/mode"

export const LegalLinks = ({ className = "" }: { className?: string }) => {
  if (getLegalMode() === "preparing") return null
  return <nav className={className} aria-label="Dokumen legal">{legalPages.map((page) => <Link key={page} href={legalUrl(page)} className="underline underline-offset-2">{page === "kebijakan-privasi" ? "Kebijakan Privasi" : page === "syarat-ketentuan" ? "Syarat & Ketentuan" : page === "panduan-ulasan" ? "Panduan Ulasan" : "Hak Data"}</Link>)}</nav>
}
