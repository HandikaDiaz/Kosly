"use client"

import { ArrowUpRight, Check, CheckCircle2, Copy, CreditCard, Info, Lock, MessageCircle, ShieldCheck } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { FieldLabel } from "./field-label"
import { RoomDetailCard, type PublicRoom } from "./room-detail-card"
import { ImageUploadField } from "./image-upload-field"

type RegistrationFormProps = {
  propertyName: string
  slug: string
  rooms: PublicRoom[]
  selectedRoomId?: string
  onSelectRoom?: (roomId: string) => void
  applicationCode?: string
  lockedRoomId?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
}

export function RegistrationForm({
  propertyName,
  slug,
  rooms,
  selectedRoomId: externalSelectedRoomId,
  onSelectRoom,
  applicationCode,
  lockedRoomId,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
}: RegistrationFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [internalSelectedRoomId, setInternalSelectedRoomId] = useState<string>(
    rooms.length > 0 ? rooms[0]._id : ""
  )
  const [paymentType, setPaymentType] = useState<"dp" | "full">("dp")
  const [amount, setAmount] = useState<string>("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedRoomId = externalSelectedRoomId ?? internalSelectedRoomId

  const handleSelectRoom = (id: string) => {
    setInternalSelectedRoomId(id)
    onSelectRoom?.(id)
  }

  const handleCopyAccount = () => {
    if (bankAccountNumber) {
      void navigator.clipboard.writeText(bankAccountNumber)
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2000)
    }
  }

  const handleCopyAmount = () => {
    if (amount) {
      void navigator.clipboard.writeText(amount)
      setCopiedAmount(true)
      setTimeout(() => setCopiedAmount(false), 2000)
    }
  }

  const generateUploadUrl = useMutation(api.publicRegistration.generateUploadUrl)
  const createSubmission = useMutation(api.publicRegistration.createSubmission)

  const selectedRoom = rooms.find((r) => r._id === selectedRoomId)
  const depositAmount = selectedRoom?.depositFee ?? 0
  const dpAmount = selectedRoom?.dpAmount ?? (selectedRoom ? Math.round(selectedRoom.monthlyRent * 0.3) : 0)
  const initialTotal = (selectedRoom?.monthlyRent ?? 0) + depositAmount
  const amountDue = paymentType === "dp" ? dpAmount : initialTotal

  // ── Auto-fill transfer amount when room or payment type changes ──────────────
  useEffect(() => {
    if (!selectedRoom) return
    if (paymentType === "dp") {
      setAmount(String(dpAmount))
    } else {
      setAmount(String(initialTotal))
    }
  }, [selectedRoomId, paymentType, dpAmount, initialTotal, selectedRoom])

  // ── Handle Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      if (!selectedRoom) {
        throw new Error("Pilih kamar yang diminati terlebih dahulu.")
      }

      if (!proofFile) {
        throw new Error("Unggah gambar bukti pembayaran terlebih dahulu.")
      }

      const numAmount = Number(amount || form.get("amount") || 0)
      if (!numAmount || numAmount <= 0) {
        throw new Error("Nominal transfer wajib diisi dan harus lebih dari 0.")
      }

      // Generate storage upload URL
      const uploadUrl = await generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": proofFile.type },
        body: proofFile,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload bukti pembayaran gagal. Silakan coba lagi.")
      }

      const uploaded = (await uploadResponse.json()) as { storageId: string }
      const dueDate = Date.now()

      await createSubmission({
        slug,
        roomId: selectedRoom._id as Id<"rooms">,
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        startedAt: Date.now(),
        dueDate,
        amount: numAmount,
        paymentType,
        deadlineAt:
          paymentType === "dp" && form.get("deadlineAt")
            ? new Date(String(form.get("deadlineAt"))).getTime()
            : undefined,
        proofStorageId: uploaded.storageId as Id<"_storage">,
        applicationCode,
      })

      setSubmitted(true)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Pendaftaran gagal dikirim."
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Success State Display ─────────────────────────────────────────────────
  if (submitted) {
    const botNumber = process.env.NEXT_PUBLIC_BOT_WHATSAPP_NUMBER || "6289674745742"
    const waText = `Halo BotKos, saya sudah mendaftar dan mengunggah bukti pembayaran:\n• Kos: ${propertyName}\n• Kamar: ${selectedRoom?.roomNumber || ""}\n• Nominal: Rp ${Number(amount).toLocaleString("id-ID")}`
    const waUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(waText)}`

    return (
      <div className="border border-[var(--line)] bg-[#FFFFFF] p-8 text-center sm:p-10 rounded-3xl shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink)]">
          Pendaftaran Berhasil Dikirim!
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Bukti pembayaran dan data Anda telah kami teruskan ke pemilik{" "}
          <strong className="text-[var(--ink)]">{propertyName}</strong>.
          Pemilik akan mengonfirmasi pembayaran Anda secara manual.
        </p>

        {/* WhatsApp Card Confirmation */}
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 text-left shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <MessageCircle size={20} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Terima Tanda Terima Otomatis di WhatsApp
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Kirim pesan konfirmasi ke WhatsApp BotKos. Bot kami akan membalas dan mengirimkan salinan bukti transfer Anda sebagai bukti sah pendaftaran.
              </p>
            </div>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            <MessageCircle size={18} />
            <span>Konfirmasi ke WhatsApp Bot</span>
          </a>
        </div>

        <div className="mt-6 border border-[var(--line)] bg-[var(--background)] p-4 text-xs text-[var(--ink-muted)] rounded-xl">
          Simpan tangkapan layar ini sebagai tanda pendaftaran sementara.
        </div>
      </div>
    )
  }

  return (
    <form
      id="form-pendaftaran"
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-6 border border-[var(--line)] bg-[#FFFFFF] p-6 sm:p-8 rounded-2xl shadow-sm"
      noValidate
    >
      {/* ── Section Header ── */}
      <div className="border-b border-[var(--line)] pb-5">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Form Pendaftaran &amp; Booking
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Isi informasi pribadi dan unggah bukti transfer pembayaran Anda.
        </p>
      </div>

      {/* ── 1. Nama Lengkap ── */}
      <div>
        <FieldLabel
          htmlFor="name"
          label="Nama lengkap"
          required
          hint="Isi sesuai nama pada identitas resmi (KTP / SIM / Paspor)."
        />
        <input
          id="name"
          name="name"
          className="field-input"
          required
          placeholder="Contoh: Siti Rahma"
        />
      </div>

      {/* ── 2. Nomor WhatsApp ── */}
      <div>
        <FieldLabel
          htmlFor="phone"
          label="Nomor WhatsApp"
          required
          hint="Nomor aktif WhatsApp untuk menerima konfirmasi dan pemberitahuan sewa dari pemilik kos."
        />
        <input
          id="phone"
          name="phone"
          type="tel"
          className="field-input"
          required
          placeholder="Contoh: 081234567890"
        />
      </div>

      {/* ── 3. Kamar yang diminati (Dropdown & Room Summary) ── */}
      <div>
        <FieldLabel
          htmlFor="roomId"
          label="Kamar yang diminati"
          required
          hint="Pilih salah satu kamar yang masih tersedia di properti ini."
        />
        <select
          id="roomId"
          name="roomId"
          value={selectedRoomId}
          onChange={(e) => handleSelectRoom(e.target.value)}
          disabled={Boolean(lockedRoomId)}
          className="field-input font-medium"
          required
        >
          <option value="">-- Pilih Kamar --</option>
          {rooms.map((room) => (
            <option value={room._id} key={room._id}>
              Kamar {room.roomNumber} - Rp{" "}
              {room.monthlyRent.toLocaleString("id-ID")}/bulan
            </option>
          ))}
        </select>

        {/* Selected Room Summary */}
        {selectedRoom && (
          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[#FCFBF9] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-[var(--ink)]">
                  Kamar {selectedRoom.roomNumber} {selectedRoom.roomType ? `• ${selectedRoom.roomType}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {[
                    selectedRoom.floor ? `Lantai ${selectedRoom.floor}` : null,
                    selectedRoom.sizeSqm ? `${selectedRoom.sizeSqm} m²` : null,
                    selectedRoom.bathroomType === "private"
                      ? "K. Mandi Dalam"
                      : selectedRoom.bathroomType === "shared"
                      ? "K. Mandi Luar"
                      : null,
                    selectedRoom.genderCategory === "male"
                      ? "Putra"
                      : selectedRoom.genderCategory === "female"
                      ? "Putri"
                      : selectedRoom.genderCategory === "mixed"
                      ? "Campur"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-sm font-semibold text-[var(--wood)]">
                  Rp {selectedRoom.monthlyRent.toLocaleString("id-ID")}
                </span>
                <span className="block text-[10px] text-[var(--ink-muted)]">/bulan</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Jenis Pembayaran (DP vs Bayar Lunas) ── */}
      <fieldset className="space-y-2">
        <legend className="block">
          <FieldLabel
            label="Jenis pembayaran"
            required
            hint="Pilih DP Booking jika hanya ingin mengunci kamar terlebih dahulu, atau Bayar Lunas untuk pelunasan sewa."
          />
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            onClick={() => setPaymentType("dp")}
            className={`flex cursor-pointer flex-col justify-between border p-4 transition-all ${
              paymentType === "dp"
                ? "border-[var(--wood)] bg-[#fffdfa] ring-1 ring-[var(--wood)]"
                : "border-[var(--line)] bg-[#fffefa] hover:border-[var(--wood)]/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--ink)]">DP booking</span>
              <input
                type="radio"
                name="paymentType"
                value="dp"
                checked={paymentType === "dp"}
                onChange={() => setPaymentType("dp")}
                className="accent-[var(--wood)]"
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
              Kamar dikunci setelah pemilik menyetujui bukti pembayaran DP.
            </p>
          </label>

          <label
            onClick={() => setPaymentType("full")}
            className={`flex cursor-pointer flex-col justify-between border p-4 transition-all ${
              paymentType === "full"
                ? "border-[var(--wood)] bg-[#fffdfa] ring-1 ring-[var(--wood)]"
                : "border-[var(--line)] bg-[#fffefa] hover:border-[var(--wood)]/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--ink)]">Bayar lunas</span>
              <input
                type="radio"
                name="paymentType"
                value="full"
                checked={paymentType === "full"}
                onChange={() => setPaymentType("full")}
                className="accent-[var(--wood)]"
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
              Kamar menjadi terisi setelah verifikasi manual oleh pemilik.
            </p>
          </label>
        </div>
      </fieldset>

      {/* ── 5. Nominal Transfer (Auto-filled & Editable) ── */}
      <div>
        <FieldLabel
          htmlFor="amount"
          label="Nominal transfer"
          required
          hint="Nominal yang diisi otomatis berdasarkan tarif sewa/DP kamar yang Anda pilih. Anda dapat mengubahnya jika ada kesepakatan khusus."
        />
        <div className="field-input-prefix-wrap">
          <span className="field-input-prefix" aria-hidden="true">
            Rp
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field-input field-input-prefixed font-mono font-semibold"
            required
            placeholder="1500000"
          />
        </div>
        {selectedRoom && paymentType === "full" ? (
          <div className="mt-4 border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
            <div className="flex justify-between gap-4 text-[var(--ink-muted)]"><span>Sewa bulan pertama</span><span className="font-mono text-[var(--ink)]">Rp {selectedRoom.monthlyRent.toLocaleString("id-ID")}</span></div>
            <div className="mt-2 flex justify-between gap-4 text-[var(--ink-muted)]"><span>Deposit</span><span className="font-mono text-[var(--ink)]">Rp {depositAmount.toLocaleString("id-ID")}</span></div>
            <div className="mt-3 flex justify-between gap-4 border-t border-[var(--line)] pt-3 font-semibold text-[var(--ink)]"><span>Total pembayaran pertama</span><span className="font-mono">Rp {amountDue.toLocaleString("id-ID")}</span></div>
          </div>
        ) : selectedRoom ? (
          <div className="mt-4 border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
            <div className="flex justify-between gap-4 text-[var(--ink-muted)]"><span>DP booking</span><span className="font-mono text-[var(--ink)]">Rp {dpAmount.toLocaleString("id-ID")}</span></div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">DP akan dikreditkan ke kewajiban awal saat pelunasan. Deposit ditarik satu kali pada pembayaran pertama.</p>
          </div>
        ) : null}
        <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
          Terisi otomatis sesuai{" "}
          <strong>
            {paymentType === "dp" ? "DP booking" : "sewa dan deposit awal"}
          </strong>{" "}
          kamar ini, bisa diubah jika perlu.
        </p>
      </div>

      {/* ── 6. Batas waktu pelunasan (Only shown when DP booking is selected) ── */}
      {paymentType === "dp" && (
        <div className="border-l-2 border-[var(--wood)] bg-[#fffdfa] p-4">
          <FieldLabel
            htmlFor="deadlineAt"
            label="Batas waktu pelunasan"
            required
            hint="Tentukan perkiraan tanggal & waktu Anda akan melunasi sisa pembayaran kamar ini."
          />
          <input
            id="deadlineAt"
            name="deadlineAt"
            type="datetime-local"
            className="field-input mt-2"
            required={paymentType === "dp"}
          />
        </div>
      )}

      {/* ── Rekening Pembayaran Transfer ── */}
      <div className="rounded-2xl border border-[var(--wood)]/40 bg-[#fffdf8] p-4.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--wood)]/10 text-[var(--wood)]">
            <CreditCard size={15} />
          </span>
          <h3 className="text-sm font-bold text-[var(--ink)]">
            Rekening Tujuan Transfer
          </h3>
        </div>

        {bankAccountNumber ? (
          <div className="mt-3.5 space-y-3">
            <div className="rounded-xl border border-[var(--line)] bg-white p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-muted)]">Bank / Metode</span>
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-[var(--ink)] uppercase">
                  {bankName || "Transfer Bank"}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] text-[var(--ink-muted)]">Nomor Rekening</p>
                  <p className="font-mono text-base font-bold tracking-wider text-[var(--ink)]">
                    {bankAccountNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#fffdfa] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--wood)] hover:bg-[#fff7ea]"
                >
                  {copiedAccount ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="text-[var(--ink-muted)]" />
                      <span>Salin No. Rek</span>
                    </>
                  )}
                </button>
              </div>

              {bankAccountHolder && (
                <div className="mt-2 border-t border-[var(--line)]/60 pt-2 text-xs text-[var(--ink-muted)]">
                  Atas Nama: <strong className="text-[var(--ink)]">{bankAccountHolder}</strong>
                </div>
              )}
            </div>

            {amount ? (
              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white p-3.5">
                <div>
                  <p className="text-[11px] text-[var(--ink-muted)]">Nominal yang Ditransfer</p>
                  <p className="font-mono text-base font-bold text-[var(--wood)]">
                    Rp {Number(amount).toLocaleString("id-ID")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#fffdfa] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--wood)] hover:bg-[#fff7ea]"
                >
                  {copiedAmount ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="text-[var(--ink-muted)]" />
                      <span>Salin Nominal</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}

            <p className="text-[11px] leading-relaxed text-[var(--ink-muted)]">
              💡 <em>Silakan transfer sesuai nominal ke rekening di atas, kemudian unggah bukti transfer di bawah ini.</em>
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
            <p>
              Nomor rekening kos belum diatur di sistem oleh pemilik. Silakan konfirmasi nomor rekening pembayaran kepada pemilik kos sebelum mengunggah bukti transfer.
            </p>
          </div>
        )}
      </div>

      {/* ── 7. Bukti Pembayaran (ImageUploadField with Preview) ── */}
      <div>
        <ImageUploadField
          id="proof"
          name="proof"
          label="Bukti pembayaran"
          hint="Unggah foto/tangkapan layar resi transfer bank atau e-wallet."
          required
          value={proofFile}
          onChange={(file) => setProofFile(file)}
          maxSizeMB={5}
        />
        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
          Bukti pembayaran akan diperiksa manual oleh pemilik kos. BotKos tidak
          mendeteksi mutasi otomatis.
        </p>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          role="alert"
          className="border border-[var(--warn)] bg-red-50/40 p-3 text-sm text-[var(--warn)]"
        >
          {error}
        </div>
      )}

      {/* ── Submit Button ── */}
      <button
        type="submit"
        disabled={loading}
        className="button-primary w-full justify-center py-3.5 text-base font-semibold disabled:opacity-60"
      >
        {loading ? "Mengirim Pendaftaran…" : "Kirim Pendaftaran"}{" "}
        <ArrowUpRight size={18} />
      </button>
    </form>
  )
}
