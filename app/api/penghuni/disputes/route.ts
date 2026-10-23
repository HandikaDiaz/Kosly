import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export async function POST(request: Request) {
  const token = (await cookies()).get("tenant_session")?.value
  const body = await request.json() as { action?: "create" | "withdraw"; periodId?: string; disputeId?: string; reason?: "sudah_bayar" | "tanggal_salah" | "bukan_masa_tinggal_saya" | "lainnya"; note?: string }
  if (!token || !body.action) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 })
  if (body.action === "create") await fetchMutation(api.tenantRapor.createPaymentDispute, { sessionToken: token, periodId: body.periodId ?? "", reason: body.reason ?? "lainnya", note: body.note })
  else await fetchMutation(api.tenantRapor.withdrawPaymentDispute, { sessionToken: token, disputeId: body.disputeId as never })
  return NextResponse.json({ ok: true })
}
