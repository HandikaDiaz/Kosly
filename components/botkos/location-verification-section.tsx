"use client"

import { LockKeyhole, MapPin, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useQuery } from "convex/react"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import { LocationPinPicker } from "./location-pin-picker"
import { VerificationCamera } from "./verification-camera"

type CaptureKind = "front" | "street" | "room"
type LocationVerificationSectionProps = {
  propertyId: Id<"properties">
  address: string
}

const slots: Array<{ kind: CaptureKind; label: string; description: string }> =
  [
    {
      kind: "front",
      label: "Tampak depan / gerbang",
      description: "Ambil foto dari area depan kos.",
    },
    {
      kind: "street",
      label: "Jalan di depan",
      description: "Tunjukkan jalan atau akses tepat di depan kos.",
    },
    {
      kind: "room",
      label: "Kamar",
      description: "Tunjukkan salah satu kamar di properti.",
    },
  ]

const statusLabel: Record<string, string> = {
  passed: "Lulus",
  needs_review: "Perlu ditinjau",
  rejected: "Ditolak",
}

export const LocationVerificationSection = ({
  propertyId,
  address,
}: LocationVerificationSectionProps) => {
  const verification = useQuery(
    api.locationVerification.getLocationVerification,
    { propertyId }
  )
  const [activeKind, setActiveKind] = useState<CaptureKind | null>(null)

  if (!verification) return null

  const captureByKind = new Map(
    verification.captures.map((capture) => [capture.kind, capture])
  )
  const statusTitle =
    verification.status === "verified"
      ? "Terverifikasi"
      : verification.status === "pending_review"
        ? "Menunggu tinjauan"
        : "Belum diverifikasi"
  const progress = Math.min(
    2,
    2 - verification.remainingRequirements.passedCapturesNeeded
  )

  return (
    <section id="verifikasi-lokasi" className="mt-8 border border-[var(--line)] bg-[#fffefa] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--wood)]/10 text-[var(--wood)]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-sm text-[var(--ink-muted)]">
              Kepercayaan lokasi
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
              Verifikasi lokasi
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
              Badge Lokasi terverifikasi akan tampil di halaman publik setelah
              dua foto lulus, termasuk foto tampak depan.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 border px-3 py-2 text-xs font-semibold ${verification.status === "verified" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : verification.status === "pending_review" ? "border-[var(--gold)] bg-[#fff8e8] text-[var(--gold-dark)]" : "border-[var(--line)] bg-white text-[var(--ink-muted)]"}`}
        >
          {statusTitle}
          {verification.locationVerifiedAt
            ? ` · ${new Date(verification.locationVerifiedAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`
            : ""}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <MapPin size={16} className="text-[var(--wood)]" /> Langkah 1 ·
            Tetapkan pin
          </div>
          <LocationPinPicker
            propertyId={propertyId}
            address={address}
            pin={verification.pin}
            hasCaptures={verification.captures.length > 0}
          />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Langkah 2 · Foto dari lokasi
            </p>
            <span className="text-xs text-[var(--ink-muted)]">
              {progress}/2 foto lulus
            </span>
          </div>
          {!verification.remainingRequirements.needsFrontCapture &&
          verification.remainingRequirements.passedCapturesNeeded ===
            0 ? null : (
            <p className="mb-3 border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
              Butuh {verification.remainingRequirements.passedCapturesNeeded}{" "}
              foto lulus lagi
              {verification.remainingRequirements.needsFrontCapture
                ? ", termasuk tampak depan"
                : ""}
              .
            </p>
          )}
          <div className="space-y-3">
            {slots.map((slot) => {
              const capture = captureByKind.get(slot.kind)
              const locked = !verification.pin
              return (
                <div
                  key={slot.kind}
                  className="border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {slot.label}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {slot.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${capture?.status === "passed" ? "text-[var(--sage)]" : capture?.status === "needs_review" ? "text-[var(--gold-dark)]" : capture?.status === "rejected" ? "text-[var(--warn)]" : "text-[var(--ink-muted)]"}`}
                    >
                      {capture ? statusLabel[capture.status] : "Belum diambil"}
                    </span>
                  </div>
                  {capture ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                      {capture.reason ??
                        `Jarak sekitar ${Math.round(capture.distanceM)} m dari pin.`}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActiveKind(slot.kind)}
                    disabled={locked}
                    className="button-secondary mt-3 text-xs"
                  >
                    <ShieldCheck size={14} />{" "}
                    {capture ? "Ambil ulang" : "Ambil foto"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--ink-muted)]">
        <LockKeyhole size={15} className="mt-0.5 shrink-0 text-[var(--wood)]" />
        <p>
          GPS hanya dibaca saat foto diambil. Foto dan koordinat verifikasi
          bersifat privat dan tidak tampil di halaman publik; publik hanya
          melihat status lokasi terverifikasi.
        </p>
      </div>
      {activeKind ? (
        <VerificationCamera
          propertyId={propertyId}
          kind={activeKind}
          onClose={() => setActiveKind(null)}
        />
      ) : null}
    </section>
  )
}
