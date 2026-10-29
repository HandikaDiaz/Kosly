import type { MetadataRoute } from "next"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"
import { getSiteUrl } from "../lib/siteUrl"
import { getLegalMode, legalPages, legalUrl } from "../content/legal/mode"

export const revalidate = 3600 // Cache sitemap at CDN / ISR for 1 hour

type PublishedSlugPage = {
  page: Array<{ slug: string; updatedAt: number }>
  continueCursor: string
  isDone: boolean
}

const MAX_PAGES = 10 // Safety limit: max 1,000 properties
const PAGE_SIZE = 100
const FETCH_TIMEOUT_MS = 5000 // Fast timeout safety to guarantee < 1-2s response

async function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Convex query timeout")), timeoutMs)
    ),
  ])
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/faq`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/harga`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kebijakan-privasi`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/syarat-ketentuan`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    return entries
  }

  try {
    const client = new ConvexHttpClient(convexUrl, {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate: 3600 },
        }),
    })

    let cursor: string | null = null
    let pageCount = 0

    while (pageCount < MAX_PAGES) {
      pageCount++
      const pageResult = (await fetchWithTimeout(
        client.query(api.properties.listPublishedSlugs, {
          paginationOpts: { numItems: PAGE_SIZE, cursor },
        }),
        FETCH_TIMEOUT_MS
      )) as PublishedSlugPage

      if (Array.isArray(pageResult.page) && pageResult.page.length > 0) {
        entries.push(
          ...pageResult.page.map((property) => ({
            url: `${baseUrl}/kos/${property.slug}`,
            lastModified: property.updatedAt ? new Date(property.updatedAt) : new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          }))
        )
      }

      // In Convex pagination, continueCursor is a non-empty string even on the last page.
      // Therefore, isDone MUST be checked to avoid an infinite loop!
      if (pageResult.isDone || !pageResult.continueCursor) {
        break
      }

      cursor = pageResult.continueCursor
    }
  } catch (err: unknown) {
    // Rethrow Next.js internal dynamic server errors if any
    if (
      typeof err === "object" &&
      err !== null &&
      "digest" in err &&
      (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err
    }
    console.error("Failed to fetch published properties for sitemap:", err)
    return entries
  }

  return entries
}
