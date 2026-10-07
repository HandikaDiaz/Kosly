import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import schema from "./schema"
import { requireAdmin } from "./lib/auth"

const modules = import.meta.glob("./**/*.ts")

test("requireAdmin accepts an admin owner and rejects an owner role", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    await ctx.db.insert("owners", { tokenIdentifier: "admin-token", role: "admin" })
    await ctx.db.insert("owners", { tokenIdentifier: "owner-token", role: "owner" })
  })

  const admin = await t.withIdentity({ tokenIdentifier: "admin-token" }).mutation(async (ctx) => requireAdmin(ctx))
  expect(admin.role).toBe("admin")

  await expect(t.withIdentity({ tokenIdentifier: "owner-token" }).mutation(async (ctx) => requireAdmin(ctx))).rejects.toThrow("Akses admin ditolak.")
})
