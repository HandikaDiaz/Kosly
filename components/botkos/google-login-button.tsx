"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"
import { ArrowRight } from "lucide-react"

export function GoogleLoginButton() {
  const { signIn } = useAuthActions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try { await signIn("google", { redirectTo: "/dashboard" }) } catch (reason) { setError(reason instanceof Error ? reason.message : "Login Google gagal."); setLoading(false) }
  }
  return <div><button type="button" onClick={handleSignIn} disabled={loading} className="button-primary w-full justify-center disabled:cursor-wait disabled:opacity-60">{loading ? "Menghubungkan ke Google…" : "Lanjutkan dengan Google"}<ArrowRight size={16} /></button>{error && <p role="alert" className="mt-3 text-sm text-[var(--warn)]">{error}</p>}</div>
}
