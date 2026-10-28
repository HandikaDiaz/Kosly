export const normalizeSiteUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) throw new Error("URL situs tidak boleh kosong.")
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withProtocol)
  parsed.protocol = "https:"
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "")
  parsed.search = ""
  parsed.hash = ""
  return parsed.toString().replace(/\/$/, "")
}

export const getSiteUrl = () => {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : undefined)
  if (!configured?.trim() && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL atau SITE_URL wajib dikonfigurasi di production.")
  }
  return normalizeSiteUrl(configured ?? "https://localhost:3000")
}
