import type { PaymentReviewSummary } from "./types"
import { buildReviewMessage } from "./formatters"
import { OWNER_COMMANDS } from "./commands"

export const registerWhatsAppCommands = async (
  accessToken: string,
  phoneNumberId: string,
  apiVersion = "v22.0"
) => {
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/conversational_automation`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ commands: OWNER_COMMANDS }),
  })
  if (!response.ok) throw new Error(`WhatsApp Commands gagal (${response.status}): ${(await response.text()).slice(0, 500)}`)
  return (await response.json()) as Record<string, unknown>
}

export const buildWhatsAppReviewMessage = (summary: PaymentReviewSummary) => {
  return buildReviewMessage(summary, "whatsapp").text
}

const sendWhatsAppPaymentInteractive = async (
  accessToken: string,
  phoneNumberId: string,
  phoneNumber: string,
  summary: PaymentReviewSummary,
  proofUrl?: string,
  apiVersion = "v22.0"
) => {
  const interactive = {
    type: "button",
    ...(proofUrl ? { header: { type: "image", image: { link: proofUrl } } } : {}),
    body: { text: buildWhatsAppReviewMessage(summary) },
    action: {
      buttons: [
        { type: "reply", reply: { id: `confirm:${summary.reference}`, title: "Konfirmasi" } },
        { type: "reply", reply: { id: `reject:${summary.reference}`, title: "Tolak" } },
      ],
    },
  }
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "interactive",
      interactive,
    }),
  })
  if (!response.ok) {
    await response.text()
    console.warn(`WhatsApp interactive button gagal (${response.status}), mencoba fallback teks`)
    if (proofUrl) {
      const fallbackResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: phoneNumber, type: "image", image: { link: proofUrl, caption: buildWhatsAppReviewMessage(summary) } }),
      })
      if (!fallbackResponse.ok) throw new Error(`WhatsApp Cloud API gagal (${fallbackResponse.status}).`)
      return (await fallbackResponse.json()) as { messages?: Array<{ id: string }> }
    }
    return sendWhatsAppText(accessToken, phoneNumberId, phoneNumber, buildWhatsAppReviewMessage(summary), apiVersion)
  }
  return (await response.json()) as { messages?: Array<{ id: string }> }
}

export const sendWhatsAppPaymentProof = async (
  accessToken: string,
  phoneNumberId: string,
  phoneNumber: string,
  summary: PaymentReviewSummary,
  proofUrl: string,
  apiVersion = "v22.0"
) => {
  return sendWhatsAppPaymentInteractive(accessToken, phoneNumberId, phoneNumber, summary, proofUrl, apiVersion)
}

export const sendWhatsAppPaymentReview = async (
  accessToken: string,
  phoneNumberId: string,
  phoneNumber: string,
  summary: PaymentReviewSummary,
  apiVersion = "v22.0"
) => sendWhatsAppPaymentInteractive(accessToken, phoneNumberId, phoneNumber, summary, undefined, apiVersion)

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
    await response.text()
    console.error(`WhatsApp Cloud API gagal (${response.status})`)
    throw new Error(`WhatsApp Cloud API gagal (${response.status})`)
  }
  return response.json()
}

export const sendWhatsAppImage = async (
  accessToken: string,
  phoneNumberId: string,
  phoneNumber: string,
  imageUrl: string,
  caption: string,
  apiVersion = "v22.0"
) => {
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phoneNumber, type: "image", image: { link: imageUrl, caption } }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`WhatsApp Cloud API gagal (${response.status}): ${body.slice(0, 500)}`)
  }
  return (await response.json()) as { messages?: Array<{ id: string }> }
}

export const uploadWhatsAppDocument = async (accessToken: string, phoneNumberId: string, bytes: Uint8Array, apiVersion = "v22.0") => {
  const form = new FormData()
  form.append("messaging_product", "whatsapp")
  form.append("type", "application/pdf")
  form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "laporan-botkos.pdf")
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`, { method: "POST", headers: { authorization: `Bearer ${accessToken}` }, body: form })
  if (!response.ok) throw new Error(`WhatsApp Media API gagal (${response.status}).`)
  const data = await response.json() as { id?: string }
  if (!data.id) throw new Error("WhatsApp Media API tidak mengembalikan media_id.")
  return data.id
}

export const sendWhatsAppDocument = async (accessToken: string, phoneNumberId: string, phoneNumber: string, mediaId: string, fileName: string, caption: string, apiVersion = "v22.0") => {
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phoneNumber, type: "document", document: { id: mediaId, filename: fileName, caption } }),
  })
  if (!response.ok) throw new Error(`WhatsApp Cloud API gagal (${response.status}).`)
  return await response.json() as { messages?: Array<{ id: string }> }
}
