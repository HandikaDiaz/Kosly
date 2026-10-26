"use client"
import { useParams } from "next/navigation"
import type { Id } from "@/convex/_generated/dataModel"
import { ReviewsOwnerSection } from "@/components/botkos/reviews-owner-section"
export default function ReviewsPage() { const { propertyId } = useParams<{ propertyId: string }>(); return <ReviewsOwnerSection propertyId={propertyId as Id<"properties">} /> }
