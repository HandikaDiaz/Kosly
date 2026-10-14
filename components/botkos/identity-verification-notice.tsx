import { ShieldAlert } from "lucide-react"

export function IdentityVerificationNotice({ action }: { action: "pendaftaran" | "pembayaran" }) {
  return (
    <section className="border border-[var(--gold)] bg-[#fff8e8] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 shrink-0 text-[var(--gold-dark)]" size={21} />
        <div>
          <h2 className="font-semibold text-[var(--ink)]">{action === "pendaftaran" ? "Pendaftaran belum tersedia" : "Pembayaran belum tersedia"}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Pemilik properti belum menyelesaikan verifikasi identitas. {action === "pendaftaran" ? "Anda belum dapat mengirim pendaftaran atau DP." : "Anda belum dapat mengirim bukti pembayaran atau melanjutkan transaksi."} Silakan hubungi pemilik properti untuk melanjutkan.</p>
        </div>
      </div>
    </section>
  )
}
