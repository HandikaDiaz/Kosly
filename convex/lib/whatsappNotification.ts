import { buildTemplatePayload, isWindowOpen, type WhatsAppTemplateKind } from "./whatsappTemplates"

export type WhatsAppNotificationInput = {
  toPhoneE164: string
  kind: WhatsAppTemplateKind
  params: Record<string, string>
  fallbackText: string
  idempotencyKey: string
  buttonParam?: string
}

export type WhatsAppNotificationResult = {
  mode: "text" | "template" | "skipped"
  ok: boolean
  errorCode?: string
}

type DeliveryDeps = {
  now: number
  phoneHash: string
  lastInboundAt?: number
  templatesEnabled: boolean
  alreadyAttempted: boolean
  sendText: (text: string) => Promise<string | undefined>
  sendTemplate: (payload: Record<string, unknown>) => Promise<string | undefined>
  record: (entry: { mode: WhatsAppNotificationResult["mode"]; ok: boolean; errorCode?: string; externalMessageId?: string }) => Promise<void>
  incrementStats: (mode: "text" | "template", kind: WhatsAppTemplateKind) => Promise<void>
}

export const mapWhatsAppError = (status?: number, providerCode?: number) => {
  if (providerCode === 131047 || status === 470) return "di_luar_jendela"
  if (providerCode === 132001 || status === 404) return "template_tidak_disetujui"
  if (providerCode === 132000 || providerCode === 100 || status === 400) return "parameter_tidak_valid"
  if (providerCode === 131026 || status === 422) return "nomor_tidak_valid"
  if (status === 429) return "batas_laju"
  return "provider_gagal"
}

export const sendWhatsAppNotification = async (input: WhatsAppNotificationInput, deps: DeliveryDeps): Promise<WhatsAppNotificationResult> => {
  if (deps.alreadyAttempted) return { mode: "skipped", ok: false, errorCode: "sudah_dicoba" }
  if (!deps.templatesEnabled && !isWindowOpen(deps.lastInboundAt, deps.now)) {
    const result = { mode: "skipped" as const, ok: false, errorCode: "dinonaktifkan" }
    await deps.record(result)
    return result
  }
  if (isWindowOpen(deps.lastInboundAt, deps.now)) {
    try {
      const externalMessageId = await deps.sendText(input.fallbackText)
      const result = { mode: "text" as const, ok: true }
      await deps.record({ ...result, externalMessageId })
      await deps.incrementStats("text", input.kind)
      return result
    } catch (cause) {
      const result = { mode: "text" as const, ok: false, errorCode: (cause as { mapped?: string }).mapped ?? "provider_gagal" }
      await deps.record(result)
      return result
    }
  }
  let payload: Record<string, unknown>
  try {
    payload = buildTemplatePayload(input.kind, input.params, input.buttonParam)
  } catch {
    const result = { mode: "skipped" as const, ok: false, errorCode: "parameter_tidak_valid" }
    await deps.record(result)
    return result
  }
  try {
    const externalMessageId = await deps.sendTemplate(payload)
    const result = { mode: "template" as const, ok: true }
    await deps.record({ ...result, externalMessageId })
    await deps.incrementStats("template", input.kind)
    return result
  } catch (cause) {
    const result = { mode: "template" as const, ok: false, errorCode: (cause as { mapped?: string }).mapped ?? "provider_gagal" }
    await deps.record(result)
    return result
  }
}
