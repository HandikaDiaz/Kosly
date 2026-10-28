import { formatDistance, formatRupiah } from "./searchRules"

export const KOS_TYPES = ["putra", "putri", "campur"] as const
export const RULE_KEYS = ["hewan", "merokok", "tamu", "masak", "jamMalam"] as const
export const MAX_LANDMARKS = 5
export const LANDMARK_NAME_MIN = 2
export const LANDMARK_NAME_MAX = 50
export const LANDMARK_DISTANCE_MIN_M = 50
export const LANDMARK_DISTANCE_MAX_M = 20_000
export const RELATED_LIMIT = 4
export const META_DESC_MAX = 155
export const FAQ_MIN_ITEMS = 2

export type KosType = (typeof KOS_TYPES)[number]
export type RuleValue = "boleh" | "tidak"
export type PublicRules = Partial<Record<Exclude<(typeof RULE_KEYS)[number], "jamMalam">, RuleValue>> & {
  jamMalam?: { value: RuleValue; time?: string }
}
export type Landmark = { name: string; distanceM: number }

export const normalizePublicAreaKey = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ")

export const cleanLandmarkName = (value: string) => value.trim().replace(/\s+/g, " ")

const looksLikePhone = (value: string) => /(?:\+?\d[\d .()\-]{6,}\d)/.test(value)
const looksUnsafe = (value: string) => /https?:\/\/|www\.|@/i.test(value) || looksLikePhone(value)

export const validateLandmark = (landmark: Landmark, existingNames: string[] = []) => {
  const name = cleanLandmarkName(landmark.name)
  if (name.length < LANDMARK_NAME_MIN || name.length > LANDMARK_NAME_MAX) throw new Error(`Nama landmark harus ${LANDMARK_NAME_MIN}-${LANDMARK_NAME_MAX} karakter.`)
  if (looksUnsafe(name)) throw new Error("Nama landmark tidak boleh berisi URL, @, atau nomor telepon.")
  if (!Number.isFinite(landmark.distanceM) || Math.round(landmark.distanceM) < LANDMARK_DISTANCE_MIN_M || Math.round(landmark.distanceM) > LANDMARK_DISTANCE_MAX_M) throw new Error(`Jarak landmark harus ${LANDMARK_DISTANCE_MIN_M}-${LANDMARK_DISTANCE_MAX_M} meter.`)
  const duplicate = existingNames.some((item) => item.toLowerCase() === name.toLowerCase())
  if (duplicate) throw new Error("Landmark tidak boleh duplikat.")
  return { name, distanceM: Math.round(landmark.distanceM) }
}

export const formatLandmarkDistance = (meters: number) => formatDistance(meters)
export const labelKosType = (type?: string) => type === "putra" ? "Putra" : type === "putri" ? "Putri" : type === "campur" ? "Campur" : undefined

const ruleLabels: Record<string, string> = { hewan: "Hewan peliharaan", merokok: "Merokok", tamu: "Tamu lawan jenis", masak: "Memasak di kamar" }
export const buildRuleLines = (rules?: PublicRules) => {
  if (!rules) return []
  const lines: string[] = []
  for (const key of ["hewan", "merokok", "tamu", "masak"] as const) {
    const value = rules[key]
    if (value) lines.push(`${ruleLabels[key]}: ${value === "boleh" ? "boleh" : "tidak boleh"}`)
  }
  if (rules.jamMalam) lines.push(`Jam malam: ${rules.jamMalam.value === "tidak" && rules.jamMalam.time ? rules.jamMalam.time.replace(":", ".") : rules.jamMalam.value === "boleh" ? "boleh" : "tidak boleh"}`)
  return lines
}

export type KosInfoView = {
  name: string
  publicAreaLabel?: string
  publicKosType?: KosType
  publicDescription?: string
  publicShowPrice?: boolean
  publicShowFullAddress?: boolean
  publicAddress?: string
  rooms?: Array<{ isAvailable: boolean; monthlyRent?: number }>
  facilities?: Array<{ name: string }>
  publicRules?: PublicRules
  publicLandmarks?: Landmark[]
  isLocationVerified?: boolean
}

