"use client"

import { useConvexAuth } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import Link from "next/link"
import type { ComponentProps } from "react"
import { api } from "@/convex/_generated/api"

type AuthAwareLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  authenticatedHref: string
  unauthenticatedHref?: string
  adminHref?: string
}

export const AuthAwareLink = ({
  authenticatedHref,
  unauthenticatedHref = "/login",
  adminHref = "/admin",
  ...props
}: AuthAwareLinkProps) => {
  const { isAuthenticated } = useConvexAuth()
  const role = useQuery(
    api.owners.getCurrentRole,
    isAuthenticated ? {} : "skip"
  )
  const href = !isAuthenticated
    ? unauthenticatedHref
    : role === "admin"
      ? adminHref
      : authenticatedHref

  return <Link href={href} {...props} />
}
