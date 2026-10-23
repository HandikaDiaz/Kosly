import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
export async function POST(request: Request) { const token = (await cookies()).get("tenant_session")?.value; const body = await request.json() as { linkId?: string; decision?: "confirm" | "reject" }; if (!token || !body.linkId || !body.decision) return NextResponse.json({ error: "invalid" }, { status: 400 }); await fetchMutation(api.tenantIdentity.decideTenancyLink, { sessionToken: token, linkId: body.linkId as never, decision: body.decision }); return NextResponse.json({ ok: true }) }
