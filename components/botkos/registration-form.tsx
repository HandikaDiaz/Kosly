"use client"

import { ArrowUpRight, CheckCircle2, Info, Lock, ShieldCheck } from "lucide-react"
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
}

export function RegistrationForm({
  propertyName,
  slug,
  rooms,
}: RegistrationFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    rooms.length > 0 ? rooms[0]._id : ""
  )
  const [paymentType, setPaymentType] = useState<"dp" | "full">("dp")
  const [amount, setAmount] = useState<string>("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generateUploadUrl = useMutation(api.publicRegistration.generateUploadUrl)
  const createSubmission = useMutation(api.publicRegistration.createSubmission)

  const selectedRoom = rooms.find((r) => r._id === selectedRoomId)

  // ── Auto-fill transfer amount when room or payment type changes ──────────────
  useEffect(() => {
    if (!selectedRoom) return
    if (paymentType === "dp") {
      const dpNominal =
        selectedRoom.dpAmount ??
        selectedRoom.depositFee ??
        Math.round(selectedRoom.monthlyRent * 0.3)
      setAmount(String(dpNominal))
    } else {
      setAmount(String(selectedRoom.monthlyRent))
    }
  }, [selectedRoomId, paymentType, selectedRoom])

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
    return (
      <div className="border border-[var(--line)] bg-[#fffefa] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wood)]/10 text-[var(--wood)]">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Pendaftaran Berhasil Dikirim
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          Bukti pembayaran dan data Anda telah kami teruskan ke pemilik{" "}
          <strong className="text-[var(--ink)]">{propertyName}</strong>.
          Pemilik akan mengonfirmasi pembayaran Anda secara manual.
        </p>
        <div className="mt-6 border border-[var(--line)] bg-[var(--background)] p-4 text-xs text-[var(--ink-muted)]">
          Simpan tangkapan layar ini sebagai tanda pendaftaran sementara.
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-6 border border-[var(--line)] bg-[#fffefa] p-6 sm:p-8"
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

      {/* ── 3. Kamar yang diminati (Dropdown & RoomDetailCard) ── */}
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
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="field-input font-medium"
          required
        >
          <option value="">-- Pilih Kamar --</option>
          {rooms.map((room) => (
            <option value={room._id} key={room._id}>
              Kamar {room.roomNumber} — Rp{" "}
              {room.monthlyRent.toLocaleString("id-ID")}/bulan
            </option>
          ))}
        </select>

        {/* Selected Room Detailed Presentation */}
        {selectedRoom && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-[var(--ink-muted)]">
              Detail Kamar Terpilih:
            </p>
            <RoomDetailCard room={selectedRoom} />
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
        <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
          Terisi otomatis sesuai{" "}
          <strong>
            {paymentType === "dp" ? "DP booking" : "harga sewa"}
          </strong>{" "}
          kamar ini, bisa diubah jika perlu.
        </p>
        {paymentType === "full" && (
          <p className="mt-1 text-[11px] text-[var(--ink-muted)] italic">
            * Asumsi sewa bulanan. Jika menyewa tahunan, Anda dapat menyesuaikan
            nominal transfer secara manual.
          </p>
        )}
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
