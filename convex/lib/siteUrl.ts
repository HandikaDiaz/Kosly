export const getConvexBaseUrl = (value?: string) => {
  const trimmed = value?.trim()
  if (!trimmed) throw new Error("APP_BASE_URL belum dikonfigurasi.")
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withProtocol)
  parsed.protocol = "https:"
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "")
  parsed.search = ""
  parsed.hash = ""
  return parsed.toString().replace(/\/$/, "")
}
