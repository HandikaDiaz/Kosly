import { expect, test } from "vitest"
import { getBookingTransition } from "./bookings"

test("a pending booking can become locked only before its deadline", () => {
  expect(getBookingTransition("pending", "confirm_deposit", 1000, 2000)).toBe("locked")
  expect(getBookingTransition("pending", "confirm_deposit", 3000, 2000)).toBe("invalid")
})

test("only a locked booking can settle or expire", () => {
  expect(getBookingTransition("locked", "settle", 1000, 2000)).toBe("paid_off")
  expect(getBookingTransition("locked", "expire", 3000, 2000)).toBe("expired")
  expect(getBookingTransition("paid_off", "expire", 3000, 2000)).toBe("invalid")
})
