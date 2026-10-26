"use client"

import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="button-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold print:hidden"
    >
      <Printer size={15} />
      <span>Cetak / Simpan Dokumen</span>
    </button>
  )
}
