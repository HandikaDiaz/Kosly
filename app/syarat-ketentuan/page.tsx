import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"
import { termsContent } from "@/content/legal/pages"
import { legalRobots } from "@/content/legal/mode"
export const metadata: Metadata = { title: "Syarat & Ketentuan - BotKos", ...(legalRobots ? { robots: legalRobots } : {}) }
export default function TermsCanonicalPage() { return <LegalPage {...termsContent} /> }
