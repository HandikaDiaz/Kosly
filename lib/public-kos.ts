export type PublicRoom = {
  label: string
  roomType?: string
  sizeSqm?: number
  bathroomFacilities?: string[]
  furnitureElectronics?: string[]
  isAvailable: boolean
  monthlyRent?: number
  annualRent?: number
}

export const formatRupiah = (amount: number) =>
  `Rp${new Intl.NumberFormat("id-ID").format(amount)}`

export const getStartingMonthlyRent = (rooms: PublicRoom[]) => {
  const monthlyRents = rooms.flatMap((room) =>
    typeof room.monthlyRent === "number" ? [room.monthlyRent] : []
  )

  return monthlyRents.length > 0 ? Math.min(...monthlyRents) : null
}

export const sortRoomsByAvailability = (rooms: PublicRoom[]) =>
  [...rooms].sort(
    (left, right) => Number(right.isAvailable) - Number(left.isAvailable)
  )

export const buildTelegramUrl = (
  username: string | undefined,
  slug: string
) => {
  const normalizedUsername = username?.trim().replace(/^@/, "")
  return normalizedUsername
    ? `https://t.me/${normalizedUsername}?start=kos_${encodeURIComponent(slug)}`
    : null
}

export const buildWhatsAppUrl = (
  number: string | undefined,
  propertyName: string,
  slug: string
) => {
  const normalizedNumber = number?.trim().replace(/[^0-9]/g, "")
  if (!normalizedNumber) return null

  const message = `Halo, saya ingin bertanya tentang ${propertyName} (${slug}).`
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`
}

export const buildMapUrls = (latitude?: number, longitude?: number) => {
  if (latitude === undefined || longitude === undefined) return null

  const delta = 0.003
  const boundingBox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",")
  const marker = `${latitude},${longitude}`

  return {
    osmEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(boundingBox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker)}`,
  }
}
