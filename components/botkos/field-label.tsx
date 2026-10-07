"use client"

/**
 * FieldLabel — reusable label with optional contextual hint.
 *
 * Desktop (pointer: fine / hover: hover) — shows a tooltip on mouse-hover or
 * keyboard-focus of the info icon.
 *
 * Mobile / touch (hover: none) — shows a small inline popover that opens on tap
 * and closes on a second tap or when the user taps outside.
 *
 * Usage:
 *   <FieldLabel htmlFor="roomNumber" label="Nomor Kamar" required
 *     hint="Nomor atau nama kamar yang ditampilkan ke penyewa." />
 *   <input id="roomNumber" ... aria-describedby="hint-roomNumber" />
 */

import { Info } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

// ─── helpers ────────────────────────────────────────────────────────────────

/** True when the primary pointer device supports hover (i.e. mouse). */
function deviceSupportsHover(): boolean {
  if (typeof window === "undefined") return true
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}

// ─── component ──────────────────────────────────────────────────────────────

interface FieldLabelProps {
  /** The `id` of the associated `<input>` / `<select>` / `<textarea>`. */
  htmlFor?: string
  label: string
  hint?: string
  required?: boolean
  /** Extra class names applied to the outer wrapper `<div>`. */
  className?: string
}

export function FieldLabel({
  htmlFor,
  label,
  hint,
  required = false,
  className = "",
}: FieldLabelProps) {
  const autoId = useId()
  // Stable hint id so inputs can use aria-describedby="hint-xxx"
  const hintId = `hint-${htmlFor ?? autoId}`

  const [open, setOpen] = useState(false)
  const [isHoverDevice, setIsHoverDevice] = useState(true) // SSR-safe default
  const iconRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Detect device capability once on mount (client-only)
  useEffect(() => {
    setIsHoverDevice(deviceSupportsHover())
  }, [])

  // Close tap-popover when the user clicks outside
  useEffect(() => {
    if (!open || isHoverDevice) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !iconRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("touchstart", handleOutside)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("touchstart", handleOutside)
    }
  }, [open, isHoverDevice])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        iconRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  return (
    <div className={`field-label-wrapper ${className}`}>
      <div className="field-label-row">
        {/* The visible <label> element */}
        <label className="field-label-text" htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="field-label-required" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>

        {/* Info icon — only rendered when a hint is provided */}
        {hint && (
          <span className="field-label-hint-anchor">
            {isHoverDevice ? (
              /* ── Desktop: CSS hover tooltip ─────────────────────── */
              <span className="field-label-tooltip-host">
                <span
                  role="img"
                  aria-label={`Info: ${label}`}
                  className="field-label-info-icon"
                  tabIndex={0}
                  /* keyboard: show tooltip on focus */
                  onFocus={() => setOpen(true)}
                  onBlur={() => setOpen(false)}
                >
                  <Info size={13} strokeWidth={2} />
                </span>
                {/* Hidden tooltip revealed by CSS :hover / :focus-within */}
                <span
                  role="tooltip"
                  id={hintId}
                  className="field-label-tooltip"
                >
                  {hint}
                </span>
              </span>
            ) : (
              /* ── Mobile: tap-to-open popover ─────────────────────── */
              <span className="field-label-popover-host">
                <button
                  ref={iconRef}
                  type="button"
                  aria-label={`Info: ${label}`}
                  aria-expanded={open}
                  aria-controls={hintId}
                  className="field-label-info-icon"
                  onClick={() => setOpen((v) => !v)}
                >
                  <Info size={13} strokeWidth={2} />
                </button>
                {open && (
                  <div
                    ref={popoverRef}
                    id={hintId}
                    role="tooltip"
                    className="field-label-popover"
                  >
                    {hint}
                  </div>
                )}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
