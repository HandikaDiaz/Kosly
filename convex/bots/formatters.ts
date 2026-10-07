import type { BotChannel, PaymentReviewSummary } from "./types"

export type PropertyStatusData = {
  id: string
  name: string
  activeTenantsCount: number
  pendingCount: number
  vacantCount: number
  vacantRooms: Array<{ roomNumber: string; monthlyRent: number }>
  totalRooms: number
}

export type StatusOverviewData = {
  properties: PropertyStatusData[]
}

export type UnpaidItemData = {
  tenantName: string
  propertyName: string
  roomNumber: string
  period: string
  amount: number
  dueDate: number
}

export type VacantItemData = {
  propertyName: string
  roomNumber: string
  monthlyRent: number
}

const escapeHtml = (str: string) =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const pickFromPool = (pool: string[], seed: number): string => {
  const index = Math.abs(Math.floor(seed / 1000)) % pool.length
  return pool[index]
}

const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`

/**
 * Builds contextual, premium status message for single or multi-property owners.
 */
export const buildStatusMessage = (
  data: StatusOverviewData,
  channel: BotChannel = "whatsapp",
  seed = Date.now()
): string => {
  const { properties } = data

  if (properties.length === 0) {
    const isTg = channel === "telegram"
    return isTg
      ? "🔑 <b>BotKos Status</b>\n\nBelum ada properti terdaftar pada akun Anda."
      : "🔑 *BotKos Status*\n\nBelum ada properti terdaftar pada akun Anda."
  }

  const isTg = channel === "telegram"
  const b = (text: string) => (isTg ? `<b>${escapeHtml(text)}</b>` : `*${text}*`)

  // --- SINGLE PROPERTY ---
  if (properties.length === 1) {
    const p = properties[0]
    const propName = escapeHtml(p.name)

    // Condition 1: Has pending items (payments or pending tenants)
    if (p.pendingCount > 0) {
      const openings = [
        `🔑 Ada yang perlu Anda tinjau di ${propName}`,
        `🔑 Satu hal menunggu keputusan Anda di ${propName}`,
        `🔑 ${propName} butuh sedikit perhatian Anda hari ini`,
      ]
      const header = pickFromPool(openings, seed)

      const pendingText = `${b(`${p.pendingCount} item`)} (pembayaran/tenant) sedang menunggu verifikasi Anda.`
      const restText =
        p.vacantCount > 0
          ? `Saat ini terdapat ${b(`${p.activeTenantsCount} tenant aktif`)} dan ${b(`${p.vacantCount} kamar kosong`)}.`
          : `Selebihnya berjalan lancar — ${b(`${p.activeTenantsCount} tenant aktif`)} menghuni properti, dan tidak ada kamar kosong saat ini.`

      return `${header}\n\n${pendingText}\n${restText}`
    }

    // Condition 2: Has vacant rooms (0 pending)
    if (p.vacantCount > 0) {
      const openings = [
        `🔑 ${propName} — ${p.vacantCount} kamar sedang kosong`,
        `🔑 Ada ${p.vacantCount} kamar kosong yang siap disewakan di ${propName}`,
        `🔑 Peluang pendapatan: ${p.vacantCount} kamar kosong di ${propName}`,
      ]
      const header = pickFromPool(openings, seed)

      const bodyText = `Ini kesempatan untuk segera dicarikan penyewa baru.\nSaat ini ${b(`${p.activeTenantsCount} tenant aktif`)} menghuni properti, tidak ada pembayaran yang tertunda verifikasi.`

      return `${header}\n\n${bodyText}`
    }

    // Condition 3: All normal (0 pending, 0 vacant)
    const openings = [
      `🔑 ${propName} dalam kondisi baik`,
      `🔑 Tidak ada yang perlu dikhawatirkan di ${propName} hari ini`,
      `🔑 ${propName} berjalan mulus — semua kamar terisi`,
    ]
    const header = pickFromPool(openings, seed)

    const bodyText = `Seluruh kamar terisi, ${b(`${p.activeTenantsCount} tenant aktif`)}, dan tidak ada yang perlu ditindaklanjuti hari ini. Semua berjalan sebagaimana mestinya.`

    return `${header}\n\n${bodyText}`
  }

  // --- MULTI PROPERTY ---
  // Sort properties: 1. pending > 0, 2. vacant > 0, 3. all normal
  const sorted = [...properties].sort((a, bProp) => {
    const scoreA = a.pendingCount > 0 ? 3 : a.vacantCount > 0 ? 2 : 1
    const scoreB = bProp.pendingCount > 0 ? 3 : bProp.vacantCount > 0 ? 2 : 1
    return scoreB - scoreA
  })

  const headerPool = [
    `🔑 Ringkasan Properti Anda (${properties.length} Kos)`,
    `🔑 Perkembangan ${properties.length} Properti Kos Anda Hari Ini`,
    `🔑 Laporan Kondisi Properti (${properties.length} Kos)`,
  ]
  const topHeader = pickFromPool(headerPool, seed)

  const propBlocks = sorted.map((p) => {
    const nameStr = b(p.name)
    if (p.pendingCount > 0) {
      const pendingLine = `• ${b(`${p.pendingCount} item`)} menunggu verifikasi`
      const tenantLine = `• ${b(`${p.activeTenantsCount} tenant aktif`)}${
        p.vacantCount > 0 ? `, ${b(`${p.vacantCount} kamar kosong`)}` : ", 0 kamar kosong"
      }`
      return `${nameStr} — Perhatian Dibutuhkan\n${pendingLine}\n${tenantLine}`
    }
    if (p.vacantCount > 0) {
      const vacantLine = `• ${b(`${p.vacantCount} kamar`)} belum berpenghuni`
      const tenantLine = `• ${b(`${p.activeTenantsCount} tenant aktif`)}; 0 verifikasi tertunda`
      return `${nameStr} — ${p.vacantCount} Kamar Kosong\n${vacantLine}\n${tenantLine}`
    }
    return `${nameStr} — Aman\n• Seluruh kamar terisi (${b(`${p.activeTenantsCount} tenant aktif`)})\n• Tidak ada antrean verifikasi`
  })

  return `${topHeader}\n\n${propBlocks.join("\n\n")}`
}

/**
 * Builds contextual message for unpaid rent charges (/belum_bayar).
 */
export const buildUnpaidMessage = (
  items: UnpaidItemData[],
  channel: BotChannel = "whatsapp",
  seed = Date.now()
): string => {
  const isTg = channel === "telegram"
  const b = (text: string) => (isTg ? `<b>${escapeHtml(text)}</b>` : `*${text}*`)

  if (items.length === 0) {
    const positivePool = [
      "✨ Tidak ada tenant yang menunggak saat ini — kerja bagus!",
      "✨ Seluruh tagihan sewa telah lunas tepat waktu. Semua lancar!",
      "✨ Catatan keuangan bersih. Belum ada pembayaran yang tertunda.",
    ]
    return pickFromPool(positivePool, seed)
  }

  const headerPool = [
    `⚠️ ${b(`${items.length} Tagihan Perlu Ditindaklanjuti`)}`,
    `⚠️ Ada ${b(`${items.length} tagihan sewa`)} yang telah melewati jatuh tempo`,
  ]
  const header = pickFromPool(headerPool, seed)

  const rows = items.map((item) => {
    const tenantStr = b(item.tenantName)
    const propRoom = escapeHtml(item.propertyName) + (item.roomNumber ? ` - K.${escapeHtml(item.roomNumber)}` : "")
    const amountStr = formatCurrency(item.amount)
    const dateStr = new Date(item.dueDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    return `• ${tenantStr} (${propRoom})\n  Periode ${escapeHtml(item.period)} · ${amountStr} (Jatuh tempo: ${dateStr})`
  })

  return `${header}\n\n${rows.join("\n\n")}\n\nGunakan fitur pengingat atau hubungi tenant secara langsung.`
}

/**
 * Builds contextual message for vacant rooms (/kamar_kosong).
 */
export const buildVacantMessage = (
  items: VacantItemData[],
  channel: BotChannel = "whatsapp",
  seed = Date.now()
): string => {
  const isTg = channel === "telegram"
  const b = (text: string) => (isTg ? `<b>${escapeHtml(text)}</b>` : `*${text}*`)

  if (items.length === 0) {
    const appreciativePool = [
      "🏠 Seluruh kamar di properti Anda terisi penuh saat ini!",
      "🏠 Okupansi 100%! Tidak ada kamar kosong yang tersedia saat ini.",
      "🏠 Semua kamar terhuni dengan baik. Tidak ada kekosongan.",
    ]
    return pickFromPool(appreciativePool, seed)
  }

  const headerPool = [
    `🏠 ${b(`${items.length} Kamar Kosong Siap Disewakan`)}`,
    `🏠 Ada ${b(`${items.length} kamar kosong`)} yang siap menerima penyewa`,
  ]
  const header = pickFromPool(headerPool, seed)

  const rows = items.map((item) => {
    const propStr = b(item.propertyName)
    const priceStr = formatCurrency(item.monthlyRent)
    return `• ${propStr} — Kamar ${escapeHtml(item.roomNumber)} (${priceStr}/bulan)`
  })

  return `${header}\n\n${rows.join("\n\n")}\n\nSiapkan promosi untuk segera mengisi kekosongan ini.`
}

/**
 * Builds payment review message for Telegram or WhatsApp.
 */
export const buildReviewMessage = (
  summary: PaymentReviewSummary,
  channel: BotChannel = "whatsapp"
): { text: string; parseMode?: "HTML" } => {
  if (channel === "telegram") {
    const text = `📋 <b>Pembayaran Baru Perlu Diverifikasi</b>\n\n<b>${escapeHtml(summary.propertyName)}</b> · Kamar <b>${escapeHtml(summary.roomNumber)}</b>\n<b>${escapeHtml(summary.tenantName)}</b> · ${escapeHtml(summary.amount)}\nRef: <code>${escapeHtml(summary.reference)}</code>`
    return { text, parseMode: "HTML" }
  }

  const text = `📋 *Pembayaran Baru Perlu Diverifikasi*\n\n*${summary.propertyName}* · Kamar *${summary.roomNumber}*\n*${summary.tenantName}* · ${summary.amount}\nRef: *${summary.reference}*\n\nBalas:\n*KONFIRMASI ${summary.reference}*\natau\n*TOLAK ${summary.reference}* alasan`
  return { text }
}
