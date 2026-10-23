"use client"

import { Crosshair, MapPin, Save } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"

type Point = { lat: number; lng: number }

type LocationPinPickerProps = {
  propertyId: Id<"properties">
  address: string
  pin?: Point
  hasCaptures: boolean
}

const defaultCenter: Point = { lat: -2.5489, lng: 118.0149 }

export const LocationPinPicker = ({
  propertyId,
  address,
  pin,
  hasCaptures,
}: LocationPinPickerProps) => {
  const mapElementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const markerRef = useRef<import("leaflet").Marker | null>(null)
  const [candidate, setCandidate] = useState<Point | null>(pin ?? null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const setPropertyPin = useMutation(api.locationVerification.setPropertyPin)

  useEffect(() => {
    let disposed = false
    const initializeMap = async () => {
      if (!mapElementRef.current || mapRef.current) return
      const leaflet = await import("leaflet")
      if (disposed || !mapElementRef.current) return

      const map = leaflet.map(mapElementRef.current, {
        zoomControl: true,
        attributionControl: true,
      })
      const initialPoint = pin ?? defaultCenter
      map.setView([initialPoint.lat, initialPoint.lng], pin ? 15 : 5)
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        })
        .addTo(map)

      const markerIcon = leaflet.divIcon({
        className: "",
        html: '<span aria-hidden="true" style="display:block;width:24px;height:24px;border-radius:999px;background:#B28236;border:3px solid white;box-shadow:0 1px 5px rgba(0,0,0,.35)"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const updateCandidate = (point: Point) => {
        setCandidate(point)
        if (markerRef.current)
          markerRef.current.setLatLng([point.lat, point.lng])
        else {
          const marker = leaflet.marker([point.lat, point.lng], {
            icon: markerIcon,
            draggable: true,
          })
          marker.on("dragend", () => {
            const next = marker.getLatLng()
            setCandidate({ lat: next.lat, lng: next.lng })
          })
          marker.addTo(map)
          markerRef.current = marker
        }
      }
      if (pin) updateCandidate(pin)
      map.on("click", (event) =>
        updateCandidate({ lat: event.latlng.lat, lng: event.latlng.lng })
      )
      mapRef.current = map
    }
    void initializeMap()

    return () => {
      disposed = true
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  const centerOnDevice = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung lokasi perangkat.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.setView(
          [position.coords.latitude, position.coords.longitude],
          16
        )
      },
      () =>
        setError(
          "Lokasi perangkat belum dapat dibaca. Periksa izin lokasi browser."
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    )
  }

  const save = async () => {
    if (!candidate) {
      setError("Ketuk peta untuk menempatkan pin lokasi kos.")
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await setPropertyPin({ propertyId, ...candidate })
      setNotice("Lokasi pin berhasil disimpan.")
      setConfirmingReset(false)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Lokasi pin belum dapat disimpan."
      )
    } finally {
      setSaving(false)
    }
  }

  const requestSave = () => {
    const pinChanged =
      candidate && (candidate.lat !== pin?.lat || candidate.lng !== pin?.lng)
    if (hasCaptures && pinChanged) {
      setConfirmingReset(true)
      return
    }
    void save()
  }

  return (
    <div className="border border-[var(--line)] bg-white p-4">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 shrink-0 text-[var(--wood)]" size={19} />
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            Pin lokasi kos
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
            Rujukan alamat: {address}. Ketuk peta atau geser penanda ke lokasi
            kos, lalu simpan.
          </p>
        </div>
      </div>
      <div
        ref={mapElementRef}
        className="mt-4 h-72 w-full border border-[var(--line)] sm:h-80"
        aria-label="Peta untuk memilih pin lokasi kos"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={centerOnDevice}
          className="button-secondary justify-center text-xs"
        >
          <Crosshair size={15} /> Pusatkan peta ke lokasi saya
        </button>
        <button
          type="button"
          onClick={requestSave}
          disabled={saving || !candidate}
          className="button-primary justify-center text-xs"
        >
          <Save size={15} /> {saving ? "Menyimpan…" : "Simpan lokasi pin"}
        </button>
      </div>
      {candidate ? (
        <p className="mt-3 text-xs text-[var(--ink-muted)]">
          Pin siap disimpan.
        </p>
      ) : (
        <p className="mt-3 text-xs text-[var(--ink-muted)]">
          Belum ada pin. Ketuk peta untuk memilih lokasi.
        </p>
      )}
      {notice ? (
        <p className="mt-3 text-xs text-[var(--sage)]">{notice}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-[var(--warn)]">
          {error}
        </p>
      ) : null}

      {confirmingReset ? (
        <div
          role="alertdialog"
          aria-modal="false"
          className="mt-4 border border-[var(--gold)] bg-[#fff8e8] p-4 text-sm text-[var(--ink)]"
        >
          <p className="font-semibold">Ulangi verifikasi lokasi?</p>
          <p className="mt-1 text-xs leading-5">
            Mengubah pin akan menonaktifkan hasil foto verifikasi lama. Anda
            perlu mengambil foto verifikasi lagi dari awal.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="button-secondary text-xs"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="button-primary text-xs"
            >
              Ubah pin dan ulangi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
