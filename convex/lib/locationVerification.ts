export const PASS_DISTANCE_M = 100
export const REVIEW_DISTANCE_M = 300
export const MAX_ACCURACY_M = 75
export const MAX_UPLOAD_AGE_MS = 10 * 60 * 1000
export const MAX_ATTEMPTS_PER_HOUR = 10
export const MIN_PASSING_CAPTURES = 2

export type LocationPoint = {
  lat: number
  lng: number
}

export type CaptureKind = "front" | "street" | "room"
export type CaptureStatus = "passed" | "needs_review" | "rejected"
export type VerificationStatus = "unverified" | "pending_review" | "verified"
export type CaptureReason =
  "akurasi_rendah" | "jarak_di_luar_toleransi" | "terlalu_jauh"

const EARTH_RADIUS_M = 6_371_000
const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180

export const haversineMeters = (a: LocationPoint, b: LocationPoint) => {
  const latitudeDelta = degreesToRadians(b.lat - a.lat)
  const longitudeDelta = degreesToRadians(b.lng - a.lng)
  const aTerm =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(degreesToRadians(a.lat)) *
      Math.cos(degreesToRadians(b.lat)) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm))
}

export const evaluateCapture = ({
  pin,
  point,
  accuracyM,
}: {
  pin: LocationPoint
  point: LocationPoint
  accuracyM: number
}): { status: CaptureStatus; reason?: CaptureReason; distanceM: number } => {
  const distanceM = haversineMeters(pin, point)

  if (accuracyM > MAX_ACCURACY_M) {
    return { status: "rejected", reason: "akurasi_rendah", distanceM }
  }
  if (distanceM <= PASS_DISTANCE_M) return { status: "passed", distanceM }
  if (distanceM <= REVIEW_DISTANCE_M) {
    return {
      status: "needs_review",
      reason: "jarak_di_luar_toleransi",
      distanceM,
    }
  }
  return { status: "rejected", reason: "terlalu_jauh", distanceM }
}

export const deriveVerificationStatus = (
  captures: Array<{
    kind: CaptureKind
    status: CaptureStatus
    supersededAt?: number
  }>
): VerificationStatus => {
  const activeCaptures = captures.filter(
    (capture) => capture.supersededAt === undefined
  )
  const passedCaptures = activeCaptures.filter(
    (capture) => capture.status === "passed"
  )
  const hasFrontCapture = passedCaptures.some(
    (capture) => capture.kind === "front"
  )

  if (passedCaptures.length >= MIN_PASSING_CAPTURES && hasFrontCapture)
    return "verified"
  if (activeCaptures.some((capture) => capture.status === "needs_review"))
    return "pending_review"
  return "unverified"
}

export const ownerReasonMessage = (reason?: CaptureReason) => {
  switch (reason) {
    case "akurasi_rendah":
      return "Akurasi GPS terlalu rendah. Aktifkan lokasi presisi dan ambil foto ulang di area terbuka."
    case "jarak_di_luar_toleransi":
      return "Lokasi foto berada di luar toleransi otomatis dan perlu ditinjau. Ambil ulang lebih dekat ke pin properti bila memungkinkan."
    case "terlalu_jauh":
      return "Lokasi foto terlalu jauh dari pin properti. Datang ke lokasi kos lalu ambil foto ulang."
    default:
      return undefined
  }
}
