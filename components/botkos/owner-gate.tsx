"use client"

import { useConvexAuth } from "@convex-dev/auth/react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"

export function OwnerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const ensureOwner = useMutation(api.owners.ensureCurrentOwner)
  const [ownerReady, setOwnerReady] = useState(false)
  const setup = useQuery(api.owners.getSetupState, ownerReady ? {} : "skip")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login")
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated || ownerReady) return
    let cancelled = false
    const attempt = () => {
      void ensureOwner().then((result) => {
        if (cancelled) return
        if (result) {
          setOwnerReady(true)
        } else {
          // Auth token not delivered to server yet, retry shortly
          setTimeout(() => { if (!cancelled) attempt() }, 500)
        }
      }).catch(() => { if (!cancelled) router.replace("/login") })
    }
    attempt()
    return () => { cancelled = true }
  }, [ensureOwner, isAuthenticated, ownerReady, router])

  useEffect(() => {
    if (setup && !setup.onboardingCompleted) router.replace("/onboarding")
  }, [router, setup])

  if (authLoading || !isAuthenticated || !ownerReady || !setup?.onboardingCompleted) return <div className="flex min-h-svh items-center justify-center text-sm text-[var(--ink-muted)]">Menyiapkan ruang owner…</div>
  return <>{children}</>
}
