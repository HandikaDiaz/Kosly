"use client"

import { useEffect } from "react"
import { ExternalLink, X } from "lucide-react"

interface ImageLightboxProps {
  src: string
  alt: string
  title: string
  onClose: () => void
}

export function ImageLightbox({ src, alt, title, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col border border-[var(--line)] bg-[#fffefa] p-4 shadow-2xl sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
          <h2 className="truncate text-sm font-semibold text-[var(--ink)] sm:text-base">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau gambar"
            className="inline-flex shrink-0 items-center justify-center border border-[var(--line)] p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--ink)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#171513] p-2 sm:p-4">
          <img src={src} alt={alt} className="max-h-[72vh] max-w-full object-contain" />
        </div>

        <div className="mt-3 flex justify-end">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--wood)] hover:underline"
          >
            Buka di tab baru
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  )
}
