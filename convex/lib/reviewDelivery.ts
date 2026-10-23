export type ReviewInvitationReason = "moveout" | "active90"
export type ReviewMessageSender = (phone: string, message: string) => Promise<void>

export const buildReviewUrl = (baseUrl: string | undefined, token: string) => {
  if (!baseUrl?.trim()) throw new Error("APP_BASE_URL belum dikonfigurasi.")
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "")
  return `${normalizedBase}/ulasan/${encodeURIComponent(token)}`
}

export const buildReviewInvitationMessage = ({
  propertyName,
  reason,
  url,
}: {
  propertyName: string
  reason: ReviewInvitationReason
  url: string
}) => {
  const invitation = reason === "moveout"
    ? "Terima kasih sudah tinggal bersama kami. Boleh bantu isi ulasan singkat tentang pengalamanmu?"
    : "Kamu sudah sekitar 3 bulan tinggal di sini. Boleh berbagi pengalamanmu lewat ulasan singkat?"
  return `Halo,\n\n${propertyName}\n${invitation}\n\n${url}\n\nLink ini hanya untuk kamu dan hanya bisa dipakai sekali. Ini adalah pesan satu kali, tanpa kewajiban atau imbalan.`
}

export const deliverReviewMessage = async ({ phone, message, send }: { phone: string; message: string; send: ReviewMessageSender }) => {
  const normalizedPhone = phone.replace(/\D/g, "")
  if (normalizedPhone.length < 9) throw new Error("Kanal WhatsApp penyewa tidak tersedia.")
  await send(normalizedPhone, message)
}
