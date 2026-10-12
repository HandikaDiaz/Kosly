import type { PaymentReviewSummary } from "./types"
import { buildReviewMessage } from "./formatters"

export type TelegramInlineButton = { text: string; callback_data: string }
export type TelegramReplyMarkup = { inline_keyboard: TelegramInlineButton[][] }

export const buildTelegramReviewMessage = (summary: PaymentReviewSummary) => {
  const { text } = buildReviewMessage(summary, "telegram")
  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Konfirmasi", callback_data: `confirm:${summary.reference}` },
          { text: "Tolak", callback_data: `reject:${summary.reference}` },
        ],
      ],
    },
  }
}

export type UpgradeOption = { tier: "starter" | "growth" | "pro"; monthlyPrice: number; annualPrice: number }
const formatPrice = (value: number) => `Rp ${value.toLocaleString("id-ID")}`
const titleTier = (tier: UpgradeOption["tier"]) => tier.charAt(0).toUpperCase() + tier.slice(1)

export const buildTelegramUpgradeMessage = (options: ReadonlyArray<UpgradeOption>) => ({
  text: "⬆️ <b>Pilih tier upgrade</b>\n\nPilih paket dan siklus tagihan di bawah ini:",
  reply_markup: {
    inline_keyboard: [
      ...options.map((option) => [
        { text: `${titleTier(option.tier)} · Bulanan (${formatPrice(option.monthlyPrice)})`, callback_data: `upgrade:${option.tier}:monthly` },
        { text: `${titleTier(option.tier)} · Tahunan (${formatPrice(option.annualPrice)})`, callback_data: `upgrade:${option.tier}:annual` },
      ]),
      [{ text: "Batal", callback_data: "cancel:upgrade" }],
    ],
  } satisfies TelegramReplyMarkup,
})

export const buildTelegramCancelMarkup = (): TelegramReplyMarkup => ({
  inline_keyboard: [[{ text: "Batal", callback_data: "cancel:upgrade" }]],
})

export const sendTelegramPaymentReview = async (
  token: string,
  chatId: string,
  summary: PaymentReviewSummary
) => {
  const message = buildTelegramReviewMessage(summary)
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, parse_mode: "HTML", ...message }),
  })
  if (!response.ok)
    throw new Error(`Telegram API gagal (${response.status}): ${(await response.text()).slice(0, 500)}`)
  return (await response.json()) as { ok: boolean; result?: { message_id: number } }
}

export const sendTelegramPaymentProof = async (
  token: string,
  chatId: string,
  summary: PaymentReviewSummary,
  proofUrl: string
) => {
  const message = buildTelegramReviewMessage(summary)
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: proofUrl,
      caption: message.text,
      parse_mode: "HTML",
      reply_markup: message.reply_markup,
    }),
  })
  if (!response.ok)
    throw new Error(`Telegram API gagal (${response.status}): ${(await response.text()).slice(0, 500)}`)
  return (await response.json()) as { ok: boolean; result?: { message_id: number } }
}

export const answerTelegramCallback = async (token: string, callbackQueryId: string, text: string) => {
  const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  })
  if (!response.ok)
    throw new Error(`Telegram callback API gagal (${response.status}): ${(await response.text()).slice(0, 500)}`)
}

export const sendTelegramText = async (
  token: string,
  chatId: string,
  text: string,
  options?: { parseMode?: "HTML" | "Markdown"; replyMarkup?: TelegramReplyMarkup }
) => {
  const payload: Record<string, unknown> = { chat_id: chatId, text }
  if (options?.parseMode) {
    payload.parse_mode = options.parseMode
  }
  if (options?.replyMarkup) payload.reply_markup = options.replyMarkup
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Telegram API gagal (${response.status}).`)
}
