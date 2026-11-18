import { redirect } from "next/navigation"

export default async function HiddenPropertyVerificationPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  redirect(`/dashboard/properties/${propertyId}`)
}
