import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("reuses room create and update mutations with owner authorization", async () => {
  const t = convexTest(schema, modules)
  const setup = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "room-owner", role: "owner" })
    const propertyId = await ctx.db.insert("properties", { ownerId, name: "Kos Bot", address: "Jalan Bot", slug: "kos-bot", isActive: true })
    return { ownerId, propertyId }
  })
  const owner = t.withIdentity({ tokenIdentifier: "room-owner" })
  const roomId = await owner.mutation(api.rooms.create, { propertyId: setup.propertyId, roomNumber: "12", monthlyRent: 1500000 })
  await owner.mutation(api.rooms.update, { roomId, roomNumber: "12", monthlyRent: 1600000, status: "occupied" })
  const room = await t.run(async (ctx) => ctx.db.get("rooms", roomId))
  expect(room).toMatchObject({ roomNumber: "12", monthlyRent: 1600000, status: "occupied" })
})

test("rejects duplicate room numbers within one property", async () => {
  const t = convexTest(schema, modules)
  const propertyId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("owners", { tokenIdentifier: "duplicate-owner", role: "owner" })
    return await ctx.db.insert("properties", { ownerId, name: "Kos Duplikat", address: "Jalan", slug: "kos-duplikat", isActive: true })
  })
  const owner = t.withIdentity({ tokenIdentifier: "duplicate-owner" })
  await owner.mutation(api.rooms.create, { propertyId, roomNumber: "12", monthlyRent: 1500000 })
  await expect(owner.mutation(api.rooms.create, { propertyId, roomNumber: "12", monthlyRent: 1500000 })).rejects.toThrow("Nomor kamar sudah ada.")
})
