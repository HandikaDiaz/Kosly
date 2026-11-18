import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

export type MonthlyReportPdfInput = {
  property: { name: string; slug: string; address?: string }
  period: string
  label: string
  current: {
    occupied: number
    vacant: number
    booked: number
    total: number
    occupancyRate: number
    expectedRent?: number
    cash: { monthlyRent: number; dp: number; settlement: number }
    overdue: Array<{ name: string; roomNumber: string; daysLate: number; amount?: number }>
    newTenants: Array<{ roomNumber: string; name: string; date: number }>
    movedOut: Array<{ roomNumber: string; name: string; date: number }>
    vacating?: Array<{ roomNumber: string; name: string; moveOutDate: number | null }>
  }
  previous: {
    occupied: number
    occupancyRate: number
    cash: { monthlyRent: number; dp: number; settlement: number }
  }
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN_X = 42
const CONTENT_W = PAGE_W - MARGIN_X * 2
const BOTTOM_LIMIT = 56

const COLOR = {
  charcoal: rgb(0.098, 0.082, 0.071),
  gold: rgb(0.698, 0.51, 0.212),
  goldPale: rgb(0.984, 0.961, 0.914),
  ink: rgb(0.12, 0.1, 0.09),
  muted: rgb(0.42, 0.39, 0.36),
  line: rgb(0.87, 0.85, 0.81),
  zebra: rgb(0.98, 0.975, 0.965),
  white: rgb(1, 1, 1),
  emerald: rgb(0.06, 0.45, 0.28),
  warn: rgb(0.75, 0.2, 0.18),
  amber: rgb(0.65, 0.4, 0.05),
}

const safe = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const words = safe(text).split(" ").filter(Boolean)
  if (words.length === 0) return [""]
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
    }
  }
  lines.push(current)
  return lines
}

/**
 * Generates a formatted A4 PDF monthly report with a formal letterhead (kop surat),
 * KPI summary cards, structured tables, and multi-page pagination.
 */
