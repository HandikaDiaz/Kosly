import type { MetadataRoute } from "next"
import { fetchQuery } from "convex/nextjs"
import { api } from "../convex/_generated/api"
import { getSiteUrl } from "../lib/siteUrl"
import { getLegalMode, legalPages, legalUrl } from "../content/legal/mode"

type PublishedSlugPage = { page: Array<{ slug: string; updatedAt: number }>; continueCursor: string; isDone: boolean }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const entries: MetadataRoute.Sitemap = [{ url: baseUrl, changeFrequency: "weekly", priority: 1 }]
  if (getLegalMode() === "reviewed") entries.push(...legalPages.map((page) => ({ url: `${baseUrl}${legalUrl(page)}`, changeFrequency: "monthly" as const, priority: 0.3 })))
  try {
    let cursor: string | null = null
    do {
      const page: PublishedSlugPage = await fetchQuery(api.properties.listPublishedSlugs, { paginationOpts: { numItems: 100, cursor } })
      entries.push(...page.page.map((property) => ({ url: `${baseUrl}/kos/${property.slug}`, lastModified: new Date(property.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })))
      cursor = page.continueCursor || null
    } while (cursor)
  } catch {
    return entries
  }
  return entries
}
