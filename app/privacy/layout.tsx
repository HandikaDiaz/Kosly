import { permanentRedirect } from "next/navigation"
export default function PrivacyRedirectLayout({ children }: { children: React.ReactNode }) { permanentRedirect("/kebijakan-privasi"); return children }
