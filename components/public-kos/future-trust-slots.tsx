import { CheckCircle2, MapPin, ShieldCheck } from "lucide-react"
import { PublicReviews } from "./public-reviews"

type VerificationBadgeSlotProps = {
  isLocationVerified: boolean
  locationVerifiedAt?: number
}

type ReviewsSlotProps = {
  propertySlug: string
  initialReviews: {
    reviews: Array<{
      rating: number
      text?: string
      stayLabel: string
      monthYear: string
      ownerReply?: { text: string; monthYear: string }
    }>
    nextCursor: string | null
  }
  reviewCount: number
  ratingAverage: number | null
}

export const VerificationBadgeSlot = ({
  isLocationVerified,
  locationVerifiedAt,
}: VerificationBadgeSlotProps) => {
  if (!isLocationVerified) return null

  const monthYear = locationVerifiedAt
    ? new Intl.DateTimeFormat("id-ID", {
        month: "short",
        year: "numeric",
      }).format(new Date(locationVerifiedAt))
    : null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
      <span>Lokasi Terverifikasi</span>
      {monthYear && (
        <span className="hidden sm:inline font-normal text-emerald-700">
          • {monthYear}
        </span>
      )}
    </span>
  )
}

export const LocationTrustCard = ({
  isLocationVerified,
  locationVerifiedAt,
  hasPin,
}: {
  isLocationVerified: boolean
  locationVerifiedAt?: number
  hasPin: boolean
}) => {
  const verifiedDate = locationVerifiedAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(locationVerifiedAt))
    : null

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        isLocationVerified
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-emerald-50/30 text-emerald-950"
          : "border-[var(--line)] bg-[var(--background)] text-[var(--ink)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
            isLocationVerified
              ? "bg-emerald-600 text-white"
              : "bg-white text-[var(--ink-muted)] border border-[var(--line)]"
          }`}
        >
          {isLocationVerified ? <ShieldCheck size={20} /> : <MapPin size={20} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold sm:text-base">
              {isLocationVerified
                ? "Lokasi Fisik & Bangunan Terverifikasi"
                : "Informasi Lokasi & Peta"}
            </h3>
            {isLocationVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Resmi BotKos
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
            {isLocationVerified
              ? "Titik koordinat dan keberadaan fisik bangunan kos ini telah diverifikasi langsung di tempat menggunakan validasi GPS oleh sistem BotKos."
              : "Titik lokasi kos ini diatur oleh pemilik properti. Anda dapat memeriksa rute dan akses jalan melalui peta interaktif di bawah."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[11px] text-[var(--ink-muted)]">
            {isLocationVerified && verifiedDate && (
              <span className="flex items-center gap-1 text-emerald-800 font-medium">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Terverifikasi pada {verifiedDate}
              </span>
            )}
            <span className="text-[var(--ink-muted)]">
              🔒 Koordinat publik diperkirakan dalam radius ~100m demi kenyamanan privasi penghuni.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ReviewsSlot = ({
  propertySlug,
  initialReviews,
  reviewCount,
  ratingAverage,
}: ReviewsSlotProps) => {
  return (
    <section aria-labelledby="ulasan-penghuni">
      <h2 id="ulasan-penghuni" className="text-xl font-bold">
        Ulasan penghuni
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Ulasan terikat ke catatan tinggal di BotKos.
      </p>
      <div className="mt-4">
        <PublicReviews
          slug={propertySlug}
          initial={initialReviews}
          reviewCount={reviewCount}
          ratingAverage={ratingAverage}
        />
      </div>
    </section>
  )
}