export async function createMonthlyReportPdf(
  report: MonthlyReportPdfInput,
  generatedAt: Date,
  logoBytes?: Uint8Array | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const logoImage = logoBytes ? await doc.embedJpg(logoBytes).catch(() => null) : null

  const pages: PDFPage[] = []
  let page = doc.addPage([PAGE_W, PAGE_H])
  pages.push(page)
  let y = PAGE_H - 36

  const addNewPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H])
    pages.push(page)
    page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: COLOR.gold })
    page.drawText(safe(`${report.property.name} — Laporan ${report.label}`), {
      x: MARGIN_X,
      y: PAGE_H - 28,
      size: 8.5,
      font: fontBold,
      color: COLOR.muted,
    })
    page.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 36 },
      end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 36 },
      thickness: 0.75,
      color: COLOR.line,
    })
    y = PAGE_H - 54
  }

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM_LIMIT) addNewPage()
  }

  // ── Top Gold Accent Bar ──
  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: COLOR.gold })

  // ── Kop Surat (Formal Letterhead) ──
  const headerTop = y
  if (logoImage) {
    page.drawImage(logoImage, { x: MARGIN_X, y: headerTop - 42, width: 42, height: 42 })
  } else {
    page.drawRectangle({ x: MARGIN_X, y: headerTop - 42, width: 42, height: 42, color: COLOR.charcoal })
    page.drawText("BK", { x: MARGIN_X + 11, y: headerTop - 27, size: 14, font: fontBold, color: COLOR.gold })
  }

  page.drawText("BotKos", {
    x: MARGIN_X + 52,
    y: headerTop - 16,
    size: 15,
    font: fontBold,
    color: COLOR.charcoal,
  })
  page.drawText("LAPORAN OPERASIONAL BULANAN", {
    x: MARGIN_X + 52,
    y: headerTop - 30,
    size: 8,
    font: fontBold,
    color: COLOR.gold,
  })
  page.drawText("Manajemen Kamar & Kas Kos", {
    x: MARGIN_X + 52,
    y: headerTop - 41,
    size: 8,
    font: fontRegular,
    color: COLOR.muted,
  })

  // Right side of Kop Surat: Property Info
  const rightMaxW = 240
  const propName = safe(report.property.name)
  const propNameW = fontBold.widthOfTextAtSize(propName, 12)
  page.drawText(propName, {
    x: PAGE_W - MARGIN_X - Math.min(propNameW, rightMaxW),
    y: headerTop - 13,
    size: 12,
    font: fontBold,
    color: COLOR.charcoal,
  })

  let rightY = headerTop - 26
  if (report.property.address) {
    const addrLines = wrapText(report.property.address, fontRegular, 8, rightMaxW).slice(0, 2)
    for (const line of addrLines) {
      const w = fontRegular.widthOfTextAtSize(line, 8)
      page.drawText(line, {
        x: PAGE_W - MARGIN_X - w,
        y: rightY,
        size: 8,
        font: fontRegular,
        color: COLOR.muted,
      })
      rightY -= 10
    }
  }
  const periodLine = safe(`Periode: ${report.label}  |  Dicetak: ${generatedAt.toLocaleDateString("id-ID")}`)
  const periodW = fontRegular.widthOfTextAtSize(periodLine, 8)
  page.drawText(periodLine, {
    x: PAGE_W - MARGIN_X - periodW,
    y: Math.min(rightY - 2, headerTop - 42),
    size: 8,
    font: fontRegular,
    color: COLOR.ink,
  })

  // Double Kop Surat Divider
  const dividerY = headerTop - 56
  page.drawLine({
    start: { x: MARGIN_X, y: dividerY },
    end: { x: PAGE_W - MARGIN_X, y: dividerY },
    thickness: 1.75,
    color: COLOR.charcoal,
  })
  page.drawLine({
    start: { x: MARGIN_X, y: dividerY - 3 },
    end: { x: PAGE_W - MARGIN_X, y: dividerY - 3 },
    thickness: 0.75,
    color: COLOR.gold,
  })
  y = dividerY - 22

  // ── KPI Cards Row ──
  const current = report.current
  const previous = report.previous
  const totalCash = current.cash.monthlyRent + current.cash.dp + current.cash.settlement
  const expectedRent = current.expectedRent ?? totalCash
  const rentGap = Math.max(0, expectedRent - totalCash)
  const roomChange = current.occupied - previous.occupied
  const cardGap = 10
  const cardW = (CONTENT_W - cardGap * 2) / 3
  const cardH = 64

  const cards = [
    {
      bg: COLOR.charcoal,
      border: COLOR.gold,
      labelColor: rgb(0.75, 0.72, 0.68),
      valueColor: rgb(0.957, 0.816, 0.518),
      subColor: rgb(0.82, 0.8, 0.76),
      label: "OKUPANSI KAMAR",
      value: `${current.occupied} / ${current.total} (${current.occupancyRate}%)`,
      sub: `${roomChange >= 0 ? "+" : ""}${roomChange} kamar vs bulan lalu`,
    },
    {
      bg: COLOR.white,
      border: COLOR.line,
      labelColor: COLOR.muted,
      valueColor: COLOR.charcoal,
      subColor: COLOR.muted,
      label: "TARGET SEWA BULAN INI",
      value: rupiah(expectedRent),
      sub: "Seharusnya masuk bulan ini",
    },
    {
      bg: COLOR.goldPale,
      border: COLOR.gold,
      labelColor: COLOR.amber,
      valueColor: COLOR.emerald,
      subColor: rentGap > 0 ? COLOR.warn : COLOR.emerald,
      label: "TOTAL KAS MASUK",
      value: rupiah(totalCash),
      sub: rentGap > 0 ? `Belum masuk: ${rupiah(rentGap)}` : "Sesuai target sewa",
    },
  ]

  cards.forEach((card, index) => {
    const cx = MARGIN_X + index * (cardW + cardGap)
    page.drawRectangle({
      x: cx,
      y: y - cardH,
      width: cardW,
      height: cardH,
      color: card.bg,
      borderColor: card.border,
      borderWidth: 1,
    })
    page.drawText(card.label, { x: cx + 10, y: y - 15, size: 7.5, font: fontBold, color: card.labelColor })
    page.drawText(safe(card.value), { x: cx + 10, y: y - 34, size: 11.5, font: fontBold, color: card.valueColor })
    page.drawText(safe(card.sub), { x: cx + 10, y: y - 52, size: 7.5, font: fontRegular, color: card.subColor })
  })

  y -= cardH + 20

  const drawSectionTitle = (title: string) => {
    ensureSpace(36)
    page.drawRectangle({ x: MARGIN_X, y: y - 14, width: 3.5, height: 14, color: COLOR.gold })
    page.drawText(safe(title), {
      x: MARGIN_X + 10,
      y: y - 11,
      size: 10.5,
      font: fontBold,
      color: COLOR.charcoal,
    })
    y -= 22
  }

  const drawKeyValueTable = (rows: Array<{ label: string; value: string; bold?: boolean; valueColor?: ReturnType<typeof rgb> }>) => {
    const rowH = 21
    rows.forEach((row, index) => {
      ensureSpace(rowH + 4)
      page.drawRectangle({
        x: MARGIN_X,
        y: y - rowH,
        width: CONTENT_W,
        height: rowH,
        color: row.bold ? COLOR.goldPale : index % 2 === 0 ? COLOR.zebra : COLOR.white,
        borderColor: COLOR.line,
        borderWidth: 0.5,
      })
      const textFont = row.bold ? fontBold : fontRegular
      page.drawText(safe(row.label), {
        x: MARGIN_X + 10,
        y: y - 14,
        size: 9,
        font: textFont,
        color: COLOR.ink,
      })
      const valText = safe(row.value)
      const valW = textFont.widthOfTextAtSize(valText, 9)
      page.drawText(valText, {
        x: PAGE_W - MARGIN_X - 10 - valW,
        y: y - 14,
        size: 9,
        font: textFont,
        color: row.valueColor ?? COLOR.ink,
      })
      y -= rowH
    })
    y -= 14
  }

  // ── 1. Ringkasan Okupansi ──
  drawSectionTitle("1. Ringkasan Okupansi Kamar")
  drawKeyValueTable([
    { label: "Kamar terisi", value: `${current.occupied} dari ${current.total} kamar (${current.occupancyRate}%)` },
    { label: "Kamar kosong (siap huni)", value: `${current.vacant} kamar` },
    { label: "Kamar booked (DP)", value: `${current.booked} kamar` },
    { label: "Perbandingan bulan lalu", value: `${previous.occupancyRate}% -> ${current.occupancyRate}% (${roomChange >= 0 ? "+" : ""}${roomChange} kamar)` },
  ])

  // ── 2. Ringkasan Kas & Target Sewa ──
  const previousTotalCash = previous.cash.monthlyRent + previous.cash.dp + previous.cash.settlement
  const cashChange = totalCash - previousTotalCash
  drawSectionTitle("2. Ringkasan Kas & Target Sewa")
  drawKeyValueTable([
    { label: "Target sewa seharusnya masuk bulan ini", value: rupiah(expectedRent), bold: true },
    { label: "Sewa bulanan terkonfirmasi", value: rupiah(current.cash.monthlyRent) },
    { label: "DP booking baru", value: rupiah(current.cash.dp) },
    { label: "Pelunasan (DP -> lunas)", value: rupiah(current.cash.settlement) },
    { label: "Total kas masuk bulan ini", value: rupiah(totalCash), bold: true, valueColor: COLOR.emerald },
    {
      label: "Selisih belum masuk vs target",
      value: rentGap > 0 ? rupiah(rentGap) : "Rp 0 (Lunas)",
      valueColor: rentGap > 0 ? COLOR.warn : COLOR.emerald,
    },
    { label: "Perbandingan kas vs bulan lalu", value: `${cashChange >= 0 ? "+" : "-"}${rupiah(Math.abs(cashChange))}` },
  ])

  // ── 3. Penghuni Menunggak / Belum Bayar ──
  drawSectionTitle("3. Penghuni Menunggak / Belum Bayar")
  if (current.overdue.length === 0) {
    ensureSpace(26)
    page.drawRectangle({ x: MARGIN_X, y: y - 22, width: CONTENT_W, height: 22, color: COLOR.zebra, borderColor: COLOR.line, borderWidth: 0.5 })
    page.drawText("Tidak ada penghuni yang menunggak pada periode ini.", { x: MARGIN_X + 10, y: y - 14, size: 9, font: fontRegular, color: COLOR.emerald })
    y -= 36
  } else {
    const colX = [MARGIN_X + 10, MARGIN_X + 210, MARGIN_X + 290, MARGIN_X + 390]
    ensureSpace(24)
    page.drawRectangle({ x: MARGIN_X, y: y - 20, width: CONTENT_W, height: 20, color: COLOR.charcoal })
    page.drawText("Nama Penghuni", { x: colX[0], y: y - 13, size: 8.5, font: fontBold, color: COLOR.white })
    page.drawText("Kamar", { x: colX[1], y: y - 13, size: 8.5, font: fontBold, color: COLOR.white })
    page.drawText("Keterlambatan", { x: colX[2], y: y - 13, size: 8.5, font: fontBold, color: COLOR.white })
    page.drawText("Nominal", { x: colX[3], y: y - 13, size: 8.5, font: fontBold, color: COLOR.white })
    y -= 20

    current.overdue.forEach((item, index) => {
      ensureSpace(22)
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 20,
        width: CONTENT_W,
        height: 20,
        color: index % 2 === 0 ? COLOR.zebra : COLOR.white,
        borderColor: COLOR.line,
        borderWidth: 0.5,
      })
      page.drawText(safe(item.name).slice(0, 32), { x: colX[0], y: y - 13, size: 8.5, font: fontRegular, color: COLOR.ink })
      page.drawText(safe(item.roomNumber), { x: colX[1], y: y - 13, size: 8.5, font: fontRegular, color: COLOR.ink })
      page.drawText(`${item.daysLate} hari`, { x: colX[2], y: y - 13, size: 8.5, font: fontBold, color: COLOR.warn })
      page.drawText(item.amount ? rupiah(item.amount) : "-", { x: colX[3], y: y - 13, size: 8.5, font: fontRegular, color: COLOR.ink })
      y -= 20
    })
    y -= 14
  }

  // ── 4. Kamar Akan Kosong & Perubahan Penghuni ──
  drawSectionTitle("4. Kamar Akan Kosong & Perubahan Penghuni")
  const monthLabel = report.label.split(" ")[0] ?? ""
  const vacating = current.vacating ?? []
  const changeRows: Array<{ label: string; value: string }> = [
    ...vacating.map((item) => ({
      label: `Akan kosong: Kamar ${item.roomNumber} (${item.name})`,
      value: item.moveOutDate ? `Rencana keluar ${new Date(item.moveOutDate).toLocaleDateString("id-ID")}` : "Akan pindah",
    })),
    ...current.newTenants.map((item) => ({
      label: `Masuk baru: Kamar ${item.roomNumber} (${item.name})`,
      value: `Mulai ${item.date} ${monthLabel}`,
    })),
    ...current.movedOut.map((item) => ({
      label: `Sudah keluar: Kamar ${item.roomNumber} (${item.name})`,
      value: `Pindah ${item.date} ${monthLabel}`,
    })),
  ]

  if (changeRows.length === 0) {
    ensureSpace(26)
    page.drawRectangle({ x: MARGIN_X, y: y - 22, width: CONTENT_W, height: 22, color: COLOR.zebra, borderColor: COLOR.line, borderWidth: 0.5 })
    page.drawText("Tidak ada perubahan penghuni atau rencana pindah pada periode ini.", { x: MARGIN_X + 10, y: y - 14, size: 9, font: fontRegular, color: COLOR.muted })
    y -= 30
  } else {
    drawKeyValueTable(changeRows)
  }

  // ── Footer on all pages ──
  const totalPages = pages.length
  pages.forEach((p, idx) => {
    p.drawLine({
      start: { x: MARGIN_X, y: 38 },
      end: { x: PAGE_W - MARGIN_X, y: 38 },
      thickness: 0.5,
      color: COLOR.line,
    })
    p.drawText("Dibuat otomatis oleh BotKos · botkos.online", {
      x: MARGIN_X,
      y: 25,
      size: 7.5,
      font: fontRegular,
      color: COLOR.muted,
    })
    const pageLabel = `Halaman ${idx + 1} dari ${totalPages}`
    const pw = fontRegular.widthOfTextAtSize(pageLabel, 7.5)
    p.drawText(pageLabel, {
      x: PAGE_W - MARGIN_X - pw,
      y: 25,
      size: 7.5,
      font: fontRegular,
      color: COLOR.muted,
    })
  })

  return await doc.save()
}
