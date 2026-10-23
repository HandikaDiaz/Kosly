"use client"
import { useState } from "react"

export const RevealButton = () => { const [busy, setBusy] = useState(false); const reveal = async () => { setBusy(true); await fetch(`/api${window.location.pathname}/reveal`, { method: "POST" }); window.location.reload() }; return <button type="button" disabled={busy} onClick={reveal}>{busy ? "Membuka…" : "Buka rapor"}</button> }
