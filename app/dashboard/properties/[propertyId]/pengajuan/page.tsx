"use client"
import { useParams } from "next/navigation"
import type { Id } from "@/convex/_generated/dataModel"
import { OwnerDisputesSection } from "@/components/botkos/owner-disputes-section"
import { RentalApplicationsSection } from "@/components/botkos/rental-applications-section"
export default function ApplicationsPage() { const { propertyId } = useParams<{ propertyId: string }>(); const id = propertyId as Id<"properties">; return <div className="space-y-5"><RentalApplicationsSection propertyId={id} /><OwnerDisputesSection propertyId={id} /></div> }
