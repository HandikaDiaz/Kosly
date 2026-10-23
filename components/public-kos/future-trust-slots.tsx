import { PublicReviews } from "./public-reviews"

type VerificationBadgeSlotProps = {
  isLocationVerified: boolean
  locationVerifiedAt?: number
}

type ReviewsSlotProps = {
  propertySlug: string
  initialReviews: { reviews: Array<{ rating: number; text?: string; stayLabel: string; monthYear: string; ownerReply?: { text: string; monthYear: string } }>; nextCursor: string | null }
  reviewCount: number
  ratingAverage: number | null
}


export const VerificationBadgeSlot = ({
  isLocationVerified,
  locationVerifiedAt,
}: VerificationBadgeSlotProps) => {
  if (!isLocationVerified || locationVerifiedAt === undefined) return null

  const monthYear = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(locationVerifiedAt))

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
      Lokasi terverifikasi
      <span className="font-normal text-emerald-700">
        Pemilik berada di lokasi ini saat verifikasi ({monthYear})
      </span>
    </span>
  )
}

export const ReviewsSlot = ({ propertySlug, initialReviews, reviewCount, ratingAverage }: ReviewsSlotProps) => {
  return <section aria-labelledby="ulasan-penghuni"><h2 id="ulasan-penghuni" className="text-xl font-bold">Ulasan penghuni</h2><p className="mt-2 text-sm text-[var(--ink-muted)]">Ulasan terikat ke catatan tinggal di BotKos.</p><div className="mt-4"><PublicReviews slug={propertySlug} initial={initialReviews} reviewCount={reviewCount} ratingAverage={ratingAverage} /></div></section>
}
