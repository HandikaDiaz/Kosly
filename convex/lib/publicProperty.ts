const RESERVED_PUBLIC_SLUGS = new Set([
  "admin",
  "api",
  "bantuan",
  "dashboard",
  "faq",
  "harga",
  "kebijakan-privasi",
  "kos",
  "login",
  "onboarding",
  "privacy",
  "syarat-ketentuan",
  "terms",
])

export const normalizePublicSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")

export const assertValidPublicSlug = (slug: string) => {
  if (
    slug.length < 3 ||
    slug.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    RESERVED_PUBLIC_SLUGS.has(slug)
  ) {
    throw new Error(
      "Slug publik harus 3–80 karakter, huruf kecil, dan bukan nama route sistem."
    )
  }
}

export const roundPublicCoordinate = (value: number) =>
  Math.round(value * 1000) / 1000

export const normalizePublicCoordinates = (
  lat: number | undefined,
  lng: number | undefined
) => {
  if (lat === undefined && lng === undefined) return {}
  if (
    lat === undefined ||
    lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  )
    throw new Error("Latitude dan longitude publik harus diisi bersama-sama.")
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
    throw new Error("Koordinat publik berada di luar rentang yang valid.")
  return {
    publicLat: roundPublicCoordinate(lat),
    publicLng: roundPublicCoordinate(lng),
  }
}

export const createSlugCandidate = (name: string, area: string) =>
  normalizePublicSlug(`${name}-${area}`) || "kos"

export const RESERVED_SLUGS = RESERVED_PUBLIC_SLUGS
