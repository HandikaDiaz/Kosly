"use client"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { LocationVerificationSection } from "@/components/botkos/location-verification-section"
import { PageLoader } from "@/components/botkos/page-loader"
export default function LocationPage() { const { propertyId } = useParams<{ propertyId: string }>(); const property = useQuery(api.properties.getMine, { propertyId: propertyId as Id<"properties"> }); if (property === undefined) return <PageLoader variant="inline" message="Memuat verifikasi lokasi…" />; if (!property) return null; return <LocationVerificationSection propertyId={property._id} address={property.address} /> }
