import { expect, test } from "vitest"
import { dueDateForPeriod, jakartaDateKey, periodOf, startOfDayJakarta } from "../lib/rent-date"

test("uses Jakarta calendar dates at the UTC boundary", () => {
  expect(periodOf(Date.UTC(2027, 0, 31, 16, 59, 59, 999))).toBe("2027-01")
  expect(periodOf(Date.UTC(2027, 0, 31, 17, 0, 0))).toBe("2027-02")
  expect(jakartaDateKey(Date.UTC(2027, 0, 31, 23, 30))).toBe("2027-02-01")
})

test("clamps day 31 to November 30", () => {
  expect(jakartaDateKey(dueDateForPeriod("2026-11", 31))).toBe("2026-11-30")
})

test("keeps day 29 in leap-year February and clamps it otherwise", () => {
  expect(jakartaDateKey(dueDateForPeriod("2028-02", 29))).toBe("2028-02-29")
  expect(jakartaDateKey(dueDateForPeriod("2027-02", 29))).toBe("2027-02-28")
})

test("returns Jakarta midnight for a timestamp near midnight UTC", () => {
  expect(startOfDayJakarta(Date.UTC(2027, 0, 31, 23, 30))).toBe(Date.UTC(2027, 1, 1, -7))
})
