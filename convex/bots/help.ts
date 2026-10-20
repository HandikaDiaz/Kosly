import type { BotChannel } from "./types"
import { OWNER_COMMANDS } from "./commands"

export const BOTKOS_ABOUT = "Asisten pengelolaan kos untuk memantau kamar, tenant, pembayaran, langganan, dan laporan langsung dari chat."
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const command = (_channel: BotChannel, value: string) => `/${value}`
const bold = (channel: BotChannel, value: string) => channel === "telegram" ? `<b>${escapeHtml(value)}</b>` : `*${value}*`
const code = (channel: BotChannel, value: string) => channel === "telegram" ? `<code>${escapeHtml(value)}</code>` : `\`${value}\``

export const buildHelpMessage = (channel: BotChannel, chatId?: string) => {
  const lines = [
    bold(channel, "Command Owner"),
    ...OWNER_COMMANDS.map(({ command: name, description }) => `${code(channel, command(channel, name))} — ${description}`),
    "",
    bold(channel, "Pembayaran Tenant"),
    `${code(channel, "KONFIRMASI [REFERENSI]")} — Konfirmasi pembayaran`,
    `${code(channel, "TOLAK [REFERENSI] [ALASAN]")} — Tolak pembayaran`,
    `${code(channel, "BATAL")} — Batalkan proses yang berjalan`,
    ...(channel === "telegram" ? [`${code(channel, "/chatid")} — Tampilkan Chat ID Telegram`] : []),
    "",
    `_Contoh: ${command(channel, "editkamar")} 12 harga 1600000_`,
  ]
  const title = channel === "telegram" ? "🔑 <b>Daftar Command BotKos</b>" : "🔑 *Daftar Command BotKos*"
  const footer = channel === "telegram" && chatId ? `\n\nChat ID Anda: ${code(channel, chatId)}` : ""
  return `${title}\n\n${lines.join("\n")}${footer}`
}

export const buildWelcomeMessage = (channel: BotChannel) => channel === "telegram"
  ? buildHelpMessage(channel)
  : "🔑 *Selamat datang di BotKos*\n\nAsisten pengelolaan kos untuk memantau kamar, tenant, pembayaran, langganan, dan laporan langsung dari chat.\n\n_Ketik_ `/help` _untuk melihat daftar command._"

export const buildChatIdMessage = (chatId: string) => `🔑 <b>Chat ID Telegram</b>\n\n<code>${escapeHtml(chatId)}</code>\n\n<i>Hubungkan Chat ID ini di dashboard agar notifikasi BotKos terkirim ke akun Anda.</i>`

export const buildUnknownCommandMessage = (channel: BotChannel) => channel === "telegram"
  ? "⚠️ <b>Command tidak dikenali</b>\n\nCommand tersebut belum tersedia.\n\n<i>Ketik /help untuk melihat daftar command.</i>"
  : "⚠️ *Pesan tidak dikenali*\n\nPesan atau command tersebut belum tersedia.\n\n_Ketik_ `/help` _untuk melihat daftar command._"

export const commandForChannel = command
