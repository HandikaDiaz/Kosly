"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
  DoorOpen,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { RentalApplicationsSection } from "./rental-applications-section"
import { OwnerDisputesSection } from "./owner-disputes-section"
import { PageLoader } from "./page-loader"

export function PropertyTenantsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const id = propertyId as Id<"properties">

  const property = useQuery(api.properties.getMine, { propertyId: id })
  const tenants = useQuery(api.tenants.listForPropertyWithDetails, { propertyId: id })
  const rooms = useQuery(api.rooms.listForProperty, { propertyId: id })
  const occupiedWithoutTenant = useQuery(api.tenants.getOccupiedRoomsWithoutTenant, { propertyId: id })
  const badges = useQuery(api.dashboard.getPropertyTabBadges, { propertyId: id })
  const updateBankDetails = useMutation(api.properties.updateBankDetails)

  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [showApplications, setShowApplications] = useState(false)

  // Bank Account Modal States
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankName, setBankName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [bankAccountHolder, setBankAccountHolder] = useState("")
  const [savingBank, setSavingBank] = useState(false)
  const [bankSuccess, setBankSuccess] = useState(false)

  // Copy template state
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null)

  if (
    property === undefined ||
    tenants === undefined ||
    rooms === undefined ||
    occupiedWithoutTenant === undefined ||
    badges === undefined
  ) {
    return (
      <PageLoader
        variant="inline"
        message="Memuat data penghuni…"
        submessage="Mengambil daftar penyewa dan status kamar"
      />
    )
  }

  if (!property) return null

  // Rooms that can have a new tenant added:
  const activeTenantRoomIds = new Set(
    tenants.filter((t) => t.status === "active").map((t) => t.roomId)
  )
  const roomsReadyForTenant = rooms.filter(
    (r) => !activeTenantRoomIds.has(r._id)
  )

  const activeTenants = tenants.filter((t) => t.status === "active")

  // Generate WhatsApp Invoice Template
  const getTenantInvoiceText = (tenant: typeof activeTenants[0]) => {
    const rent = tenant.roomRent ? tenant.roomRent.toLocaleString("id-ID") : "-"
    const bankInfo = property.bankAccountNumber
      ? `Bank: ${property.bankName || "Transfer Bank"}\nNo. Rekening: ${property.bankAccountNumber}\nAtas Nama: ${property.bankAccountHolder || "-"}`
      : "Silakan konfirmasi ke pemilik kos untuk nomor rekening pembayaran."
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.botkos.online"
    const payUrl = `${origin}/${property.slug}/bayar`

    return (
      `Halo Kak ${tenant.name}, berikut info tagihan sewa Kamar ${tenant.roomNumber} di ${property.name}:\n\n` +
      `💰 *Nominal Sewa:* Rp ${rent}\n` +
      `📅 *Jatuh Tempo:* Setiap tanggal ${tenant.dueDay}\n\n` +
      `🏦 *Rekening Pembayaran:*\n${bankInfo}\n\n` +
      `📎 *Konfirmasi & Upload Bukti Pembayaran:*\n${payUrl}\n\n` +
      `Terima kasih! 🙏`
    )
  }

  const handleCopyInvoice = (tenant: typeof activeTenants[0]) => {
    const text = getTenantInvoiceText(tenant)
    void navigator.clipboard.writeText(text)
    setCopiedTenantId(tenant._id)
    setTimeout(() => setCopiedTenantId(null), 2500)
  }

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBank(true)
    setBankSuccess(false)
    try {
      await updateBankDetails({
        propertyId: id,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      })
      setBankSuccess(true)
      setTimeout(() => {
        setBankSuccess(false)
        setShowBankModal(false)
      }, 1200)
    } finally {
      setSavingBank(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header with Action Buttons ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
            Daftar Penghuni
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)] sm:text-sm">
            {activeTenants.length} penghuni aktif dari total {rooms.length} kamar
          </p>
        </div>

        {/* Action Buttons: Bank Account & Add Tenant */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bank Account Settings Button */}
          <button
            type="button"
            onClick={() => {
              setBankName(property.bankName || "BCA")
              setBankAccountNumber(property.bankAccountNumber || "")
              setBankAccountHolder(property.bankAccountHolder || "")
              setShowBankModal(true)
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${property.bankAccountNumber
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
          >
            <CreditCard size={15} className={property.bankAccountNumber ? "text-emerald-700" : "text-amber-700"} />
            <span>
              {property.bankAccountNumber
                ? `Rekening: ${property.bankName || "Bank"} ${property.bankAccountNumber}`
                : "Atur Rekening Kos"}
            </span>
          </button>

          {/* Primary CTA: Add Tenant */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoomPicker((prev) => !prev)}
              className="button-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold"
            >
              <UserPlus size={16} />
              <span>+ Tambah Penghuni</span>
              <ChevronDown size={14} className={`transition-transform ${showRoomPicker ? "rotate-180" : ""}`} />
            </button>

            {/* Room Selector Dropdown */}
            {showRoomPicker && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowRoomPicker(false)}
                />
                <div className="absolute right-0 top-full z-40 mt-2 w-full min-w-[280px] sm:w-80 rounded-2xl border border-[var(--line)] bg-[#fffefa] p-3 shadow-xl">
                  <div className="px-2 py-1.5 border-b border-[var(--line)]">
                    <p className="text-xs font-bold text-[var(--ink)]">Pilih Kamar yang Diisi:</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">Pilih nomor kamar untuk memasukkan data penyewa</p>
                  </div>

                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                    {roomsReadyForTenant.length > 0 ? (
                      roomsReadyForTenant.map((room) => {
                        const isOccupiedWithoutData = occupiedWithoutTenant.some(
                          (o) => o.roomId === room._id
                        )
                        return (
                          <Link
                            key={room._id}
                            href={`/dashboard/properties/${id}/kamar/${room._id}/isi-penyewa`}
                            onClick={() => setShowRoomPicker(false)}
                            className="flex items-center justify-between rounded-xl p-2.5 text-xs transition hover:bg-[var(--secondary)]"
                          >
                            <div className="flex items-center gap-2">
                              <DoorOpen size={15} className="text-[var(--wood)]" />
                              <span className="font-semibold text-[var(--ink)]">Kamar {room.roomNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOccupiedWithoutData ? (
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  Sudah Dihuni
                                </span>
                              ) : (
                                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Kosong
                                </span>
                              )}
                              <ArrowRight size={13} className="text-[var(--ink-muted)]" />
                            </div>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-xs font-semibold text-[var(--ink)]">Semua Kamar Sudah Terisi</p>
                        <p className="text-[11px] text-[var(--ink-muted)] mt-1">
                          Tambahkan kamar baru di tab Kamar jika kos memiliki penambahan unit.
                        </p>
                        <Link
                          href={`/dashboard/properties/${id}/kamar`}
                          onClick={() => setShowRoomPicker(false)}
                          className="mt-2 inline-block text-xs font-semibold text-[var(--wood)] underline"
                        >
                          Buka Tab Kamar
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Alert: Bank Account Missing Notice ── */}
      {!property.bankAccountNumber && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
              <CreditCard size={18} />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                Nomor Rekening Kos Belum Diatur
              </h3>
              <p className="mt-0.5 text-xs text-amber-800">
                Atur rekening bank tujuan transfer agar penyewa mengetahui rekening Anda saat membuka link pembayaran dan template pesan tagihan otomatis terisi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBankName("BCA")
                  setBankAccountNumber("")
                  setBankAccountHolder("")
                  setShowBankModal(true)
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100"
              >
                <span>+ Atur Rekening Sekarang</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert: Occupied Rooms Missing Tenant Data ── */}
      {occupiedWithoutTenant.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
              <AlertCircle size={18} />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                {occupiedWithoutTenant.length} Kamar Berstatus Terisi Belum Ada Data Penyewa
              </h3>
              <p className="mt-0.5 text-xs text-amber-800">
                Lengkapi nama & nomor WhatsApp penyewa agar bot dapat mulai mengirimkan tagihan otomatis.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {occupiedWithoutTenant.map((room) => (
                  <Link
                    key={room.roomId}
                    href={`/dashboard/properties/${id}/kamar/${room.roomId}/isi-penyewa`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                  >
                    <span>+ Isi Data Kamar {room.roomNumber}</span>
                    <ArrowRight size={12} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Tenants List ── */}
      {activeTenants.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {activeTenants.map((tenant) => {
            const waNumber = tenant.phone ? tenant.phone.replace(/\D/g, "") : null
            const isCopied = copiedTenantId === tenant._id

            return (
              <article
                key={tenant._id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-5 shadow-sm transition hover:border-[var(--wood)]/40 hover:shadow-md"
              >
                <div>
                  {/* Top: Room & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--wood)]/10 px-2.5 py-1 text-xs font-bold text-[var(--wood)]">
                      <DoorOpen size={13} />
                      <span>Kamar {tenant.roomNumber}</span>
                    </span>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      Aktif
                    </span>
                  </div>

                  {/* Tenant Name & Details */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-[var(--ink)]">
                      {tenant.name}
                    </h3>

                    {/* Phone Number */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                      <Phone size={13} className="shrink-0 text-[var(--wood)]" />
                      {tenant.phone ? (
                        <span>{tenant.phone}</span>
                      ) : (
                        <span className="text-amber-700 italic">Belum ada nomor HP</span>
                      )}
                    </div>

                    {/* Rent Due Date & Amount */}
                    <div className="mt-2.5 rounded-xl bg-stone-50 border border-stone-200/60 p-2.5 text-xs">
                      <div className="flex justify-between items-center text-[var(--ink-muted)]">
                        <span>Jatuh Tempo:</span>
                        <strong className="text-[var(--ink)]">Setiap Tgl {tenant.dueDay}</strong>
                      </div>
                      <div className="mt-1 flex justify-between items-center text-[var(--ink-muted)]">
                        <span>Harga Sewa:</span>
                        <strong className="font-mono text-[var(--wood)]">
                          Rp {tenant.roomRent ? tenant.roomRent.toLocaleString("id-ID") : "-"}
                        </strong>
                      </div>
                    </div>

                    {/* Quick WhatsApp Template Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyInvoice(tenant)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--wood)] hover:bg-[#fff9ed]"
                        title="Salin template tagihan WhatsApp"
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Tagihan Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} className="text-[var(--ink-muted)]" />
                            <span>Salin Tagihan</span>
                          </>
                        )}
                      </button>

                      {waNumber ? (
                        <a
                          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(getTenantInvoiceText(tenant))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-xs"
                          title="Buka chat WhatsApp dengan template tagihan"
                        >
                          <MessageCircle size={14} />
                          <span>Kirim WA</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-end">
                  <Link
                    href={`/dashboard/tenants/${tenant._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wood)] hover:underline"
                  >
                    <span>Detail & Riwayat Tagihan</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[#fffefa] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wood)]/10 text-[var(--wood)]">
            <Users size={28} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">
            Belum Ada Data Penghuni
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--ink-muted)] sm:text-sm">
            Jika kamar kos Anda saat ini sudah ada penghuninya, masukkan data mereka sekarang.
            BotKos akan otomatis menjadwalkan pengingat jatuh tempo dan memfasilitasi link pembayaran via bot WhatsApp / Telegram.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowRoomPicker(true)}
              className="button-primary inline-flex min-h-11 items-center gap-2 px-6 text-xs font-semibold sm:text-sm"
            >
              <UserPlus size={16} />
              <span>+ Masukkan Data Penghuni Pertama</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Sub-Section: Pengajuan Sewa & Sengketa (Collapsible) ── */}
      <section className="mt-10 rounded-2xl border border-[var(--line)] bg-[#fffefa] p-4 sm:p-6 shadow-sm">
        <div
          className="flex cursor-pointer items-center justify-between select-none"
          onClick={() => setShowApplications((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-[var(--wood)]">
              <FileText size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--ink)] sm:text-base">
                  Pengajuan Sewa & Sengketa
                </h3>
                {badges.applicationsOpen > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {badges.applicationsOpen} Pengajuan Baru
                  </span>
                )}
                {badges.disputesOpen > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {badges.disputesOpen} Sengketa
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ink-muted)]">
                Calon penyewa yang mendaftar lewat web publik kos dan sanggahan catatan pembayaran
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-stone-100"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${showApplications ? "rotate-180" : ""
                }`}
            />
          </button>
        </div>

        {/* Content expanded */}
        {showApplications && (
          <div className="mt-6 space-y-6 border-t border-[var(--line)] pt-6">
            <RentalApplicationsSection propertyId={id} />
            <OwnerDisputesSection propertyId={id} />
          </div>
        )}
      </section>

      {/* ── Modal: Atur Rekening Kos ── */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-[var(--line)] bg-[#FFFFFF] p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--wood)]/10 text-[var(--wood)]">
                  <CreditCard size={18} />
                </span>
                <h3 className="text-base font-bold text-[var(--ink)]">
                  Pengaturan Rekening Pembayaran
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-stone-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveBank(e)} className="mt-5 space-y-4">
              <p className="text-xs leading-5 text-[var(--ink-muted)]">
                Rekening ini akan ditampilkan ke penyewa pada halaman pembayaran sewa dan otomatis disertakan pada pesan tagihan WhatsApp.
              </p>

              <div>
                <label htmlFor="bankName" className="block text-xs font-bold uppercase text-[var(--ink-muted)]">
                  Nama Bank / E-Wallet <span className="text-red-500">*</span>
                </label>
                <input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  placeholder="Contoh: BCA / Mandiri / BRI / SeaBank"
                  className="field-input mt-1.5 w-full"
                  disabled={savingBank}
                />
              </div>

              <div>
                <label htmlFor="bankAccountNumber" className="block text-xs font-bold uppercase text-[var(--ink-muted)]">
                  Nomor Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  required
                  placeholder="Contoh: 1234567890"
                  className="field-input mt-1.5 w-full font-mono font-semibold"
                  disabled={savingBank}
                />
              </div>

              <div>
                <label htmlFor="bankAccountHolder" className="block text-xs font-bold uppercase text-[var(--ink-muted)]">
                  Nama Pemilik Rekening (Atas Nama) <span className="text-red-500">*</span>
                </label>
                <input
                  id="bankAccountHolder"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  required
                  placeholder="Contoh: Handika Diaz"
                  className="field-input mt-1.5 w-full"
                  disabled={savingBank}
                />
              </div>

              {bankSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Rekening pembayaran berhasil disimpan!</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  disabled={savingBank}
                  className="button-secondary flex-1 justify-center py-2.5 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="button-primary flex-1 justify-center py-2.5 text-xs font-semibold disabled:opacity-60"
                >
                  {savingBank ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[var(--wood)]" />
                      <span>Menyimpan…</span>
                    </>
                  ) : (
                    <span>Simpan Rekening</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
