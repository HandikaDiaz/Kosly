import { describe, expect, it } from "vitest"
import { getLegalMode, hasLegalPlaceholders, legalUrl, reviewedLegalIssues } from "../../content/legal/mode"

describe("legal mode", () => {
  it("selects reviewed, draft, then preparing", () => {
    expect(getLegalMode({ NEXT_PUBLIC_LEGAL_REVIEWED: "true", NEXT_PUBLIC_LEGAL_SHOW_DRAFT: "true" })).toBe("reviewed")
    expect(getLegalMode({ NEXT_PUBLIC_LEGAL_SHOW_DRAFT: "true" })).toBe("draft")
    expect(getLegalMode({})).toBe("preparing")
  })

  it("detects unresolved placeholders and canonical urls", () => {
    expect(hasLegalPlaceholders("[[ISI: email]]")).toBe(true)
    expect(hasLegalPlaceholders("final")).toBe(false)
    expect(legalUrl("hak-data")).toBe("/hak-data")
    expect(reviewedLegalIssues({ email: "[[ISI: email]]" }, { effectiveDate: "" })).toEqual(["placeholder", "effectiveDate"])
  })
})
