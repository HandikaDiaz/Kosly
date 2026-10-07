"use client"

import {
  Layers,
  Maximize2,
  Users,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react"

export type PublicRoom = {
  _id: string
  roomNumber: string
  monthlyRent: number
  floor?: string
  roomType?: string
  sizeSqm?: number
  maxOccupants?: number
  genderCategory?: string
  bathroomType?: string
  bathroomFacilities?: string[]
  furnitureElectronics?: string[]
  bedSize?: string
  annualRent?: number
  depositFee?: number
  dpAmount?: number
  electricityStatus?: string
  additionalFees?: string
  description?: string
  media?: { kind: "photo" | "video"; caption?: string; url: string | null }[]
}

interface RoomDetailCardProps {
  room: PublicRoom
  selected?: boolean
  onClick?: () => void
  selectable?: boolean
}

export function RoomDetailCard({
  room,
  selected = false,
  onClick,
  selectable = false,
}: RoomDetailCardProps) {
  // Gender category translation
  const genderText =
    room.genderCategory === "male"
      ? "Pria"
      : room.genderCategory === "female"
      ? "Wanita"
      : room.genderCategory === "mixed"
      ? "Campur"
      : undefined

  // Bathroom translation
  const bathroomText = room.bathroomType
    ? room.bathroomType === "private"
      ? "Kamar mandi dalam"
      : room.bathroomType === "shared"
      ? "Kamar mandi bersama"
      : "Tanpa kamar mandi"
    : undefined

  // Facilities array
  const amenities = [
    bathroomText,
    room.bedSize ? `Kasur ${room.bedSize}` : undefined,
    ...(room.furnitureElectronics ?? []),
    ...(room.bathroomFacilities ?? []),
  ].filter((item): item is string => Boolean(item))

  // Media preview items
  const validMedia = (room.media ?? []).filter((item) => item.url).slice(0, 4)

  // Has specs row
  const hasSpecs =
    Boolean(room.floor) ||
    Boolean(room.sizeSqm) ||
    Boolean(room.maxOccupants) ||
    Boolean(genderText)

  // Electricity translation
  const electricityText = room.electricityStatus
    ? room.electricityStatus === "included"
      ? "Termasuk dalam sewa"
      : room.electricityStatus === "metered"
      ? "Meteran (per pemakaian)"
      : "Terpisah (bayar sendiri)"
    : undefined

  return (
    <article
      onClick={selectable ? onClick : undefined}
      className={`relative border p-5 transition-all ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-[var(--wood)] bg-[#fffdfa] shadow-sm ring-1 ring-[var(--wood)]"
          : "border-[var(--line)] bg-[#fffefa] hover:border-[var(--wood)]/60"
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
              Kamar {room.roomNumber}
            </h3>
            {room.roomType && (
              <span className="border border-[var(--line)] bg-[var(--background)] px-2 py-0.5 font-mono text-xs text-[var(--wood)]">
                {room.roomType}
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-sm font-semibold text-[var(--wood)]">
            Rp {room.monthlyRent.toLocaleString("id-ID")}{" "}
            <span className="font-sans text-xs font-normal text-[var(--ink-muted)]">
              /bulan
            </span>
          </p>
        </div>

        {selectable && (
          <div className="flex items-center">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                selected
                  ? "border-[var(--wood)] bg-[var(--wood)] text-white"
                  : "border-[var(--line)] bg-[var(--background)] text-transparent"
              }`}
            >
              <CheckCircle2 size={16} />
            </span>
          </div>
        )}
      </div>

      {/* ── 1. Spesifikasi (Row of chips with icons) ── */}
      {hasSpecs && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {room.floor && (
            <span className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-[var(--ink)]">
              <Layers size={13} className="text-[var(--wood)] shrink-0" />
              Lantai {room.floor}
            </span>
          )}

          {room.sizeSqm && room.sizeSqm > 0 && (
            <span className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-[var(--ink)]">
              <Maximize2 size={13} className="text-[var(--wood)] shrink-0" />
              {room.sizeSqm} m²
            </span>
          )}

          {room.maxOccupants && room.maxOccupants > 0 && (
            <span className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-[var(--ink)]">
              <Users size={13} className="text-[var(--wood)] shrink-0" />
              Maks. {room.maxOccupants} penghuni
            </span>
          )}

          {genderText && (
            <span className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-[var(--ink)]">
              <UserCheck size={13} className="text-[var(--wood)] shrink-0" />
              {genderText}
            </span>
          )}
        </div>
      )}

      {/* ── 2. Fasilitas (Wrapping badges) ── */}
      {amenities.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium tracking-wider uppercase text-[var(--ink-muted)]">
            Fasilitas
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {amenities.map((item, idx) => (
              <span
                key={`${item}-${idx}`}
                className="inline-flex items-center gap-1 bg-[#f4f2ec] px-2 py-0.5 text-xs text-[var(--ink)]"
              >
                <span className="h-1 w-1 rounded-full bg-[var(--wood)]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Rincian Biaya (Ledger Table style) ── */}
      <div className="mt-4 border border-[var(--line)] bg-[var(--background)] p-3 text-xs">
        <p className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[var(--ink-muted)] border-b border-[var(--line)] pb-1.5">
          Rincian Biaya &amp; Ketentuan
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[var(--ink)]">
            <span>Sewa Bulanan</span>
            <span className="font-mono font-semibold text-[var(--ink)]">
              Rp {room.monthlyRent.toLocaleString("id-ID")}
            </span>
          </div>

          {(room.dpAmount || room.depositFee) && (
            <div className="flex items-center justify-between text-[var(--ink)]">
              <span>DP Booking (Tanda Jadi)</span>
              <span className="font-mono font-semibold text-[var(--wood)]">
                Rp {(room.dpAmount ?? room.depositFee ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {room.annualRent && room.annualRent > 0 && (
            <div className="flex items-center justify-between text-[var(--ink)]">
              <span>Sewa Tahunan</span>
              <span className="font-mono text-[var(--ink-muted)]">
                Rp {room.annualRent.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {room.depositFee && room.depositFee > 0 && (
            <div className="flex items-center justify-between text-[var(--ink)]">
              <span>Deposit Jaminan</span>
              <span className="font-mono text-[var(--ink-muted)]">
                Rp {room.depositFee.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {electricityText && (
            <div className="flex items-center justify-between text-[var(--ink)]">
              <span>Listrik</span>
              <span className="text-[var(--ink-muted)]">{electricityText}</span>
            </div>
          )}

          {room.additionalFees && (
            <div className="flex items-center justify-between text-[var(--ink)]">
              <span>Biaya Tambahan</span>
              <span className="text-[var(--ink-muted)]">{room.additionalFees}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {room.description && (
        <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
          {room.description}
        </p>
      )}

      {/* ── Media gallery preview ── */}
      {validMedia.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {validMedia.map((item, i) =>
            item.kind === "photo" ? (
              <img
                key={i}
                src={item.url ?? ""}
                alt={item.caption ?? `Foto kamar ${room.roomNumber}`}
                className="h-16 w-24 shrink-0 rounded border border-[var(--line)] object-cover"
              />
            ) : (
              <video
                key={i}
                src={item.url ?? ""}
                className="h-16 w-24 shrink-0 rounded border border-[var(--line)] object-cover"
              />
            )
          )}
        </div>
      )}
    </article>
  )
}
