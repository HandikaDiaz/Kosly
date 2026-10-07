"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Upload, X, Image as ImageIcon, RefreshCw, AlertCircle } from "lucide-react"
import { FieldLabel } from "./field-label"

interface ImageUploadFieldProps {
  id?: string
  name?: string
  label: string
  hint?: string
  required?: boolean
  value?: File | null
  onChange: (file: File | null) => void
  error?: string | null
  maxSizeMB?: number
}

export function ImageUploadField({
  id = "image-upload",
  name = "proof",
  label,
  hint,
  required = false,
  value = null,
  onChange,
  error: externalError,
  maxSizeMB = 5,
}: ImageUploadFieldProps) {
  const [internalError, setInternalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayError = externalError ?? internalError

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setInternalError(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    const selectedFile = files[0]

    // 1. Format validation
    if (!selectedFile.type.startsWith("image/")) {
      setInternalError("File harus berupa gambar (JPG, PNG, WebP, dll).")
      if (inputRef.current) inputRef.current.value = ""
      onChange(null)
      return
    }

    // 2. Size validation
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (selectedFile.size > maxSizeBytes) {
      setInternalError(`Ukuran gambar maksimal ${maxSizeMB} MB.`)
      if (inputRef.current) inputRef.current.value = ""
      onChange(null)
      return
    }

    onChange(selectedFile)
  }

  const handleRemove = () => {
    setInternalError(null)
    if (inputRef.current) inputRef.current.value = ""
    onChange(null)
  }

  const previewUrl = value ? URL.createObjectURL(value) : null
  const fileSizeStr = value
    ? (value.size / (1024 * 1024)).toFixed(2) + " MB"
    : ""

  return (
    <div className="space-y-2">
      <FieldLabel
        htmlFor={id}
        label={label}
        hint={hint}
        required={required}
      />

      {/* Hidden file input element */}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept="image/*"
        required={required && !value}
        onChange={handleFileSelect}
        className="sr-only"
      />

      {value && previewUrl ? (
        /* ── Image Thumbnail Preview State ── */
        <div className="relative overflow-hidden border border-[var(--line)] bg-[#fffefa] p-3">
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-[var(--line)] bg-slate-100">
              <img
                src={previewUrl}
                alt="Pratinjau bukti pembayaran"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ink)]">
                {value.name}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)] font-mono">
                {fileSizeStr}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs text-[var(--wood)] hover:underline"
                >
                  <RefreshCw size={12} />
                  Ganti gambar
                </button>
                <span className="text-[var(--line)]">|</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 text-xs text-[var(--warn)] hover:underline"
                >
                  <X size={12} />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Empty Upload Trigger Dropzone State ── */
        <label
          htmlFor={id}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-center transition-colors ${
            displayError
              ? "border-[var(--warn)] bg-red-50/20"
              : "border-[var(--line)] bg-[#fffefa] hover:border-[var(--wood)] hover:bg-[#fffdfa]"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--background)] text-[var(--wood)]">
            <Upload size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">
              Pilih atau ambil foto bukti transfer
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Format JPG, PNG, atau WebP (Maksimal {maxSizeMB} MB)
            </p>
          </div>
        </label>
      )}

      {/* ── Validation Error Message ── */}
      {displayError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-[var(--warn)]">
          <AlertCircle size={13} className="shrink-0" />
          {displayError}
        </p>
      )}
    </div>
  )
}
