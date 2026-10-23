import { describe, expect, test } from "vitest"
import {
  buildMapUrls,
  buildTelegramUrl,
  buildWhatsAppUrl,
  formatRupiah,
  getStartingMonthlyRent,
  sortRoomsByAvailability,
} from "./public-kos"

describe("public kos helpers", () => {
  test("formats rupiah and only derives a starting price from exposed monthly prices", () => {
    expect(formatRupiah(1500000)).toBe("Rp1.500.000")
    expect(
      getStartingMonthlyRent([
        { label: "A", isAvailable: true },
        { label: "B", isAvailable: false, monthlyRent: 1800000 },
        { label: "C", isAvailable: true, monthlyRent: 1500000 },
      ])
    ).toBe(1500000)
    expect(
      getStartingMonthlyRent([{ label: "A", isAvailable: true }])
    ).toBeNull()
  })

  test("keeps available rooms first without mutating the source", () => {
    const rooms = [
      { label: "Penuh", isAvailable: false },
      { label: "Tersedia", isAvailable: true },
    ]

    expect(sortRoomsByAvailability(rooms).map((room) => room.label)).toEqual([
      "Tersedia",
      "Penuh",
    ])
    expect(rooms[0].label).toBe("Penuh")
  })

  test("builds contact URLs only when the respective environment value exists", () => {
    expect(buildTelegramUrl(undefined, "kos-melati")).toBeNull()
    expect(buildWhatsAppUrl("", "Kos Melati", "kos-melati")).toBeNull()
    expect(buildTelegramUrl("@botkos", "kos melati")).toBe(
      "https://t.me/botkos?start=kos_kos%20melati"
    )
    expect(buildWhatsAppUrl("+62 812-3456", "Kos Melati", "kos-melati")).toBe(
      "https://wa.me/628123456?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20Kos%20Melati%20(kos-melati)."
    )
  })

  test("does not build a map without both public coordinates", () => {
    expect(buildMapUrls()).toBeNull()
    expect(buildMapUrls(-6.2)).toBeNull()
    expect(buildMapUrls(-6.2, 106.8)).toEqual({
      osmEmbedUrl:
        "https://www.openstreetmap.org/export/embed.html?bbox=106.797%2C-6.203%2C106.803%2C-6.197&layer=mapnik&marker=-6.2%2C106.8",
      googleMapsUrl:
        "https://www.google.com/maps/search/?api=1&query=-6.2%2C106.8",
    })
  })
})
