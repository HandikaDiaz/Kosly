import { internalQuery } from "../_generated/server"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import type { BotChannel } from "./types"
import {
  buildStatusMessage,
  buildUnpaidMessage,
  buildVacantMessage,
  type PropertyStatusData,
  type UnpaidItemData,
  type VacantItemData,
} from "./formatters"

export type BotQuery = "status" | "unpaid" | "vacant"

export const parseQueryCommand = (text: string): BotQuery | "help" | "invalid" => {
  const command = text.trim().toLowerCase().split(/\s+/)[0]
  if (command === "/status") return "status"
  if (command === "/belum_bayar") return "unpaid"
  if (command === "/kamar_kosong") return "vacant"
  if (command === "/help" || command === "/start") return "help"
  return "invalid"
}

export const getResponse = internalQuery({
  args: {
    ownerId: v.id("owners"),
    query: v.union(v.literal("status"), v.literal("unpaid"), v.literal("vacant")),
    now: v.number(),
    channel: v.optional(v.union(v.literal("telegram"), v.literal("whatsapp"))),
  },
  handler: async (ctx, args) => {
    const channel: BotChannel = args.channel ?? "whatsapp"
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .take(100)

    if (properties.length === 0) {
      return buildStatusMessage({ properties: [] }, channel, args.now)
    }

    if (args.query === "vacant") {
      const vacantItems: VacantItemData[] = []
      for (const property of properties) {
        const rooms = await ctx.db
          .query("rooms")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .take(100)
        for (const room of rooms) {
          if (room.status === "available") {
            vacantItems.push({
              propertyName: property.name,
              roomNumber: room.roomNumber,
              monthlyRent: room.monthlyRent,
            })
          }
        }
      }
      return buildVacantMessage(vacantItems, channel, args.now)
    }

    if (args.query === "unpaid") {
      const unpaidItems: UnpaidItemData[] = []
      for (const property of properties) {
        const charges = await ctx.db
          .query("rent_charges")
          .withIndex("by_property_and_status", (q) => q.eq("propertyId", property._id))
          .take(200)

        const unpaidCharges = charges.filter(
          (charge) => charge.status === "unpaid" && charge.dueDate <= args.now
        )

        for (const charge of unpaidCharges) {
          const tenant = await ctx.db.get("tenants", charge.tenantId)
          let roomNumber = ""
          if (tenant?.roomId) {
            const room = await ctx.db.get("rooms", tenant.roomId)
            if (room) roomNumber = room.roomNumber
          }
          unpaidItems.push({
            tenantName: tenant?.name ?? "Tenant",
            propertyName: property.name,
            roomNumber,
            period: charge.period,
            amount: charge.amount,
            dueDate: charge.dueDate,
          })
        }
      }
      return buildUnpaidMessage(unpaidItems, channel, args.now)
    }

    // Status query: gather complete statistics per property
    const propertyDataList: PropertyStatusData[] = []

    for (const property of properties) {
      const rooms = await ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .take(100)

      const tenants = await ctx.db
        .query("tenants")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .take(100)

      const pendingPayments = await ctx.db
        .query("payments")
        .withIndex("by_property_and_status", (q) =>
          q.eq("propertyId", property._id).eq("status", "pending_review")
        )
        .take(50)

      const activeTenants = tenants.filter((t) => t.status === "active")
      const pendingTenants = tenants.filter((t) => t.status === "pending")
      const vacantRooms = rooms.filter((r) => r.status === "available")

      propertyDataList.push({
        id: String(property._id),
        name: property.name,
        activeTenantsCount: activeTenants.length,
        pendingCount: pendingPayments.length + pendingTenants.length,
        vacantCount: vacantRooms.length,
        vacantRooms: vacantRooms.map((r) => ({
          roomNumber: r.roomNumber,
          monthlyRent: r.monthlyRent,
        })),
        totalRooms: rooms.length,
      })
    }

    return buildStatusMessage({ properties: propertyDataList }, channel, args.now)
  },
})

export const ownerExists = async (
  ctx: { db: { get: (table: "owners", id: Id<"owners">) => Promise<unknown> } },
  ownerId: Id<"owners">
) => Boolean(await ctx.db.get("owners", ownerId))
