import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

test("admin transitions an open report to resolved", async () => {
  const t = convexTest(schema, modules)
  const reportId = await t.run(async (ctx) => {
    await ctx.db.insert("owners", { tokenIdentifier: "report-admin", role: "admin" })
    return await ctx.db.insert("reports", { description: "Laporan test", status: "open" })
  })
  await t.withIdentity({ tokenIdentifier: "report-admin" }).mutation(api.reports.updateStatus, { reportId, status: "resolved", resolutionNote: "Selesai ditinjau" })
  const report = await t.run(async (ctx) => ctx.db.get("reports", reportId))
  expect(report?.status).toBe("resolved")
})
