"use client"

import { useState } from "react"
import { Eye, LoaderCircle, Lock } from "lucide-react"

export const RevealButton = () => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reveal = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api${window.location.pathname}/reveal`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Gagal membuka rapor. Tautan ini mungkin sudah kedaluwarsa.")
      }
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuka rapor.")
      setBusy(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-800">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={reveal}
        className="button-primary inline-flex min-h-12 w-full items-center justify-center gap-2.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            <span>Membuka Dokumen Rapor…</span>
          </>
        ) : (
          <>
            <Eye size={17} />
            <span>Buka & Verifikasi Rapor Sekarang</span>
          </>
        )}
      </button>
    </div>
  )
}
