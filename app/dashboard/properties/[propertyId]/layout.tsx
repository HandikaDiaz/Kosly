import { PropertyTabs } from "@/components/botkos/property-tabs"

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return <PropertyTabs>{children}</PropertyTabs>
}
