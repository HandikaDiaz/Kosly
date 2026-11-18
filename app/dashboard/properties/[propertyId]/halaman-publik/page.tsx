import { redirect } from "next/navigation"

export default async function HiddenPropertyPublicPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  redirect(`/dashboard/properties/${propertyId}`)
}
