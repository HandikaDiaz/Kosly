export const WINDOW_MS = 24 * 60 * 60 * 1000
export const WINDOW_SAFETY_MS = 30 * 60 * 1000
export const TEMPLATE_LANGUAGE = "id" as const

export type WhatsAppTemplateKind =
  | "owner_new_application"
  | "owner_application_reminder"
  | "owner_dp_claim"
  | "tenant_application_accepted"
  | "tenant_application_update"
  | "tenant_hold_reminder"
  | "tenant_review_invite"

type TemplateDefinition = {
  name: string
  language: typeof TEMPLATE_LANGUAGE
  category: "UTILITY"
  params: readonly string[]
  fallbackText: (params: Record<string, string>) => string
}

const fallback = (text: string) => () => text

export const TEMPLATE_REGISTRY: Record<WhatsAppTemplateKind, TemplateDefinition> = {
  owner_new_application: { name: "bk_owner_new_application", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kos", "kamar", "kode"], fallbackText: fallback("Pengajuan sewa baru") },
  owner_application_reminder: { name: "bk_owner_application_reminder", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kode", "kos", "jam"], fallbackText: fallback("Pengingat pengajuan sewa") },
  owner_dp_claim: { name: "bk_owner_dp_claim", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kode", "kos"], fallbackText: fallback("Klaim DP pengajuan sewa") },
  tenant_application_accepted: { name: "bk_tenant_application_accepted", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kode", "batasWaktu"], fallbackText: fallback("Pengajuan diterima") },
  tenant_application_update: { name: "bk_tenant_application_update", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kode"], fallbackText: fallback("Pembaruan pengajuan sewa") },
  tenant_hold_reminder: { name: "bk_tenant_hold_reminder", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kode", "batasWaktu"], fallbackText: fallback("Pengingat penahanan kamar") },
  tenant_review_invite: { name: "bk_tenant_review_invite", language: TEMPLATE_LANGUAGE, category: "UTILITY", params: ["kos"], fallbackText: fallback("Undangan ulasan") },
}

export const isWindowOpen = (lastInboundAt: number | undefined, now: number) => Boolean(lastInboundAt && now - lastInboundAt < WINDOW_MS - WINDOW_SAFETY_MS)

export const sanitizeTemplateParam = (value: string, label: string, maxLength = 60) => {
  const sanitized = value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, maxLength).trim()
  if (!sanitized) throw new Error(`Parameter template ${label} tidak boleh kosong.`)
  return sanitized
}

export const buildTemplatePayload = (kind: WhatsAppTemplateKind, params: Record<string, string>, buttonParam?: string) => {
  const definition = TEMPLATE_REGISTRY[kind]
  const body = definition.params.map((key) => ({ type: "text", text: sanitizeTemplateParam(params[key] ?? "", key, key === "kos" ? 200 : 60) }))
  const components: Array<Record<string, unknown>> = [{ type: "body", parameters: body }]
  if (kind === "tenant_review_invite") {
    if (!buttonParam) throw new Error("Parameter tombol URL ulasan wajib diisi.")
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: sanitizeTemplateParam(buttonParam, "token", 200) }] })
  }
  return { name: definition.name, language: { code: definition.language }, components }
}
