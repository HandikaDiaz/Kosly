import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get("tenant_session")?.value
  if (!sessionToken) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 })
  const body = await request.json() as { action?: "create" | "revoke"; forLabel?: string; shareId?: string }
  try {
    if (body.action === "create") return NextResponse.json(await fetchMutation(api.raporShares.createRaporShare, { sessionToken, forLabel: body.forLabel }))
    if (body.action === "revoke" && body.shareId) return NextResponse.json(await fetchMutation(api.raporShares.revokeRaporShare, { sessionToken, shareId: body.shareId as Id<"raporShares"> }))
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 })
  } catch { return NextResponse.json({ error: "Permintaan berbagi belum dapat diproses." }, { status: 400 }) }
}
