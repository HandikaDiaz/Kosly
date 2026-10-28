import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"
import { reviewGuideContent } from "@/content/legal/pages"
import { legalRobots } from "@/content/legal/mode"
export const metadata: Metadata = { title: "Panduan Ulasan - BotKos", ...(legalRobots ? { robots: legalRobots } : {}) }
export default function ReviewGuidePage() { return <LegalPage {...reviewGuideContent} /> }
