import { expect, test } from "vitest"
import { getTierForRoomCount, getTierPrice } from "./lib/subscription-tiers"

test("maps exact room boundaries to the expected tier", () => {
  expect(getTierForRoomCount(0)).toBe("free")
  expect(getTierForRoomCount(5)).toBe("free")
  expect(getTierForRoomCount(6)).toBe("starter")
  expect(getTierForRoomCount(20)).toBe("starter")
  expect(getTierForRoomCount(21)).toBe("growth")
  expect(getTierForRoomCount(40)).toBe("growth")
  expect(getTierForRoomCount(41)).toBe("pro")
})

test("uses historical tier prices by billing cycle", () => {
  expect(getTierPrice("free", "none")).toBe(0)
  expect(getTierPrice("starter", "monthly")).toBe(59000)
  expect(getTierPrice("growth", "annual")).toBe(1090000)
  expect(getTierPrice("pro", "monthly")).toBe(199000)
})
