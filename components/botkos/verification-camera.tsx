"use client"

import { Camera, RefreshCw, Send, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import {
  canSubmitPreview,
  getCameraErrorMessage,
  getGeolocationErrorMessage,
  getResizeDimensions,
  getServerResultMessage,
  isGpsFixUsable,
  transitionCameraState,
  type CameraState,
  type GpsFix,
} from "./location-verification-helpers"

type VerificationCameraProps = {
  propertyId: Id<"properties">
  kind: "front" | "street" | "room"
  onClose: () => void
}

type Preview = { blob: Blob; url: string; fix: GpsFix; capturedAt: number }

export const VerificationCamera = ({
  propertyId,
  kind,
  onClose,
}: VerificationCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const previewRef = useRef<Preview | null>(null)
  const [state, setState] = useState<CameraState>("idle")
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ title: string; body: string } | null>(
    null
  )
  const generateUploadUrl = useMutation(
    api.locationVerification.generateVerificationUploadUrl
  )
  const submitLocationCapture = useMutation(
    api.locationVerification.submitLocationCapture
  )

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (watchIdRef.current !== null)
      navigator.geolocation?.clearWatch(watchIdRef.current)
    watchIdRef.current = null
  }, [])

  const discardPreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url)
    previewRef.current = null
    setPreview(null)
  }, [])

  const start = useCallback(async () => {
    release()
    discardPreview()
    setError(null)
    setResult(null)
    setGpsFix(null)
    setState(transitionCameraState("idle", "open"))
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Kamera hanya dapat digunakan melalui koneksi aman (HTTPS) pada browser yang mendukungnya."
      )
      setState("error")
      return
    }
    if (!navigator.geolocation) {
      setError(
        "Browser ini tidak mendukung lokasi. Gunakan browser lain yang mengizinkan GPS."
      )
      setState("error")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) =>
          setGpsFix({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            capturedAt: Date.now(),
          }),
        (positionError) => {
          setError(getGeolocationErrorMessage(positionError.code))
          setState("error")
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
      )
      setState("ready")
    } catch (reason) {
      setError(getCameraErrorMessage(reason instanceof Error ? reason : {}))
      setState("error")
    }
  }, [discardPreview, release])

  useEffect(() => {
    void start()
    const onVisibilityChange = () => {
      if (document.hidden) release()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      release()
      discardPreview()
    }
  }, [discardPreview, release, start])

  const capture = async () => {
    if (!videoRef.current || !isGpsFixUsable(gpsFix, Date.now())) return
    const video = videoRef.current
    const dimensions = getResizeDimensions(
      video.videoWidth,
      video.videoHeight,
      1600
    )
    const canvas = document.createElement("canvas")
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext("2d")
    if (!context) {
      setError("Foto belum dapat diproses. Coba ambil ulang.")
      return
    }
    context.drawImage(video, 0, 0, dimensions.width, dimensions.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    )
    if (!blob || !gpsFix) {
      setError("Foto belum dapat diproses. Coba ambil ulang.")
      return
    }
    const nextPreview = {
      blob,
      url: URL.createObjectURL(blob),
      fix: gpsFix,
      capturedAt: Date.now(),
    }
    previewRef.current = nextPreview
    setPreview(nextPreview)
    setState(transitionCameraState("ready", "capture"))
  }

  const retry = () => {
    discardPreview()
    setError(null)
    setResult(null)
    if (streamRef.current) setState("ready")
    else void start()
  }

  const submit = async () => {
    if (!preview || !canSubmitPreview(state, preview.capturedAt, Date.now())) {
      setError(
        "Pratinjau sudah lebih dari 60 detik. Ambil foto ulang sebelum mengirim."
      )
      return
    }
    setState(transitionCameraState("preview", "submit"))
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl({ propertyId })
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": "image/jpeg" },
        body: preview.blob,
      })
      if (!response.ok)
        throw new Error(
          "Koneksi gagal saat mengunggah foto. Coba kirim lagi sebelum pratinjau kedaluwarsa."
        )
      const uploaded = (await response.json()) as { storageId: Id<"_storage"> }
      const submission = await submitLocationCapture({
        propertyId,
        kind,
        storageId: uploaded.storageId,
        lat: preview.fix.lat,
        lng: preview.fix.lng,
        accuracyM: preview.fix.accuracyM,
        clientCapturedAt: preview.capturedAt,
      })
      setResult(getServerResultMessage(submission))
      setState(transitionCameraState("submitting", "success"))
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Foto belum dapat dikirim. Periksa koneksi lalu coba lagi."
      )
      setState(transitionCameraState("submitting", "fail"))
    }
  }

  const gpsStatus = !gpsFix
    ? "Menunggu GPS"
    : isGpsFixUsable(gpsFix, Date.now())
      ? "Akurasi baik"
      : "Akurasi terlalu rendah"

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ambil foto verifikasi lokasi"
    >
      <div className="mx-auto min-h-full max-w-xl bg-[var(--background)] p-4 shadow-2xl sm:min-h-0 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              Ambil foto verifikasi
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Berdiri di tempat terbuka, tunggu sebentar sampai akurasi GPS
              baik.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="add-room-close"
            aria-label="Tutup kamera"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 overflow-hidden bg-black">
          {preview ? (
            <img
              src={preview.url}
              alt="Pratinjau foto verifikasi"
              className="aspect-[4/3] w-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[4/3] w-full object-cover"
            />
          )}
        </div>
        <div className="mt-3 border border-[var(--line)] bg-white p-3 text-sm">
          <p className="font-semibold text-[var(--ink)]">{gpsStatus}</p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            {gpsFix
              ? `Akurasi GPS ±${Math.round(gpsFix.accuracyM)} m`
              : "Mencari sinyal lokasi perangkat…"}
          </p>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-[var(--warn)]">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="mt-3 border border-[var(--sage)] bg-[#eff8f0] p-3 text-sm">
            <p className="font-semibold text-[var(--sage)]">{result.title}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink)]">
              {result.body}
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {state === "preview" ? (
            <>
              <button
                type="button"
                onClick={retry}
                className="button-secondary justify-center text-sm"
              >
                <RefreshCw size={15} /> Ulangi
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                className="button-primary justify-center text-sm"
              >
                <Send size={15} /> Kirim
              </button>
            </>
          ) : null}
          {state === "ready" ? (
            <button
              type="button"
              onClick={() => void capture()}
              disabled={!isGpsFixUsable(gpsFix, Date.now())}
              className="button-primary justify-center text-sm"
            >
              <Camera size={16} /> Ambil foto
            </button>
          ) : null}
          {state === "error" || state === "result" ? (
            <button
              type="button"
              onClick={retry}
              className="button-primary justify-center text-sm"
            >
              <RefreshCw size={15} />{" "}
              {state === "result" ? "Ambil foto lain" : "Coba lagi"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
