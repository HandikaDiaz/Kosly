import { describe, expect, test } from "vitest"
import { buildBagikanReply, buildShareUrl, cleanForLabel, deriveShareStatus, maskedPhoneSuffix } from "./shareRules"

describe("share rules", () => {
  test("normalizes URL and masks phone", () => { expect(buildShareUrl("https://example.test///", "abc")).toBe("https://example.test/rapor/abc"); expect(maskedPhoneSuffix("+6281234567890")).toBe("••••7890") })
  test("handles labels and status boundary", () => { expect(cleanForLabel("  calon   pemilik  ")).toBe("calon pemilik"); expect(deriveShareStatus({ status: "active", expiresAt: 10 }, 10)).toBe("expired"); expect(buildBagikanReply({ url: "https://x/rapor/a" })).toContain("https://x/rapor/a") })
})