export const buildInfoFacts = (view: KosInfoView) => {
  const facts: Array<{ label: string; value: string }> = []
  const type = labelKosType(view.publicKosType)
  if (type) facts.push({ label: "Tipe kos", value: type })
  if (view.publicAreaLabel) facts.push({ label: "Area", value: view.publicAreaLabel })
  const prices = view.publicShowPrice ? (view.rooms ?? []).map((room) => room.monthlyRent).filter((value): value is number => typeof value === "number") : []
  if (prices.length) facts.push({ label: "Harga mulai", value: `${formatRupiah(Math.min(...prices))}/bulan` })
  if (view.rooms) facts.push({ label: "Kamar tersedia", value: String(view.rooms.filter((room) => room.isAvailable).length) })
  const facilities = (view.facilities ?? []).slice(0, 6).map((facility) => facility.name)
  if (facilities.length) facts.push({ label: "Fasilitas utama", value: facilities.join(", ") })
  for (const line of buildRuleLines(view.publicRules)) facts.push({ label: "Aturan", value: line })
  for (const landmark of (view.publicLandmarks ?? [])) facts.push({ label: "Landmark", value: `${landmark.name} (${formatLandmarkDistance(landmark.distanceM)}, perkiraan menurut pemilik)` })
  if (view.isLocationVerified) facts.push({ label: "Lokasi", value: "Terverifikasi" })
  return facts
}

const firstSentence = (value?: string) => value?.trim().split(/(?<=[.!?])\s+/)[0]
const trimWords = (value: string, max: number) => {
  if (value.length <= max) return value
  const clipped = value.slice(0, max + 1).replace(/\s+\S*$/, "").replace(/[,.!?;:]$/, "")
  return `${clipped}.`
}
export const buildMetaDescription = (view: KosInfoView) => {
  const type = labelKosType(view.publicKosType)
  const prefix = `Kos${type ? ` ${type.toLowerCase()}` : ""}${view.publicAreaLabel ? ` di ${view.publicAreaLabel}` : ""}`
  const prices = view.publicShowPrice ? (view.rooms ?? []).map((room) => room.monthlyRent).filter((value): value is number => typeof value === "number") : []
  const available = view.rooms?.filter((room) => room.isAvailable).length
  const parts = [prefix, prices.length ? `mulai ${formatRupiah(Math.min(...prices))}/bulan` : "", available !== undefined ? `${available} kamar tersedia` : "", view.isLocationVerified ? "lokasi terverifikasi" : "", firstSentence(view.publicDescription) ?? ""].filter(Boolean)
  return trimWords(parts.join(". "), META_DESC_MAX)
}

export const buildTitle = (view: KosInfoView) => {
  const name = view.name.trim()
  const type = labelKosType(view.publicKosType)
  const typeSuffix = type ? ` - ${/^kos\s+/i.test(name) ? "" : "Kos "}${type}` : ""
  return `${name}${typeSuffix}${view.publicAreaLabel ? ` di ${view.publicAreaLabel}` : ""} | BotKos`
}

export const buildFaqItems = (view: KosInfoView) => {
  const items: Array<{ question: string; answer: string }> = []
  const type = labelKosType(view.publicKosType)
  if (type) items.push({ question: "Kos ini untuk siapa?", answer: `Kos ${type}.` })
  const prices = view.publicShowPrice ? (view.rooms ?? []).map((room) => room.monthlyRent).filter((value): value is number => typeof value === "number") : []
  if (prices.length) items.push({ question: "Berapa harga mulai sewanya?", answer: `${formatRupiah(Math.min(...prices))} per bulan.` })
  if (view.rooms) items.push({ question: "Apakah ada kamar yang tersedia?", answer: `${view.rooms.filter((room) => room.isAvailable).length} kamar tersedia.` })
  const facilities = (view.facilities ?? []).slice(0, 6).map((facility) => facility.name)
  if (facilities.length) items.push({ question: "Fasilitas apa yang tersedia?", answer: facilities.join(", ") })
  const rules = buildRuleLines(view.publicRules)
  const landmark = view.publicLandmarks?.[0]
  if (rules.length || landmark) items.push({ question: "Apa aturan atau landmark di dekat kos?", answer: [...rules.slice(0, 3), ...(landmark ? [`${landmark.name} ${formatLandmarkDistance(landmark.distanceM)} (perkiraan menurut pemilik)`] : [])].join("; ") })
  return items.length >= FAQ_MIN_ITEMS ? items.slice(0, 5) : []
}

export const buildLodgingJsonLd = (view: KosInfoView) => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: view.name,
  ...(view.publicDescription ? { description: view.publicDescription } : {}),
  ...(view.publicShowFullAddress && view.publicAddress ? { address: { "@type": "PostalAddress", streetAddress: view.publicAddress, addressLocality: view.publicAreaLabel } } : {}),
  ...(view.publicRules?.hewan ? { petsAllowed: view.publicRules.hewan === "boleh" } : {}),
  ...(view.facilities?.length ? { amenityFeature: view.facilities.map((facility) => ({ "@type": "LocationFeatureSpecification", name: facility.name })) } : {}),
})

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003C").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
