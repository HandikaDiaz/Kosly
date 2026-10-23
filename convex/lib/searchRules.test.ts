import { describe, expect, test } from "vitest"
import { buildResultLine, cellsCoveringRadius, extractKosSlugFromStart, extractKosSlugFromWhatsappText, formatDistance, formatRupiah, gridCellFor, parseCariArgs } from "./searchRules"

describe("search rules", () => {
  test("grid and radius boundaries", () => { expect(gridCellFor(-0.01, 0.11)).toBe("-1:1"); expect(cellsCoveringRadius(0, 0, 3).length).toBeLessThanOrEqual(16); expect(() => cellsCoveringRadius(0, 0, 16)).toThrow() })
  test("parses search arguments and formats Indonesian values", () => { expect(parseCariArgs("radius=5 maks=1,5jt dekat kampus")).toMatchObject({ radiusKm: 5, maxPriceIdr: 1_500_000, areaQuery: "dekat kampus" }); expect(parseCariArgs("radius 5 maks 1.5jt")).toMatchObject({ radiusKm: 5, maxPriceIdr: 1_500_000 }); expect(formatDistance(600)).toBe("sekitar 600 m"); expect(formatDistance(1200)).toBe("sekitar 1,2 km"); expect(formatRupiah(1_500_000)).toBe("Rp1.500.000") })
  test("deep links and result line omit private price when absent", () => { expect(extractKosSlugFromStart("kos-foo")).toBeUndefined(); expect(extractKosSlugFromStart("kos_foo-bar")).toBe("foo-bar"); expect(extractKosSlugFromWhatsappText("Halo kos_foo-bar")).toBe("foo-bar"); expect(buildResultLine(1, { name: "Kos A", publicSlug: "kos-a", rooms: [{ isAvailable: true }], isLocationVerified: true, ratingAverage: null, reviewCount: 0 }, 600)).toContain("harga: tanya pemilik") })
})
