import type { Metadata } from "next"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { ReviewForm } from "@/components/public-kos/review-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

type ReviewPageProps = { params: Promise<{ token: string }> }

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { token } = await params
  const context = await fetchQuery(api.reviews.getInvitationContext, { token })

  return (
    <main className="min-h-svh bg-[var(--secondary)] px-4 py-8 text-[var(--ink)] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7">
          <p className="text-sm font-semibold tracking-wide text-[var(--wood)]">BotKos</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{context ? `Ulasan untuk ${context.propertyName}` : "Link ulasan"}</h1>
          {context ? <p className="mt-2 text-sm text-[var(--ink-muted)]">{context.stayLabel}</p> : null}
        </div>
        {context ? <ReviewForm token={token} /> : <p className="text-sm leading-6 text-[var(--ink-muted)]">Link ini tidak valid atau sudah tidak berlaku.</p>}
      </div>
    </main>
  )
}
