import { expect, test } from "vitest"
import { dueDateForPeriod, periodOf } from "../lib/rent-date"

test("keeps an October payment in October instead of shifting it to November", () => {
  const paidAt = new Date(2026, 9, 12).getTime()
  expect(periodOf(new Date(paidAt))).toBe("2026-10")
})

test("clamps day 31 to November 30", () => {
  expect(new Date(dueDateForPeriod("2026-11", 31)).getDate()).toBe(30)
})

test("keeps day 29 in leap-year February and clamps it otherwise", () => {
  expect(new Date(dueDateForPeriod("2028-02", 29)).getDate()).toBe(29)
  expect(new Date(dueDateForPeriod("2027-02", 29)).getDate()).toBe(28)
})
