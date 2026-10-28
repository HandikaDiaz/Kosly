"use client"

import { AlertCircle, RefreshCw, Upload, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { FieldLabel } from "./field-label"

type MultiImageUploadFieldProps = {
  label: string
  hint?: string
  files: File[]
  onChange: (files: File[]) => void
  minFiles?: number
  maxSizeMB?: number
  error?: string | null
  required?: boolean
}

export function MultiImageUploadField({
  label,
  hint,
  files,
  onChange,
  minFiles = 3,
  maxSizeMB = 5,
  error,
  required = true,
}: MultiImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalError, setInternalError] = useState<string | null>(null)
  const previewUrls = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
  const displayError = error ?? internalError

  useEffect(() => () => previewUrls.forEach(({ url }) => URL.revokeObjectURL(url)), [files])

  const selectFiles = (selected: FileList | null) => {
    if (!selected) return
    const next = [...selected]
    const invalid = next.find((file) => !file.type.startsWith("image/") || file.size > maxSizeMB * 1024 * 1024)
    if (invalid) {
      setInternalError(`Semua foto harus berupa gambar maksimal ${maxSizeMB} MB.`)
      return
    }
    setInternalError(null)
    onChange([...files, ...next])
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <FieldLabel label={label} hint={hint} required={required} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => selectFiles(event.target.files)}
      />
      {previewUrls.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {previewUrls.map(({ file, url }, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="relative rounded-xl border border-[var(--line)] bg-[#fffefa] p-2">
              <img src={url} alt={`Pratinjau foto kos ${index + 1}`} className="h-28 w-full rounded-lg object-cover" />
              <p className="mt-1.5 truncate text-xs font-medium text-[var(--ink-muted)]">{file.name}</p>
              <div className="mt-1 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1 font-semibold text-[var(--wood)] hover:underline"
                >
                  <RefreshCw size={12} />
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}
                  className="inline-flex items-center gap-1 font-semibold text-[var(--warn)] hover:underline"
                >
                  <X size={12} />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line)] bg-[#fffdfa] p-5 text-center transition-colors hover:border-[var(--wood)] hover:bg-[#fff9ed]"
      >
        <Upload size={18} className="text-[var(--wood)]" />
        <span className="text-sm font-semibold text-[var(--ink)]">Pilih Foto Kos</span>
        <span className="text-xs text-[var(--ink-muted)]">
          {minFiles > 0 ? `Minimal ${minFiles} foto · ` : "Opsional · "}JPG, PNG, atau WebP · Maksimal {maxSizeMB} MB per foto
        </span>
      </button>
      {minFiles > 0 && (
        <p className={`text-xs ${files.length >= minFiles ? "text-emerald-700" : "text-[var(--ink-muted)]"}`}>
          {files.length}/{minFiles} foto minimum
        </p>
      )}
      {displayError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-[var(--warn)]">
          <AlertCircle size={13} />
          {displayError}
        </p>
      )}
    </div>
  )
}
