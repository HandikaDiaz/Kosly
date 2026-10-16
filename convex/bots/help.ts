import type { BotChannel } from "./types"

export const BOTKOS_ABOUT =
  "BotKos adalah asisten pengelolaan kos untuk membantu owner memantau kamar, tenant, pembayaran, langganan, dan laporan langsung dari chat."

const TELEGRAM_COMMANDS = [
  ["/help", "Tampilkan daftar command BotKos."],
  ["/chatid", "Tampilkan Chat ID Telegram Anda."],
  ["/status", "Lihat ringkasan properti, kamar, dan tenant."],
  ["/belum_bayar", "Lihat tenant dengan tagihan yang belum dibayar."],
  ["/kamar_kosong", "Lihat kamar yang tersedia untuk disewakan."],
  ["/langganan", "Lihat tier dan status langganan saat ini."],
  ["/upgrade", "Lihat pilihan upgrade tier dan harga."],
  ["/tambahkamar", "Tambah kamar dengan wizard chat, khusus Growth dan Pro."],
  ["/editkamar 12 harga 1600000", "Ubah harga kamar, khusus Growth dan Pro."],
  ["/editkamar 12 status kosong", "Ubah status kamar, khusus Growth dan Pro."],
  ["/laporan", "Buat laporan bulanan PDF, khusus Growth dan Pro."],
  ["KONFIRMASI KSL-...", "Konfirmasi pembayaran tenant."],
  ["TOLAK KSL-... alasan", "Tolak pembayaran dengan alasan."],
  ["BATAL", "Batalkan proses wizard atau upgrade yang sedang berjalan."],
  ["/pending", "Khusus admin: lihat antrean verifikasi dan billing."],
  ["/ringkasan", "Khusus admin: lihat ringkasan subscription."],
  ["/approve ID", "Khusus admin: setujui antrean berdasarkan ID."],
  ["/reject ID", "Khusus admin: tolak antrean berdasarkan ID."],
] as const

const WHATSAPP_COMMANDS = TELEGRAM_COMMANDS.map(([command, description]) => [
  command.replace(/^\//, "").replace(/^KONFIRMASI/, "KONFIRMASI").replace(/^TOLAK/, "TOLAK"),
  description,
] as const)

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export const buildHelpMessage = (channel: BotChannel, chatId?: string) => {
  const isTelegram = channel === "telegram"
  const commands = isTelegram ? TELEGRAM_COMMANDS : WHATSAPP_COMMANDS
  const lines = commands.map(([command, description]) =>
    isTelegram
      ? `<code>${escapeHtml(command)}</code> - ${escapeHtml(description)}`
      : `*${command}* - ${description}`
  )
  const about = isTelegram ? `<b>About BotKos</b>\n${escapeHtml(BOTKOS_ABOUT)}` : `*About BotKos*\n${BOTKOS_ABOUT}`
  const title = isTelegram ? "<b>Daftar command BotKos</b>" : "*Daftar command BotKos*"
  const footer = isTelegram
    ? "\n\nKetik <code>/chatid</code> jika Anda lupa Chat ID Telegram."
    : "\n\nWhatsApp tidak menggunakan tanda /. Ketik *help* kapan saja untuk melihat daftar ini."
  const body = lines.join("\n")
  return `${about}\n\n${title}\n\n${body}${footer}${chatId && isTelegram ? `\n\nChat ID Anda: <code>${escapeHtml(chatId)}</code>` : ""}`
}

export const buildWelcomeMessage = (channel: BotChannel) => {
  const greeting = channel === "telegram" ? "👋 Selamat datang di BotKos!" : "👋 Halo, selamat datang di BotKos!"
  return `${greeting}\n\n${buildHelpMessage(channel)}`
}

export const buildUnknownCommandMessage = (channel: BotChannel) =>
  channel === "telegram"
    ? "⚠️ Command tersebut belum tersedia. Ketik <code>/help</code> untuk melihat daftar command yang bisa digunakan."
    : "⚠️ Pesan atau command tersebut belum tersedia. Ketik *help* untuk melihat daftar command yang bisa digunakan."
