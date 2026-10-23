import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export async function POST(request: Request) {
  const token = (await cookies()).get("tenant_session")?.value
  const body = await request.json() as { action?: "grant" | "withdraw"; textVersion?: string }
  if (!token || !body.action) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 })
  if (body.action === "grant") await fetchMutation(api.tenantRapor.grantShareConsent, { sessionToken: token, textVersion: body.textVersion ?? "" })
  else await fetchMutation(api.tenantRapor.withdrawShareConsent, { sessionToken: token })
  return NextResponse.json({ ok: true })
}
