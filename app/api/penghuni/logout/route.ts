import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
export async function POST() { const token = (await cookies()).get("tenant_session")?.value; if (token) await fetchMutation(api.tenantIdentity.logoutTenant, { sessionToken: token }); const response = NextResponse.json({ ok: true }); response.cookies.set("tenant_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 }); return response }
