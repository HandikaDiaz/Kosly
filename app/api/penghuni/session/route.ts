import { NextResponse } from "next/server"

const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 14 * 86_400 }
export async function POST(request: Request) { const body = await request.json() as { token?: unknown }; if (typeof body.token !== "string" || !body.token) return NextResponse.json({ error: "invalid" }, { status: 400 }); const response = NextResponse.json({ ok: true }); response.cookies.set("tenant_session", body.token, options); return response }
export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set("tenant_session", "", { ...options, maxAge: 0 }); return response }
