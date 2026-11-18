import { redirect } from "next/navigation"

export default async function HiddenPropertyReviewsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  redirect(`/dashboard/properties/${propertyId}`)
}
