import { env, internalAction } from "./_generated/server"
import { v } from "convex/values"

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")

const getBannerUrl = () => {
  const siteUrl = env.SITE_URL?.replace(/\/$/, "")
  return siteUrl ? `${siteUrl}/banner.jpg` : null
}

const emailFrame = (content: string) => {
  const bannerUrl = getBannerUrl()
  return `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#fcfbf9;color:#191512;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#fcfbf9;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #ebd8b7;">
          ${bannerUrl ? `<tr><td><img src="${bannerUrl}" alt="BotKos" width="620" style="display:block;width:100%;height:auto;" /></td></tr>` : ""}
          <tr><td style="padding:32px 36px 12px;"><p style="margin:0;color:#8b5e34;font-size:13px;font-weight:700;">BotKos</p></td></tr>
          <tr><td style="padding:0 36px 32px;">${content}</td></tr>
          <tr><td style="padding:18px 36px;border-top:1px solid #ebd8b7;color:#756b60;font-size:12px;line-height:18px;">Pesan ini dikirim otomatis oleh BotKos. Mohon jangan membalas email ini.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

const sendEmail = async ({ to, subject, html, text, idempotencyKey }: { to: string; subject: string; html: string; text: string; idempotencyKey: string }) => {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn("Email BotKos tidak dikirim karena RESEND_API_KEY atau EMAIL_FROM belum dikonfigurasi.")
    return { delivered: false, reason: "Email belum dikonfigurasi." }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Pengiriman email gagal (${response.status}): ${detail.slice(0, 300)}`)
  }

  return { delivered: true, reason: null }
}

export const sendSupportTicketReceipt = internalAction({
  args: { ticketId: v.id("support_tickets"), name: v.string(), email: v.string(), subject: v.string() },
  returns: v.object({ delivered: v.boolean(), reason: v.union(v.string(), v.null()) }),
  handler: async (_ctx, args) => {
    const safeName = escapeHtml(args.name)
    const safeSubject = escapeHtml(args.subject)
    return await sendEmail({
      to: args.email,
      subject: `Kami sudah menerima tiket Anda: ${args.subject}`,
      idempotencyKey: `support-ticket-receipt/${args.ticketId}`,
      text: `Halo ${args.name},\n\nTerima kasih sudah menghubungi BotKos. Tiket dengan subjek “${args.subject}” sudah kami terima dan akan segera ditinjau oleh tim kami.\n\nKami akan mengabari Anda setelah ada pembaruan.`,
      html: emailFrame(`<h1 style="margin:14px 0 16px;font-size:28px;line-height:36px;letter-spacing:-0.5px;">Terima kasih sudah menghubungi kami.</h1><p style="margin:0 0 16px;font-size:16px;line-height:26px;">Halo ${safeName}, tiket Anda sudah masuk ke antrean tim BotKos.</p><div style="margin:24px 0;padding:16px 18px;border-left:3px solid #b28236;background:#fcfbf9;"><p style="margin:0 0 6px;color:#756b60;font-size:12px;">Subjek tiket</p><p style="margin:0;font-size:15px;font-weight:700;line-height:22px;">${safeSubject}</p></div><p style="margin:0;font-size:16px;line-height:26px;">Kami akan meninjau pesan Anda dan mengirim pembaruan melalui email ini. Terima kasih telah membantu BotKos menjadi lebih baik.</p>`),
    })
  },
})

export const sendSupportTicketReplyEmail = internalAction({
  args: { ticketId: v.id("support_tickets"), replyId: v.id("support_ticket_replies"), name: v.string(), email: v.string(), subject: v.string(), message: v.string() },
  returns: v.object({ delivered: v.boolean(), reason: v.union(v.string(), v.null()) }),
  handler: async (_ctx, args) => {
    const safeName = escapeHtml(args.name)
    const safeSubject = escapeHtml(args.subject)
    const safeMessage = escapeHtml(args.message)
    return await sendEmail({
      to: args.email,
      subject: `Balasan BotKos: ${args.subject}`,
      idempotencyKey: `support-ticket-reply/${args.replyId}`,
      text: `Halo ${args.name},\n\nTim BotKos membalas tiket Anda “${args.subject}”.\n\n${args.message}\n\nTerima kasih telah menghubungi BotKos.`,
      html: emailFrame(`<h1 style="margin:14px 0 16px;font-size:28px;line-height:36px;letter-spacing:-0.5px;">Ada balasan untuk tiket Anda.</h1><p style="margin:0 0 16px;font-size:16px;line-height:26px;">Halo ${safeName}, tim BotKos sudah menanggapi tiket Anda.</p><p style="margin:0 0 20px;color:#756b60;font-size:14px;line-height:22px;">Subjek: <strong style="color:#191512;">${safeSubject}</strong></p><div style="margin:0;padding:18px;border-left:3px solid #b28236;background:#fcfbf9;font-size:16px;line-height:26px;">${safeMessage}</div><p style="margin:24px 0 0;font-size:16px;line-height:26px;">Terima kasih telah menghubungi BotKos.</p>`),
    })
  },
})
