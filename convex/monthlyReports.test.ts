import { test, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

type ReportSection = {
  property: { name: string; slug: string }
  period: string
  label: string
  current: {
    occupied: number
    vacant: number
    booked: number
    total: number
    occupancyRate: number
    cash: { monthlyRent: number; dp: number; settlement: number }
    overdue: Array<{ name: string; roomNumber: string; daysLate: number }>
    newTenants: Array<{ roomNumber: string; name: string; date: number }>
    movedOut: Array<{ roomNumber: string; name: string; date: number }>
  }
  previous: {
    occupied: number
    occupancyRate: number
    cash: { monthlyRent: number; dp: number; settlement: number }
  }
}

const rupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`
const safe = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?")

const buildReportText = (report: ReportSection, generatedAt: Date) => {
  const current = report.current
  const previous = report.previous
  const totalCash = current.cash.monthlyRent + current.cash.dp + current.cash.settlement
  const previousTotalCash = previous.cash.monthlyRent + previous.cash.dp + previous.cash.settlement
  const roomChange = current.occupied - previous.occupied
  const cashChange = totalCash - previousTotalCash
  const arrow = (value: number) => (value >= 0 ? `+${value}` : `${value}`)
  const lines = [
    "BotKos - Laporan Bulanan",
    safe(report.property.name),
    `Periode: ${report.label}`,
    "",
    "RINGKASAN OKUPANSI",
    "---------------------------------------------",
    `Kamar terisi         ${current.occupied} / ${current.total}   (${current.occupancyRate}%)`,
    `Kamar kosong         ${current.vacant} / ${current.total}   (${current.total ? Math.round((current.vacant / current.total) * 100) : 0}%)`,
    `Kamar booked (DP)    ${current.booked} / ${current.total}   (${current.total ? Math.round((current.booked / current.total) * 100) : 0}%)`,
    `Dibanding bulan lalu  ${roomChange >= 0 ? "UP" : "DOWN"} ${arrow(roomChange)} kamar terisi (${previous.occupancyRate}% -> ${current.occupancyRate}%)`,
    "",
    "RINGKASAN KAS",
    "---------------------------------------------",
    `Sewa bulanan          ${rupiah(current.cash.monthlyRent)}`,
    `DP booking baru       ${rupiah(current.cash.dp)}`,
    `Pelunasan (DP -> lunas) ${rupiah(current.cash.settlement)}`,
    "---------------------------------------------",
    `Total masuk bulan ini ${rupiah(totalCash)}`,
    `Dibanding bulan lalu  ${cashChange >= 0 ? "UP" : "DOWN"} ${rupiah(Math.abs(cashChange))}`,
    "",
    "TENANT MENUNGGAK",
    "---------------------------------------------",
  ]
  if (current.overdue.length === 0) lines.push("Tidak ada tenant yang menunggak bulan ini.")
  else {
    lines.push("Nama              Kamar   Telat")
    current.overdue.forEach((item) =>
      lines.push(`${safe(item.name).slice(0, 18).padEnd(18)} ${item.roomNumber.padEnd(7)} ${item.daysLate} hari`)
    )
  }
  lines.push("", "PERUBAHAN KAMAR", "---------------------------------------------", "Tenant baru masuk:")
  if (current.newTenants.length === 0) lines.push("  Tidak ada")
  else
    current.newTenants.forEach((item) =>
      lines.push(`  * Kamar ${item.roomNumber} - ${safe(item.name)} (mulai ${item.date} ${report.label.split(" ")[0]})`)
    )
  lines.push("", "Tenant keluar:")
  if (current.movedOut.length === 0) lines.push("  Tidak ada")
  else
    current.movedOut.forEach((item) =>
      lines.push(`  * Kamar ${item.roomNumber} - ${safe(item.name)} (pindah ${item.date} ${report.label.split(" ")[0]})`)
    )
  lines.push(
    "",
    "---------------------------------------------",
    `Laporan dibuat otomatis oleh BotKos pada ${generatedAt.toLocaleDateString("id-ID")}.`,
    `Detail lengkap: /dashboard/properties/${report.property.slug}`
  )
  return lines
}

const createPdf = (lines: string[]) => {
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 790 Td",
    ...lines.flatMap((line) => [`(${safe(line).replace(/[()\\]/g, "\\$&")}) Tj`, "0 -15 Td"]),
    "ET",
  ].join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

test("generates sample monthly PDF report and saves file locally for visual inspection", () => {
  const sampleReport: ReportSection = {
    property: { name: "Kos Aziza Eksklusif", slug: "kos-aziza" },
    period: "2026-09",
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

  const generatedAt = new Date("2026-10-03T01:00:00Z")
  const lines = buildReportText(sampleReport, generatedAt)

  expect(lines).toContain("BotKos - Laporan Bulanan")
  expect(lines).toContain("RINGKASAN OKUPANSI")
  expect(lines).toContain("RINGKASAN KAS")
  expect(lines).toContain("TENANT MENUNGGAK")
  expect(lines).toContain("PERUBAHAN KAMAR")

  const pdfBytes = createPdf(lines)
  expect(pdfBytes.length).toBeGreaterThan(500)

  // Verify PDF header
  const header = new TextDecoder().decode(pdfBytes.slice(0, 8))
  expect(header).toBe("%PDF-1.4")

  // Write out to docs/sample-laporan-bulanan.pdf for inspection
  const outPath = path.resolve(process.cwd(), "docs", "sample-laporan-bulanan.pdf")
  fs.writeFileSync(outPath, Buffer.from(pdfBytes))
  expect(fs.existsSync(outPath)).toBe(true)
})
