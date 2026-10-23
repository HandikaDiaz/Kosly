export const DEFAULT_RADIUS_KM = 3
export const MAX_RADIUS_KM = 15
export const RADIUS_EXPANSION_STEPS = [3, 5, 10] as const
export const MAX_RESULTS = 5
export const GRID_DEGREES = 0.1
export const CONTEXT_TTL_MIN = 30
export const MAX_SEARCHES_PER_SENDER_PER_HOUR = 20
export const MAX_CELLS_PER_QUERY = 16

export type SearchArgs = { radiusKm?: number; maxPriceIdr?: number; areaQuery?: string; notes: string[] }
export const gridCellFor = (lat: number, lng: number) => Math.floor(lat / GRID_DEGREES) + ":" + Math.floor(lng / GRID_DEGREES)
export const cellsCoveringRadius = (lat: number, lng: number, radiusKm: number) => {
  if (radiusKm > MAX_RADIUS_KM || radiusKm <= 0) throw new Error("Radius harus antara 1 dan " + MAX_RADIUS_KM + " km.")
  const latDegrees = radiusKm / 111
  const lngDegrees = radiusKm / (111 * Math.max(0.1, Math.cos(lat * Math.PI / 180)))
  const minLat = Math.floor((lat - latDegrees) / GRID_DEGREES); const maxLat = Math.floor((lat + latDegrees) / GRID_DEGREES)
  const minLng = Math.floor((lng - lngDegrees) / GRID_DEGREES); const maxLng = Math.floor((lng + lngDegrees) / GRID_DEGREES)
  const cells: string[] = []
  for (let a = minLat; a <= maxLat; a += 1) for (let b = minLng; b <= maxLng; b += 1) cells.push(a + ":" + b)
  if (cells.length > MAX_CELLS_PER_QUERY) throw new Error("Radius pencarian terlalu luas.")
  return cells
}
const parsePrice = (raw: string) => { const match = raw.toLowerCase().replace(/,/g, ".").replace(/\s/g, "").match(/^([0-9]+(?:\.[0-9]+)?)(jt|juta|k)?$/); if (!match) return undefined; const value = Number(match[1]) * (match[2] === "jt" || match[2] === "juta" ? 1_000_000 : match[2] === "k" ? 1_000 : 1); return Number.isFinite(value) && value > 0 && value <= 100_000_000 ? Math.round(value) : undefined }
export const parseCariArgs = (text: string): SearchArgs => {
  const notes: string[] = []; let radiusKm: number | undefined; let maxPriceIdr: number | undefined; const area: string[] = []
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i += 1) { const token = tokens[i]; const radius = token.match(/^radius(?:=(.+))?$/i); if (radius) { const value = Number(radius[1] ?? tokens[++i]); if (value > 0 && value <= MAX_RADIUS_KM) radiusKm = value; else notes.push("Radius diabaikan karena di luar batas."); continue }; const price = token.match(/^maks(?:=(.+))?$/i); if (price) { const parsed = parsePrice(price[1] ?? tokens[++i] ?? ""); if (parsed) maxPriceIdr = parsed; else notes.push("Batas harga diabaikan karena formatnya tidak dikenali."); continue }; area.push(token) }
  return { ...(radiusKm ? { radiusKm } : {}), ...(maxPriceIdr ? { maxPriceIdr } : {}), ...(area.length ? { areaQuery: area.join(" ") } : {}), notes }
}
export const formatDistance = (meters: number) => meters < 1000 ? "sekitar " + Math.max(50, Math.round(meters / 50) * 50).toLocaleString("id-ID") + " m" : "sekitar " + (Math.round(meters / 100) / 10).toLocaleString("id-ID") + " km"
export const formatRupiah = (amount: number) => "Rp" + new Intl.NumberFormat("id-ID").format(amount)
export const buildResultLine = (index: number, kos: { name: string; publicAreaLabel?: string; publicSlug: string; rooms: Array<{ isAvailable: boolean; monthlyRent?: number }>; isLocationVerified: boolean; ratingAverage: number | null; reviewCount: number }, distanceM: number) => { const available = kos.rooms.filter((room) => room.isAvailable).length; const priced = kos.rooms.map((room) => room.monthlyRent).filter((value): value is number => value !== undefined); const rating = kos.ratingAverage !== null ? " · " + kos.ratingAverage.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " (" + kos.reviewCount + " ulasan)" : ""; return index + ". " + kos.name + (kos.publicAreaLabel ? " · " + kos.publicAreaLabel : "") + " · " + formatDistance(distanceM) + " · " + (priced.length ? "mulai dari " + formatRupiah(Math.min(...priced)) + "/bulan" : "harga: tanya pemilik") + " · " + available + " kamar tersedia" + (kos.isLocationVerified ? " · Lokasi terverifikasi" : "") + rating + " · /kos/" + kos.publicSlug }
export const buildSearchReply = ({ results, radiusKm, expandedFrom, notes = [] }: { results: string[]; radiusKm: number; expandedFrom?: number; notes?: string[] }) => [...(expandedFrom ? ["Tidak ada hasil dalam ±" + expandedFrom + " km; saya memperlebar ke ±" + radiusKm + " km."] : []), ...notes, ...(results.length ? results : ["Belum ada kos terdaftar dalam ±" + radiusKm + " km.", "Coba perlebar radius: /cari radius=10"]), ...(results.length ? ["Balas /detail 2 untuk melihat detail."] : [])].join("\n")
export const extractKosSlugFromStart = (payload: string) => payload.trim().match(/^kos_([a-z0-9-]+)$/i)?.[1]?.toLowerCase()
export const extractKosSlugFromWhatsappText = (text: string) => text.match(/(?:^|\s)kos_([a-z0-9-]+)(?:\s|$)/i)?.[1]?.toLowerCase()
