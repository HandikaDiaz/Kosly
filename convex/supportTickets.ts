import { mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { findOwnerForIdentity, requireAdmin, requireOwner } from "./lib/auth"

const categoryValidator = v.union(v.literal("bug"), v.literal("masukan"), v.literal("lain_lain"))
const statusValidator = v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed"))
const tierValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("pro"), v.literal("guest"))

const ticketFields = {
  _id: v.id("support_tickets"),
  _creationTime: v.number(),
  ownerId: v.union(v.id("owners"), v.null()),
  name: v.string(),
  contactEmail: v.string(),
  category: categoryValidator,
  subject: v.string(),
  message: v.string(),
  status: statusValidator,
  priorityTier: tierValidator,
  createdAt: v.number(),
}

const replyFields = {
  _id: v.id("support_ticket_replies"),
  _creationTime: v.number(),
  ticketId: v.id("support_tickets"),
  sender: v.union(v.literal("admin"), v.literal("user")),
  message: v.string(),
  createdAt: v.number(),
}

const cleanText = (value: string, label: string, maxLength: number) => {
  const text = value.trim()
  if (!text) throw new Error(`${label} wajib diisi.`)
  if (text.length > maxLength) throw new Error(`${label} terlalu panjang.`)
  return text
}

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    category: categoryValidator,
    subject: v.string(),
    message: v.string(),
  },
  returns: v.id("support_tickets"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const owner = identity ? await findOwnerForIdentity(ctx, identity) : null
    const name = cleanText(owner?.name ?? args.name ?? "", "Nama", 120)
    // Resolve email: prefer owner record, then identity token, then caller-supplied arg.
    // This handles the case where an owner is authenticated but their email field is
    // not yet stored in the owners table (e.g. legacy records or sign-up edge cases).
    const resolvedEmail = owner?.email ?? identity?.email ?? args.contactEmail ?? ""
    const contactEmail = cleanText(resolvedEmail, "Email", 254)
    if (!contactEmail.includes("@")) throw new Error("Email belum valid.")
    const subject = cleanText(args.subject, "Subjek", 160)
    const message = cleanText(args.message, "Pesan", 4000)
    let priorityTier: "free" | "starter" | "growth" | "pro" | "guest" = "guest"
    if (owner) {
      const subscription = await ctx.db.query("subscriptions").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).unique()
      priorityTier = subscription?.tier ?? "free"
    }
    const ticketId = await ctx.db.insert("support_tickets", {
      ...(owner ? { ownerId: owner._id } : {}),
      name,
      contactEmail,
      category: args.category,
      subject,
      message,
      status: "open",
      priorityTier,
      createdAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.emails.sendSupportTicketReceipt, { ticketId, name, email: contactEmail, subject })
    return ticketId
  },
})

export const listMine = query({
  args: {},
  returns: v.array(v.object({ ...ticketFields, replies: v.array(v.object(replyFields)) })),
  handler: async (ctx) => {
    const owner = await requireOwner(ctx)
    const tickets = await ctx.db.query("support_tickets").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).order("desc").take(50)
    return await Promise.all(tickets.map(async (ticket) => ({
      ...ticket,
      ownerId: ticket.ownerId ?? null,
      replies: await ctx.db.query("support_ticket_replies").withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id)).order("asc").take(100),
    })))
  },
})

export const listAdmin = query({
  args: { status: v.optional(statusValidator), category: v.optional(categoryValidator) },
  returns: v.array(v.object(ticketFields)),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const tickets = args.status
      ? await ctx.db.query("support_tickets").withIndex("by_status", (q) => q.eq("status", args.status!)).take(200)
      : await ctx.db.query("support_tickets").take(200)
    const filtered = args.category ? tickets.filter((ticket) => ticket.category === args.category) : tickets
    return filtered.sort((left, right) => {
      const priority = (ticket: typeof left) => ticket.status === "open" && (ticket.priorityTier === "growth" || ticket.priorityTier === "pro") ? 1 : 0
      return priority(right) - priority(left) || left.createdAt - right.createdAt
    }).map((ticket) => ({ ...ticket, ownerId: ticket.ownerId ?? null }))
  },
})

export const getAdminDetail = query({
  args: { ticketId: v.id("support_tickets") },
  returns: v.object({ ticket: v.object(ticketFields), replies: v.array(v.object(replyFields)) }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const ticket = await ctx.db.get("support_tickets", args.ticketId)
    if (!ticket) throw new Error("Tiket tidak ditemukan.")
    const replies = await ctx.db.query("support_ticket_replies").withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId)).order("asc").take(100)
    return { ticket: { ...ticket, ownerId: ticket.ownerId ?? null }, replies }
  },
})

export const replyAsAdmin = mutation({
  args: { ticketId: v.id("support_tickets"), message: v.string(), status: statusValidator },
  returns: v.id("support_ticket_replies"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const ticket = await ctx.db.get("support_tickets", args.ticketId)
    if (!ticket) throw new Error("Tiket tidak ditemukan.")
    const message = cleanText(args.message, "Balasan", 4000)
    await ctx.db.patch("support_tickets", ticket._id, { status: args.status })
    const replyId = await ctx.db.insert("support_ticket_replies", { ticketId: ticket._id, sender: "admin", message, createdAt: Date.now() })
    if (ticket.ownerId) {
      await ctx.scheduler.runAfter(0, internal.bots.delivery.sendSupportTicketReplyNotice, { ownerId: ticket.ownerId, subject: ticket.subject, message })
    } else {
      await ctx.scheduler.runAfter(0, internal.emails.sendSupportTicketReplyEmail, { ticketId: ticket._id, replyId, name: ticket.name, email: ticket.contactEmail, subject: ticket.subject, message })
    }
    return replyId
  },
})
