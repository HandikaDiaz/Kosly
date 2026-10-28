export type PropertyTab = "summary" | "rooms" | "tenants" | "public" | "location" | "applications" | "reviews"

const tabSegments: Record<PropertyTab, string> = { summary: "", rooms: "/kamar", tenants: "/penghuni", public: "/halaman-publik", location: "/verifikasi", applications: "/pengajuan", reviews: "/ulasan" }

export const propertyTabUrl = (propertyId: string, tab: PropertyTab, baseUrl?: string) => {
  const path = `/dashboard/properties/${encodeURIComponent(propertyId)}${tabSegments[tab]}`
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path
}
