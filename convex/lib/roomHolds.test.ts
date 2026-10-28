import type { Id } from "../_generated/dataModel"
import { describe, expect, test } from "vitest"
import { getRoomHoldBlockers } from "./roomHolds"

const roomId = "room-1" as Id<"rooms">

const makeContext = (room: Record<string, unknown>, bookings: Record<string, unknown>[], applications: Record<string, unknown>[]) => ({
  db: {
    get: async (table: string, id: string) => {
      if (table === "rooms") return room._id === id ? room : null
      if (table === "bookings") return bookings.find((row) => row._id === id) ?? null
      if (table === "rentalApplications") return applications.find((row) => row._id === id) ?? null
      return null
    },
    query: (table: string) => ({
      withIndex: () => ({ take: async () => table === "bookings" ? bookings : applications }),
    }),
  },
}) as unknown as Parameters<typeof getRoomHoldBlockers>[0]

describe("room hold blockers", () => {
  test.each([
    ["active accepted application", [{ _id: "app-1", roomId, status: "accepted", holdExpiresAt: 2_000, code: "PJ-ABC123" }], "application"],
    ["pending registration booking", [{ _id: "app-1", roomId, status: "registration_submitted", bookingId: "booking-1", code: "PJ-ABC123" }], "application"],
  ])("blocks %s", async (_label, applications, kind) => {
    const blockers = await getRoomHoldBlockers(makeContext({ _id: roomId, status: "available", isActive: true }, [{ _id: "booking-1", roomId, status: "pending" }], applications), roomId, 1_000)
    expect(blockers.some((blocker) => blocker.kind === kind)).toBe(true)
  })

  test("ignores expired accepted holds and locked registration bookings", async () => {
    const blockers = await getRoomHoldBlockers(makeContext({ _id: roomId, status: "available", isActive: true }, [{ _id: "booking-1", roomId, status: "locked" }], [{ _id: "app-1", roomId, status: "accepted", holdExpiresAt: 999, code: "PJ-ABC123" }, { _id: "app-2", roomId, status: "registration_submitted", bookingId: "booking-1", code: "PJ-DEF456" }]), roomId, 1_000)
    expect(blockers).toEqual([{ kind: "booking", roomId, bookingId: "booking-1", bookingStatus: "locked" }])
  })

  test("blocks unavailable and inactive rooms", async () => {
    const blockers = await getRoomHoldBlockers(makeContext({ _id: roomId, status: "occupied", isActive: false }, [], []), roomId, 1_000)
    expect(blockers).toEqual([{ kind: "room", roomId }])
  })
})
