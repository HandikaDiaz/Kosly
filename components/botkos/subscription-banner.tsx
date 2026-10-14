"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function SubscriptionBanner() {
  const data = useQuery(api.subscriptions.getMine)
  if (!data?.upgradeRequired && !data?.roomLimitReached && !data?.propertyLimitReached) return null
  const message = data.roomLimitReached ? "Tier " + data.activeTier + " sudah mencapai batas " + data.roomLimit + " kamar." : data.propertyLimitReached ? "Tier " + data.activeTier + " sudah mencapai batas " + data.propertyLimit + " properti." : "Jumlah kamar Anda sudah " + data.roomCount + ". Saatnya mempertimbangkan upgrade ke tier " + data.recommendedTier + "."
  return <div className="mt-6 flex flex-col gap-3 border border-[var(--gold)] bg-[#fff8e8] p-4 text-sm text-[var(--ink)] sm:flex-row sm:items-center sm:justify-between"><span>{message}</span><Link href="/dashboard/billing" className="button-secondary w-fit">Lihat pilihan tier</Link></div>
}
