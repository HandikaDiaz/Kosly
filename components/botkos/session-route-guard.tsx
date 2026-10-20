"use client"

import { useConvexAuth } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { api } from "@/convex/_generated/api"

const isEntryRoute = (pathname: string) =>
  pathname === "/login"

export function SessionRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const role = useQuery(
    api.owners.getCurrentRole,
    isAuthenticated ? {} : "skip"
  )

  useEffect(() => {
    if (isLoading || !isAuthenticated || role === undefined) return

    const destination = role === "admin" ? "/admin" : "/dashboard"
    const shouldLeaveEntryRoute = isEntryRoute(pathname)
    const adminOnOwnerRoute =
      role === "admin" && pathname.startsWith("/dashboard")
    const ownerOnAdminRoute = role !== "admin" && pathname.startsWith("/admin")

    if (shouldLeaveEntryRoute || adminOnOwnerRoute || ownerOnAdminRoute) {
      router.replace(destination)
    }
  }, [isAuthenticated, isLoading, pathname, role, router])

  return <>{children}</>
}
