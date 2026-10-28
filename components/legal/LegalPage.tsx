import Link from "next/link"
import { getLegalMode } from "@/content/legal/mode"
import { legalMeta } from "@/content/legal/entity"
import { LegalLinks } from "./LegalLinks"

export const LegalPage = ({ title, sections }: { title: string; sections: readonly (readonly [string, string])[] }) => {
  const mode = getLegalMode()
  if (mode === "preparing") return <main className="mx-auto max-w-3xl px-6 py-20 text-center"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-4 text-[var(--ink-muted)]">Halaman ini sedang disiapkan.</p><Link className="mt-8 inline-block underline" href="/">Kembali ke beranda</Link></main>
  return <main className="mx-auto max-w-3xl px-6 py-12 text-[var(--ink)]"><Link href="/" className="text-sm underline">Kembali ke beranda</Link>{mode === "draft" && <div className="mt-6 border-2 border-[var(--warn)] bg-[var(--gold-pale)] p-4 font-bold">DRAF - belum ditinjau praktisi hukum</div>}<header className="mt-8 border-b border-[var(--line)] pb-6"><h1 className="text-4xl font-bold">{title}</h1><p className="mt-3 text-sm text-[var(--ink-muted)]">Versi {legalMeta.version}{legalMeta.effectiveDate ? ` · Berlaku ${legalMeta.effectiveDate}` : " · tanggal berlaku: PERLU KONFIRMASI"}</p></header><article className="mt-8 space-y-8">{sections.map(([heading, body]) => <section key={heading} id={heading.replace(/^#/, "")}><h2 className="text-xl font-bold">{heading.replace(/^#/, "")}</h2><p className="mt-3 whitespace-pre-line leading-7 text-[var(--ink-muted)]">{body}</p></section>)}</article><footer className="mt-12 border-t border-[var(--line)] pt-6 text-sm"><LegalLinks className="flex flex-wrap gap-3" /></footer></main>
}
