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
}

export function MultiImageUploadField({ label, hint, files, onChange, minFiles = 3, maxSizeMB = 5, error }: MultiImageUploadFieldProps) {
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

  return <div className="space-y-2">
    <FieldLabel label={label} hint={hint} required />
    <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => selectFiles(event.target.files)} />
    <div className="grid gap-3 sm:grid-cols-3">
      {previewUrls.map(({ file, url }, index) => <div key={`${file.name}-${file.lastModified}`} className="relative border border-[var(--line)] bg-[#fffefa] p-2">
        <img src={url} alt={`Pratinjau foto kos ${index + 1}`} className="h-28 w-full object-cover" />
        <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">{file.name}</p>
        <div className="mt-1 flex gap-2 text-xs"><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 text-[var(--wood)]"><RefreshCw size={12} />Ganti</button><button type="button" onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 text-[var(--warn)]"><X size={12} />Hapus</button></div>
      </div>)}
    </div>
    <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--line)] p-6 text-center hover:border-[var(--wood)]">
      <Upload size={18} className="text-[var(--wood)]" /><span className="text-sm font-medium text-[var(--ink)]">Pilih foto kos</span><span className="text-xs text-[var(--ink-muted)]">Minimal {minFiles} foto · JPG, PNG, atau WebP · Maksimal {maxSizeMB} MB per foto</span>
    </button>
    <p className={`text-xs ${files.length >= minFiles ? "text-emerald-700" : "text-[var(--ink-muted)]"}`}>{files.length}/{minFiles} foto minimum</p>
    {displayError && <p role="alert" className="flex items-center gap-1.5 text-xs text-[var(--warn)]"><AlertCircle size={13} />{displayError}</p>}
  </div>
}
