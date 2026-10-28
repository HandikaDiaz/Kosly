import { describe, expect, test } from "vitest"
import { buildFaqItems, buildLodgingJsonLd, buildMetaDescription, buildRuleLines, buildTitle, cleanLandmarkName, formatLandmarkDistance, serializeJsonLd, validateLandmark } from "./kosInfoRules"

describe("kos info rules", () => {
  test("cleans and rejects unsafe landmarks", () => {
    expect(cleanLandmarkName("  Stasiun   Kota ")).toBe("Stasiun Kota")
    expect(() => validateLandmark({ name: "https://contoh.test", distanceM: 100 })).toThrow()
    expect(() => validateLandmark({ name: "@admin", distanceM: 100 })).toThrow()
    expect(() => validateLandmark({ name: "0812 3456 7890", distanceM: 100 })).toThrow()
    expect(() => validateLandmark({ name: "A", distanceM: 100 })).toThrow()
    expect(() => validateLandmark({ name: "Kampus", distanceM: 100 }, ["kampus"])).toThrow()
  })
  test("formats facts without inventing empty answers", () => {
    expect(formatLandmarkDistance(600)).toBe("sekitar 600 m")
    expect(buildRuleLines({ merokok: "tidak", jamMalam: { value: "tidak", time: "22:00" } })).toEqual(["Merokok: tidak boleh", "Jam malam: 22.00"])
    const view = { name: "Kos Melati", publicAreaLabel: "Dago", publicKosType: "putri" as const, publicShowPrice: false, rooms: [{ isAvailable: true }], publicDescription: "Dekat kampus." }
    expect(buildTitle(view)).toBe("Kos Melati - Putri di Dago | BotKos")
    expect(buildFaqItems(view).length).toBeGreaterThanOrEqual(2)
    expect(buildMetaDescription(view)).not.toContain("Rp")
    const jsonLd = buildLodgingJsonLd({ ...view, publicRules: { hewan: "boleh" }, facilities: [{ name: "WiFi" }] })
    expect(jsonLd).toMatchObject({ petsAllowed: true, amenityFeature: [{ name: "WiFi" }] })
    expect(jsonLd).not.toHaveProperty("aggregateRating")
    expect(jsonLd).not.toHaveProperty("review")
  })

  test("keeps JSON-LD fields conditional and escapes script delimiters", () => {
    const jsonLd = buildLodgingJsonLd({ name: "Kos </script>", publicAreaLabel: "Dago", publicShowPrice: false, publicShowFullAddress: false, publicAddress: "Jalan Rahasia" })
    expect(jsonLd).not.toHaveProperty("address")
    expect(jsonLd).not.toHaveProperty("priceRange")
    expect(jsonLd).not.toHaveProperty("offers")
    expect(jsonLd).not.toHaveProperty("geo")
    expect(jsonLd).not.toHaveProperty("aggregateRating")
    expect(jsonLd).not.toHaveProperty("review")
    expect(jsonLd).not.toHaveProperty("FAQPage")
    expect(serializeJsonLd(jsonLd)).not.toContain("</script>")
    expect(serializeJsonLd(jsonLd)).toContain("\\u003C/script>")
  })
})
