"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useMutation, useQuery } from "convex/react"
import { Building2, CheckCircle2, DoorOpen, Plus, Search, Trash2, Wand2 } from "lucide-react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { PageLoader } from "@/components/botkos/page-loader"

type RoomDraft = {
  id: string
  roomNumber: string
  monthlyRent: string
  floor: string
  roomType: string
}

const newRow = (roomNumber = "", monthlyRent = "1500000", floor = "", roomType = ""): RoomDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  roomNumber,
  monthlyRent,
  floor,
  roomType,
})

export default function AdminSetupPage() {
  const owners = useQuery(api.admin.listOwnersForAdmin)
  const createPropertyForOwner = useMutation(api.admin.createPropertyForOwner)
  const bulkCreateRoomsForOwner = useMutation(api.admin.bulkCreateRoomsForOwner)

  const [ownerSearch, setOwnerSearch] = useState("")
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")

  // New property inline form
  const [showNewProp, setShowNewProp] = useState(false)
  const [newPropName, setNewPropName] = useState("")
  const [newPropAddress, setNewPropAddress] = useState("")
  const [creatingProp, setCreatingProp] = useState(false)

  // Quick generator
  const [genPrefix, setGenPrefix] = useState("")
  const [genStart, setGenStart] = useState("101")
  const [genCount, setGenCount] = useState("10")
  const [genRent, setGenRent] = useState("1500000")
  const [genFloor, setGenFloor] = useState("1")

  // Room rows
  const [rows, setRows] = useState<RoomDraft[]>([newRow("101", "1500000", "1")])
  const [savingRooms, setSavingRooms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: string[]; skipped: Array<{ roomNumber: string; reason: string }> } | null>(null)

  const filteredOwners = useMemo(() => {
    if (!owners) return []
    const q = ownerSearch.trim().toLowerCase()
    if (!q) return owners
    return owners.filter(
      (o) => o.email.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)
    )
  }, [owners, ownerSearch])

  const selectedOwner = useMemo(
    () => owners?.find((o) => String(o._id) === selectedOwnerId) ?? null,
    [owners, selectedOwnerId]
  )

  const effectivePropertyId = useMemo(() => {
    if (!selectedOwner) return ""
    if (selectedOwner.properties.some((p) => String(p._id) === selectedPropertyId)) {
      return selectedPropertyId
    }
    return selectedOwner.properties[0] ? String(selectedOwner.properties[0]._id) : ""
  }, [selectedOwner, selectedPropertyId])

  if (!owners) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat daftar pemilik kos…"
        submessage="Mengambil data akun dan properti"
      />
    )
  }

  const handleGenerateRows = () => {
    const startNum = Math.max(1, Number(genStart) || 1)
    const count = Math.min(100, Math.max(1, Number(genCount) || 1))
    const generated: RoomDraft[] = Array.from({ length: count }, (_, idx) =>
      newRow(`${genPrefix}${startNum + idx}`, genRent || "1500000", genFloor)
    )
    setRows(generated)
    setResult(null)
    setError(null)
  }

  const handleCreateProperty = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedOwner) return
    setCreatingProp(true)
    setError(null)
    try {
      const created = await createPropertyForOwner({
        ownerId: selectedOwner._id,
        name: newPropName,
        address: newPropAddress,
      })
      setSelectedPropertyId(String(created.propertyId))
      setNewPropName("")
      setNewPropAddress("")
      setShowNewProp(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat properti baru.")
    } finally {
      setCreatingProp(false)
    }
  }

  const handleSaveRooms = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedOwner || !effectivePropertyId) {
      setError("Pilih owner dan properti terlebih dahulu.")
      return
    }
    const validRows = rows
      .map((r) => ({
        roomNumber: r.roomNumber.trim(),
        monthlyRent: Number(r.monthlyRent.replace(/\D/g, "")),
        floor: r.floor.trim() || undefined,
        roomType: r.roomType.trim() || undefined,
      }))
      .filter((r) => r.roomNumber.length > 0)

    if (validRows.length === 0) {
      setError("Minimal 1 nomor kamar harus diisi.")
      return
    }
    if (validRows.some((r) => !Number.isFinite(r.monthlyRent) || r.monthlyRent <= 0)) {
      setError("Semua baris kamar wajib memiliki harga sewa lebih dari 0.")
      return
    }

    setSavingRooms(true)
    setError(null)
    setResult(null)
    try {
      const res = await bulkCreateRoomsForOwner({
        ownerId: selectedOwner._id,
        propertyId: effectivePropertyId as Id<"properties">,
        rooms: validRows,
      })
      setResult(res)
      if (res.created.length > 0 && res.skipped.length === 0) {
        setRows([newRow()])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kamar.")
    } finally {
      setSavingRooms(false)
    }
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-[var(--ink-muted)]">Onboarding Bantuan Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Bantu Input Properti &amp; Kamar
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)]">
          Gunakan form ini untuk membantu pemilik kos baru menginputkan data bangunan dan daftar kamarnya sekaligus tanpa perlu menyentuh dashboard database Convex.
        </p>
      </header>

      {/* ── Step 1: Pilih Owner & Properti ── */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
          <Building2 size={18} className="text-[var(--gold-dark)]" />
          <h2 className="text-base font-bold text-[var(--ink)]">1. Pilih Akun Pemilik Kos &amp; Properti</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="owner-search" className="field-label">Cari Email / Nama Pemilik</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                id="owner-search"
                type="text"
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                placeholder="Ketik email atau nama…"
                className="field-input pl-9"
              />
            </div>
          </div>

          <div>
            <label htmlFor="owner-select" className="field-label">Pilih Akun Owner</label>
            <select
              id="owner-select"
              value={selectedOwnerId}
              onChange={(e) => {
                setSelectedOwnerId(e.target.value)
                setSelectedPropertyId("")
                setResult(null)
                setError(null)
              }}
              className="field-input"
            >
              <option value="">-- Pilih pemilik kos ({filteredOwners.length}) --</option>
              {filteredOwners.map((o) => (
                <option key={o._id} value={String(o._id)}>
                  {o.email} · {o.name} ({o.properties.length} kos)
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedOwner ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="property-select" className="field-label">Properti Target</label>
                {selectedOwner.properties.length > 0 ? (
                  <select
                    id="property-select"
                    value={effectivePropertyId}
                    onChange={(e) => {
                      setSelectedPropertyId(e.target.value)
                      setResult(null)
                    }}
                    className="field-input bg-white"
                  >
                    {selectedOwner.properties.map((p) => (
                      <option key={p._id} value={String(p._id)}>
                        {p.name} ({p.roomCount} kamar) — {p.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-800">
                    Pemilik ini belum memiliki properti. Klik <strong>Buat Properti Baru</strong> di sebelah kanan.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowNewProp((prev) => !prev)}
                className="button-secondary shrink-0 text-xs"
              >
                <Plus size={14} />
                {showNewProp ? "Tutup Form Properti" : "Buat Properti Baru"}
              </button>
            </div>

            {showNewProp ? (
              <form onSubmit={(e) => void handleCreateProperty(e)} className="mt-3 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
                <input
                  type="text"
                  required
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="Nama Kos (mis. Kos Mawar)"
                  className="field-input bg-white"
                />
                <input
                  type="text"
                  required
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  placeholder="Alamat Kos"
                  className="field-input bg-white"
                />
                <button type="submit" disabled={creatingProp} className="button-primary text-xs">
                  {creatingProp ? "Membuat…" : "Simpan Properti"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ── Step 2: Generator & Input Massal Kamar ── */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
          <DoorOpen size={18} className="text-[var(--gold-dark)]" />
          <h2 className="text-base font-bold text-[var(--ink)]">2. Input Daftar Kamar (Sekaligus)</h2>
        </div>

        {/* Quick Generator */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            <Wand2 size={14} className="text-[var(--gold-dark)]" />
            Generate Nomor Kamar Otomatis (Opsional)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-6">
            <div>
              <label className="text-[11px] text-[var(--ink-muted)]">Awalan</label>
              <input
                type="text"
                value={genPrefix}
                onChange={(e) => setGenPrefix(e.target.value)}
                placeholder="mis. A-"
                className="field-input bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--ink-muted)]">Mulai Angka</label>
              <input
                type="number"
                value={genStart}
                onChange={(e) => setGenStart(e.target.value)}
                className="field-input bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--ink-muted)]">Jumlah Kamar</label>
              <input
                type="number"
                min={1}
                max={100}
                value={genCount}
                onChange={(e) => setGenCount(e.target.value)}
                className="field-input bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--ink-muted)]">Harga / Bulan (Rp)</label>
              <input
                type="number"
                value={genRent}
                onChange={(e) => setGenRent(e.target.value)}
                className="field-input bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--ink-muted)]">Lantai</label>
              <input
                type="text"
                value={genFloor}
                onChange={(e) => setGenFloor(e.target.value)}
                placeholder="1"
                className="field-input bg-white text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGenerateRows}
                className="button-secondary w-full text-xs"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Editable Room Rows */}
        <form onSubmit={(e) => void handleSaveRooms(e)} className="space-y-4">
          <div className="space-y-2">
            <div className="hidden grid-cols-[1.2fr_1.4fr_0.8fr_1fr_auto] gap-2 px-1 text-xs font-semibold text-[var(--ink-muted)] sm:grid">
              <span>Nomor Kamar *</span>
              <span>Harga Sewa / Bulan (Rp) *</span>
              <span>Lantai</span>
              <span>Tipe (opsional)</span>
              <span className="w-9" />
            </div>

            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--line)] p-2.5 sm:grid-cols-[1.2fr_1.4fr_0.8fr_1fr_auto] sm:border-0 sm:p-0">
                <input
                  type="text"
                  required
                  value={row.roomNumber}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, roomNumber: e.target.value } : r)))
                  }
                  placeholder="Nomor Kamar (mis. 101)"
                  className="field-input text-sm"
                />
                <input
                  type="number"
                  required
                  min={1}
                  value={row.monthlyRent}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, monthlyRent: e.target.value } : r)))
                  }
                  placeholder="Harga sewa (mis. 1500000)"
                  className="field-input text-sm"
                />
                <input
                  type="text"
                  value={row.floor}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, floor: e.target.value } : r)))
                  }
                  placeholder="Lantai"
                  className="field-input text-sm"
                />
                <input
                  type="text"
                  value={row.roomType}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, roomType: e.target.value } : r)))
                  }
                  placeholder="Tipe (AC / Non-AC)"
                  className="field-input text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== row.id) : prev))}
                  disabled={rows.length === 1}
                  aria-label="Hapus baris"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, newRow()])}
              className="button-secondary text-xs"
            >
              <Plus size={14} />
              Tambah Baris Kamar
            </button>

            <button
              type="submit"
              disabled={savingRooms || !selectedOwner || !effectivePropertyId}
              className="button-primary"
            >
              {savingRooms ? "Menyimpan Kamar…" : `Simpan ${rows.length} Kamar`}
            </button>
          </div>
        </form>

        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={17} className="text-emerald-700" />
              <span>Berhasil menambahkan {result.created.length} kamar!</span>
            </div>
            {result.created.length > 0 ? (
              <p className="text-xs text-emerald-800">Kamar tersimpan: {result.created.join(", ")}</p>
            ) : null}
            {result.skipped.length > 0 ? (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                <p className="font-semibold">Dilewati ({result.skipped.length}):</p>
                <ul className="mt-1 list-disc pl-4">
                  {result.skipped.map((s) => (
                    <li key={s.roomNumber}>
                      Kamar {s.roomNumber}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
