export { propertyTabUrl } from "../convex/lib/propertyTabs"
export type { PropertyTab } from "../convex/lib/propertyTabs"
import type { PropertyTab } from "../convex/lib/propertyTabs"

export type PropertyTabBadges = {
  applicationsOpen: number
  occupiedWithoutTenant?: number
  tenantsActive?: number
  reviewsUnreplied: number
  disputesOpen: number
  locationVerified: boolean
  isPublished: boolean
  photoCountPublic: number
}

export type ActionItem = { key: string; label: string; count: number; tab: PropertyTab; priority: number }

export const formatBadge = (value: number) => value <= 0 ? "" : value > 99 ? "99+" : String(value)

export const computeActionItems = (badges: PropertyTabBadges): ActionItem[] => {
  const items: ActionItem[] = []
  if (badges.applicationsOpen > 0) items.push({ key: "applications", label: "Pengajuan baru perlu ditinjau", count: badges.applicationsOpen, tab: "tenants", priority: 1 })
  if ((badges.occupiedWithoutTenant ?? 0) > 0) items.push({ key: "tenant-import", label: "Kamar terisi belum memiliki data penyewa", count: badges.occupiedWithoutTenant ?? 0, tab: "tenants", priority: 2 })
  if (badges.disputesOpen > 0) items.push({ key: "disputes", label: "Sengketa pembayaran perlu ditanggapi", count: badges.disputesOpen, tab: "tenants", priority: 3 })
  if (badges.reviewsUnreplied > 0) items.push({ key: "reviews", label: "Ulasan belum dibalas", count: badges.reviewsUnreplied, tab: "reviews", priority: 4 })
  if (badges.isPublished && !badges.locationVerified) items.push({ key: "location", label: "Verifikasi lokasi belum selesai", count: 0, tab: "location", priority: 5 })
  if (!badges.isPublished || badges.photoCountPublic < 3) items.push({ key: "public", label: badges.isPublished ? "Lengkapi halaman publik" : "Publikasikan halaman kos", count: 0, tab: "public", priority: 6 })
  return items.sort((a, b) => a.priority - b.priority)
}
