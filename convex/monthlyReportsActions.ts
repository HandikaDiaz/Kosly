"use node"

import { action, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { sendTelegramDocument } from "./bots/telegram"
import { sendWhatsAppDocument, uploadWhatsAppDocument } from "./bots/whatsapp"
import { propertyTabUrl } from "./lib/propertyTabs"

type BotLink = {
  channel: "telegram" | "whatsapp"
  chatId: string
  status: "active" | "inactive"
}

type SimulationTarget = {
  ownerId: Id<"owners">
  propertyId: Id<"properties">
  propertyName: string
  propertySlug: string
  defaultPeriod: string
} | null

type ReportSection = {
  property: { name: string; slug: string }
  period: string
  label: string
  current: { occupied: number; vacant: number; booked: number; total: number; occupancyRate: number; cash: { monthlyRent: number; dp: number; settlement: number }; overdue: Array<{ name: string; roomNumber: string; daysLate: number }>; newTenants: Array<{ roomNumber: string; name: string; date: number }>; movedOut: Array<{ roomNumber: string; name: string; date: number }> }
  previous: { occupied: number; occupancyRate: number; cash: { monthlyRent: number; dp: number; settlement: number } }
}

const rupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`
const safe = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?")

const buildReportText = (report: ReportSection, generatedAt: Date, propertyId: Id<"properties">) => {
  const current = report.current
  const previous = report.previous
  const totalCash = current.cash.monthlyRent + current.cash.dp + current.cash.settlement
  const previousTotalCash = previous.cash.monthlyRent + previous.cash.dp + previous.cash.settlement
  const roomChange = current.occupied - previous.occupied
  const cashChange = totalCash - previousTotalCash
  const arrow = (value: number) => value >= 0 ? `+${value}` : `${value}`
  const lines = [
    "BotKos - Laporan Bulanan", safe(report.property.name), `Periode: ${report.label}`, "",
    "RINGKASAN OKUPANSI", "---------------------------------------------",
    `Kamar terisi         ${current.occupied} / ${current.total}   (${current.occupancyRate}%)`,
    `Kamar kosong         ${current.vacant} / ${current.total}   (${current.total ? Math.round(current.vacant / current.total * 100) : 0}%)`,
    `Kamar booked (DP)    ${current.booked} / ${current.total}   (${current.total ? Math.round(current.booked / current.total * 100) : 0}%)`,
    `Dibanding bulan lalu  ${roomChange >= 0 ? "UP" : "DOWN"} ${arrow(roomChange)} kamar terisi (${previous.occupancyRate}% -> ${current.occupancyRate}%)`, "",
    "RINGKASAN KAS", "---------------------------------------------",
    `Sewa bulanan          ${rupiah(current.cash.monthlyRent)}`,
    `DP booking baru       ${rupiah(current.cash.dp)}`,
    `Pelunasan (DP -> lunas) ${rupiah(current.cash.settlement)}`,
    "---------------------------------------------",
    `Total masuk bulan ini ${rupiah(totalCash)}`,
    `Dibanding bulan lalu  ${cashChange >= 0 ? "UP" : "DOWN"} ${rupiah(Math.abs(cashChange))}`, "",
    "TENANT MENUNGGAK", "---------------------------------------------",
  ]
  if (current.overdue.length === 0) lines.push("Tidak ada tenant yang menunggak bulan ini.")
  else {
    lines.push("Nama              Kamar   Telat")
    current.overdue.forEach((item) => lines.push(`${safe(item.name).slice(0, 18).padEnd(18)} ${item.roomNumber.padEnd(7)} ${item.daysLate} hari`))
  }
  lines.push("", "PERUBAHAN KAMAR", "---------------------------------------------", "Tenant baru masuk:")
  if (current.newTenants.length === 0) lines.push("  Tidak ada")
  else current.newTenants.forEach((item) => lines.push(`  * Kamar ${item.roomNumber} - ${safe(item.name)} (mulai ${item.date} ${report.label.split(" ")[0]})`))
  lines.push("", "Tenant keluar:")
  if (current.movedOut.length === 0) lines.push("  Tidak ada")
  else current.movedOut.forEach((item) => lines.push(`  * Kamar ${item.roomNumber} - ${safe(item.name)} (pindah ${item.date} ${report.label.split(" ")[0]})`))
  lines.push("", "---------------------------------------------", `Laporan dibuat otomatis oleh BotKos pada ${generatedAt.toLocaleDateString("id-ID")}.`, `Detail lengkap: ${propertyTabUrl(String(propertyId), "summary")}`)
  return lines
}

const createPdf = (lines: string[]) => {
  const content = ["BT", "/F1 10 Tf", "50 790 Td", ...lines.flatMap((line) => [`(${safe(line).replace(/[()\\]/g, "\\$&")}) Tj`, "0 -15 Td"]), "ET"].join("\n")
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

export const generateAndDeliver = internalAction({
  args: { ownerId: v.id("owners"), propertyId: v.id("properties"), period: v.string() },
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(internal.monthlyReports.getReportData, args) as ReportSection | null
    if (!report) return { delivered: 0, saved: false }
    const generatedAt = new Date()
    const bytes = createPdf(buildReportText(report, generatedAt, args.propertyId))
    const fileName = `botkos-laporan-${report.property.slug}-${args.period}.pdf`
    const storageId = await ctx.storage.store(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }))
    await ctx.runMutation(internal.monthlyReports.saveReport, { ownerId: args.ownerId, propertyId: args.propertyId, period: args.period, storageId, fileName })
    const links = (await ctx.runQuery(internal.notifications.getOwnerBotLinks, { ownerId: args.ownerId })) as BotLink[]
    const caption = `BotKos - Laporan ${report.property.name} (${report.label})`
    const env = process.env as Record<string, string | undefined>
    let delivered = 0
    for (const link of links.filter((item: BotLink) => item.status === "active")) {
      try {
        if (link.channel === "telegram" && env.TELEGRAM_BOT_TOKEN) {
          await sendTelegramDocument(env.TELEGRAM_BOT_TOKEN, link.chatId, bytes, fileName, caption)
          delivered += 1
        } else if (link.channel === "whatsapp" && env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
          const mediaId = await uploadWhatsAppDocument(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID, bytes)
          await sendWhatsAppDocument(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID, link.chatId, mediaId, fileName, caption)
          delivered += 1
        }
      } catch (error) {
        console.error("Gagal mengirim laporan bulanan:", error)
      }
    }
    return { delivered, saved: true, fileName }
  },
})

export const simulateMonthlyReport = action({
  args: {
    propertyId: v.optional(v.id("properties")),
    period: v.optional(v.string()),
    useSampleDataIfEmpty: v.optional(v.boolean()),
    sendToBot: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    fileName: string
    storageId: string
    pdfUrl: string | null
    isSampleData: boolean
    deliveredToBot: number
    propertyName: string
    period: string
    periodLabel: string
    reportText: string
  }> => {
    const target = (await ctx.runQuery(internal.monthlyReports.getSimulationContext, { propertyId: args.propertyId })) as SimulationTarget
    const period = args.period ?? (target?.defaultPeriod ?? "2026-09")

    let report: ReportSection | null = null
    if (target) {
      report = (await ctx.runQuery(internal.monthlyReports.getReportData, {
        ownerId: target.ownerId,
        propertyId: target.propertyId,
        period,
      })) as ReportSection | null
    }

    const shouldUseSample = args.useSampleDataIfEmpty !== false && (!report || report.current.total === 0)

    if (shouldUseSample) {
      report = {
        property: {
          name: target?.propertyName ?? "Kos Aziza Eksklusif",
          slug: target?.propertySlug ?? "kos-aziza",
        },
        period,
        label: "September 2026",
        current: {
          occupied: 8,
          vacant: 1,
          booked: 1,
          total: 10,
          occupancyRate: 80,
          cash: {
            monthlyRent: 12_000_000,
            dp: 900_000,
            settlement: 1_500_000,
          },
          overdue: [
            { name: "Budi Santoso", roomNumber: "104", daysLate: 3 },
          ],
          newTenants: [
            { roomNumber: "201", name: "Siti Rahma", date: 1 },
          ],
          movedOut: [
            { roomNumber: "102", name: "Andi Pratama", date: 28 },
          ],
        },
        previous: {
          occupied: 7,
          occupancyRate: 70,
          cash: {
            monthlyRent: 10_500_000,
            dp: 450_000,
            settlement: 0,
          },
        },
      }
    }

    if (!report) {
      throw new Error("Gagal menyusun data laporan bulanan.")
    }

    const generatedAt = new Date()
    const textLines = buildReportText(report, generatedAt, args.propertyId ?? target?.propertyId ?? "unknown" as Id<"properties">)
    const bytes = createPdf(textLines)
    const fileName = `botkos-laporan-${report.property.slug}-${period}.pdf`
    const storageId = await ctx.storage.store(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }))
    const pdfUrl = await ctx.storage.getUrl(storageId)

    if (target) {
      await ctx.runMutation(internal.monthlyReports.saveReport, {
        ownerId: target.ownerId,
        propertyId: target.propertyId,
        period,
        storageId,
        fileName,
      })
    }

    let delivered = 0
    if (target && args.sendToBot !== false) {
      const links = (await ctx.runQuery(internal.notifications.getOwnerBotLinks, { ownerId: target.ownerId })) as BotLink[]
      const caption = `[SIMULASI] BotKos - Laporan ${report.property.name} (${report.label})`
      const env = process.env as Record<string, string | undefined>
      for (const link of links.filter((item: BotLink) => item.status === "active")) {
        try {
          if (link.channel === "telegram" && env.TELEGRAM_BOT_TOKEN) {
            await sendTelegramDocument(env.TELEGRAM_BOT_TOKEN, link.chatId, bytes, fileName, caption)
            delivered += 1
          } else if (link.channel === "whatsapp" && env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
            const mediaId = await uploadWhatsAppDocument(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID, bytes)
            await sendWhatsAppDocument(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID, link.chatId, mediaId, fileName, caption)
            delivered += 1
          }
        } catch (error) {
          console.error("Gagal mengirim simulasi laporan ke bot:", error)
        }
      }
    }

    return {
      success: true,
      fileName,
      storageId,
      pdfUrl,
      isSampleData: shouldUseSample,
      deliveredToBot: delivered,
      propertyName: report.property.name,
      period: report.period,
      periodLabel: report.label,
      reportText: textLines.join("\n"),
    }
  },
})
