import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"
import { privacyContent } from "@/content/legal/pages"
import { legalRobots } from "@/content/legal/mode"
export const metadata: Metadata = { title: "Kebijakan Privasi - BotKos", ...(legalRobots ? { robots: legalRobots } : {}) }
export default function PrivacyCanonicalPage() { return <LegalPage {...privacyContent} /> }
