import type { PaymentReviewSummary } from "./types"
import { buildReviewMessage } from "./formatters"

export const buildWhatsAppReviewMessage = (summary: PaymentReviewSummary) => {
  return buildReviewMessage(summary, "whatsapp").text
}

export const sendWhatsAppPaymentReview = async (
  accessToken: string,
  phoneNumberId: string,
  phoneNumber: string,
  summary: PaymentReviewSummary,
  apiVersion = "v22.0"
) => {
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: { preview_url: false, body: buildWhatsAppReviewMessage(summary) },
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`WhatsApp Cloud API gagal (${response.status}): ${body.slice(0, 500)}`)
  }
  return (await response.json()) as { messages?: Array<{ id: string }> }
}

export const sendWhatsAppText = async (
  accessToken: string,
  phoneNumberId: string,
  phoneNumber: string,
  text: string,
  apiVersion = "v22.0"
) => {
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`WhatsApp Cloud API gagal (${response.status}): ${body.slice(0, 500)}`)
  }
}
