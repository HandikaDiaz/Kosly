import { permanentRedirect } from "next/navigation"
export default function TermsRedirectLayout({ children }: { children: React.ReactNode }) { permanentRedirect("/syarat-ketentuan"); return children }
