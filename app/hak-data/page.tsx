import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"
import { dataRightsContent } from "@/content/legal/pages"
import { legalRobots } from "@/content/legal/mode"
export const metadata: Metadata = { title: "Hak Data - BotKos", ...(legalRobots ? { robots: legalRobots } : {}) }
export default function DataRightsPage() { return <LegalPage {...dataRightsContent} /> }
