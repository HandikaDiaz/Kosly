import { NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { cookies } from "next/headers"

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const result = await fetchMutation(api.raporShares.revealRaporShare, { token })
  if (!result.ok) return NextResponse.json({ ok: false }, { status: 404 })
  const response = NextResponse.json({ ok: true })
  response.cookies.set("rapor_view", result.viewToken, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 60, path: `/rapor/${encodeURIComponent(token)}` })
  return response
}
