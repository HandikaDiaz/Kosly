import { describe, expect, test } from "vitest"
import { computeActionItems, formatBadge, propertyTabUrl } from "./propertyTabs"

describe("property tabs", () => {
  test("builds safe tab URLs", () => {
    expect(propertyTabUrl("abc/def", "summary")).toBe("/dashboard/properties/abc%2Fdef")
    expect(propertyTabUrl("p1", "tenants")).toBe("/dashboard/properties/p1/penghuni")
    expect(propertyTabUrl("p1", "reviews", "https://app.test/")).toBe("https://app.test/dashboard/properties/p1/ulasan")
  })
  test("sorts action items and only asks for location after publish", () => {
    const items = computeActionItems({ applicationsOpen: 2, disputesOpen: 1, reviewsUnreplied: 3, locationVerified: false, isPublished: true, photoCountPublic: 3 })
    expect(items.map((item) => item.key)).toEqual(["applications", "disputes", "reviews", "location"])
    expect(computeActionItems({ applicationsOpen: 0, disputesOpen: 0, reviewsUnreplied: 0, locationVerified: false, isPublished: false, photoCountPublic: 0 }).map((item) => item.key)).toEqual(["public"])
  })
  test("formats badges", () => {
    expect(formatBadge(0)).toBe("")
    expect(formatBadge(1)).toBe("1")
    expect(formatBadge(99)).toBe("99")
    expect(formatBadge(100)).toBe("99+")
  })
})
