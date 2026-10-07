import { expect, test } from "vitest"
import { parseQueryCommand } from "./queries"

test("parses the supported owner query commands", () => {
  expect(parseQueryCommand("/status")).toBe("status")
  expect(parseQueryCommand("/BELUM_BAYAR")).toBe("unpaid")
  expect(parseQueryCommand("/kamar_kosong sekarang")).toBe("vacant")
  expect(parseQueryCommand("konfirmasi KSL-ABC123")).toBe("invalid")
})
