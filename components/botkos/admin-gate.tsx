"use client"

import { useConvexAuth } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { api } from "@/convex/_generated/api"

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const owner = useQuery(api.owners.me, isAuthenticated ? {} : "skip")
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login")
    if (owner && owner.role !== "admin") router.replace("/dashboard")
  }, [isAuthenticated, isLoading, owner, router])
  if (isLoading || !isAuthenticated || !owner || owner.role !== "admin") return <div className="flex min-h-svh items-center justify-center text-sm text-[var(--ink-muted)]">Memeriksa akses admin…</div>
  return <>{children}</>
}
