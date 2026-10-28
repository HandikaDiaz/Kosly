export type LegalMode = "reviewed" | "draft" | "preparing"

export const getLegalMode = (env: Record<string, string | undefined> = process.env): LegalMode => {
  if (env.NEXT_PUBLIC_LEGAL_REVIEWED === "true") return "reviewed"
  if (env.NEXT_PUBLIC_LEGAL_SHOW_DRAFT === "true") return "draft"
  return "preparing"
}

export const legalPages = ["kebijakan-privasi", "syarat-ketentuan", "panduan-ulasan", "hak-data"] as const
export type LegalPage = (typeof legalPages)[number]
export const legalUrl = (page: LegalPage) => `/${page}`
export const hasLegalPlaceholders = (value: string) => value.includes("[[ISI:")
export const reviewedLegalIssues = (entityValue: unknown, metaValue: { effectiveDate: string }) => [
  ...(hasLegalPlaceholders(JSON.stringify(entityValue)) ? ["placeholder"] : []),
  ...(metaValue.effectiveDate.trim() ? [] : ["effectiveDate"]),
]
export const legalRobots = getLegalMode() === "reviewed" ? undefined : { index: false, follow: false }

if (process.env.NEXT_PUBLIC_LEGAL_REVIEWED === "true") {
  console.warn("[legal] reviewed mode must be tested for [[ISI: ...]] placeholders and effectiveDate before release")
}
