import { MAX_ACCURACY_M } from "../../convex/lib/locationVerification"

export const GPS_FIX_MAX_AGE_MS = 5_000
export const PREVIEW_MAX_AGE_MS = 60_000

export type GpsFix = {
  lat: number
  lng: number
  accuracyM: number
  capturedAt: number
}

export type CameraState =
  | "idle"
  | "requesting"
  | "ready"
  | "preview"
  | "submitting"
  | "result"
  | "error"

export type CameraEvent =
  | "open"
  | "ready"
  | "capture"
  | "submit"
  | "success"
  | "retry"
  | "close"
  | "fail"

export const getResizeDimensions = (
  width: number,
  height: number,
  maxSide: number
) => {
  const largestSide = Math.max(width, height)
  if (largestSide <= maxSide) return { width, height }

  const scale = maxSide / largestSide
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export const isGpsFixUsable = (
  fix: Pick<GpsFix, "accuracyM" | "capturedAt"> | null,
  now: number
) =>
  Boolean(
    fix &&
    Number.isFinite(fix.accuracyM) &&
    fix.accuracyM <= MAX_ACCURACY_M &&
    now - fix.capturedAt <= GPS_FIX_MAX_AGE_MS
  )

export const getGeolocationErrorMessage = (code: number) => {
  switch (code) {
    case 1:
      return "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini melalui pengaturan browser, lalu coba lagi."
    case 2:
      return "Lokasi belum tersedia. Pastikan GPS aktif dan Anda berada di area dengan sinyal yang baik."
    case 3:
      return "Waktu mendapatkan lokasi habis. Berdiri di tempat terbuka lalu coba lagi."
    default:
      return "Lokasi belum dapat dibaca. Periksa pengaturan lokasi perangkat lalu coba lagi."
  }
}

export const getCameraErrorMessage = (error: { name?: string }) => {
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini melalui pengaturan browser, lalu coba lagi."
    case "NotFoundError":
      return "Kamera tidak ditemukan. Pastikan perangkat memiliki kamera yang dapat digunakan."
    case "NotReadableError":
      return "Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi."
    default:
      return "Kamera belum dapat digunakan. Coba tutup dan buka kembali verifikasi lokasi."
  }
}

export const transitionCameraState = (
  state: CameraState,
  event: CameraEvent
): CameraState => {
  const transitions: Partial<
    Record<CameraState, Partial<Record<CameraEvent, CameraState>>>
  > = {
    idle: { open: "requesting" },
    requesting: { ready: "ready", fail: "error", close: "idle" },
    ready: { capture: "preview", fail: "error", close: "idle" },
    preview: { submit: "submitting", retry: "ready", close: "idle" },
    submitting: { success: "result", fail: "preview", close: "idle" },
    result: { retry: "ready", close: "idle" },
    error: { retry: "requesting", close: "idle" },
  }

  return transitions[state]?.[event] ?? state
}

export const canSubmitPreview = (
  state: CameraState,
  capturedAt: number | null,
  now: number
) =>
  state === "preview" &&
  capturedAt !== null &&
  now - capturedAt < PREVIEW_MAX_AGE_MS

export const getServerResultMessage = ({
  status,
  reason,
  distanceM,
}: {
  status: "passed" | "needs_review" | "rejected"
  reason?: string
  distanceM: number
}) => {
  const roundedDistance = Math.round(distanceM)
  if (status === "passed") {
    return {
      title: "Foto diterima",
      body: `Kamu sekitar ${roundedDistance} m dari pin. Lanjutkan dengan foto lain bila masih diperlukan.`,
    }
  }
  if (status === "needs_review") {
    return {
      title: "Perlu ditinjau",
      body:
        reason ??
        `Kamu sekitar ${roundedDistance} m dari pin. Tim akan meninjau foto ini.`,
    }
  }
  return {
    title: "Foto ditolak",
    body:
      reason ??
      `Kamu sekitar ${roundedDistance} m dari pin. Pastikan berada di kos atau perbarui pin bila lokasinya keliru.`,
  }
}
