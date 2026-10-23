import { describe, expect, test } from "vitest"
import {
  canSubmitPreview,
  getCameraErrorMessage,
  getGeolocationErrorMessage,
  getResizeDimensions,
  getServerResultMessage,
  isGpsFixUsable,
  transitionCameraState,
} from "../components/botkos/location-verification-helpers"

describe("location verification UI helpers", () => {
  test("resizes photos without enlarging small images or changing their ratio", () => {
    expect(getResizeDimensions(3200, 1600, 1600)).toEqual({
      width: 1600,
      height: 800,
    })
    expect(getResizeDimensions(800, 600, 1600)).toEqual({
      width: 800,
      height: 600,
    })
    expect(getResizeDimensions(1000, 3000, 1600)).toEqual({
      width: 533,
      height: 1600,
    })
  })

  test("accepts only fresh GPS fixes at or below the server accuracy limit", () => {
    const now = 1_000_000
    expect(
      isGpsFixUsable({ accuracyM: 75, capturedAt: now - 5_000 }, now)
    ).toBe(true)
    expect(
      isGpsFixUsable({ accuracyM: 75.1, capturedAt: now - 5_000 }, now)
    ).toBe(false)
    expect(
      isGpsFixUsable({ accuracyM: 10, capturedAt: now - 5_001 }, now)
    ).toBe(false)
  })

  test("maps browser failures to actionable Indonesian messages", () => {
    expect(getGeolocationErrorMessage(1)).toContain("izin lokasi")
    expect(getGeolocationErrorMessage(3)).toContain("Waktu")
    expect(getCameraErrorMessage({ name: "NotAllowedError" })).toContain(
      "izin kamera"
    )
    expect(getCameraErrorMessage({ name: "NotFoundError" })).toContain("Kamera")
  })

  test("only permits valid camera flow transitions and fresh previews", () => {
    expect(transitionCameraState("idle", "submit")).toBe("idle")
    expect(transitionCameraState("idle", "open")).toBe("requesting")
    expect(transitionCameraState("requesting", "ready")).toBe("ready")
    expect(transitionCameraState("ready", "capture")).toBe("preview")
    expect(canSubmitPreview("preview", 1_000, 60_999)).toBe(true)
    expect(canSubmitPreview("preview", 1_000, 61_000)).toBe(false)
  })

  test("maps server capture outcomes into UI copy", () => {
    expect(
      getServerResultMessage({ status: "passed", distanceM: 20 })
    ).toMatchObject({ title: "Foto diterima" })
    expect(
      getServerResultMessage({ status: "needs_review", distanceM: 150 })
    ).toMatchObject({ title: "Perlu ditinjau" })
    expect(
      getServerResultMessage({
        status: "rejected",
        reason: "Terlalu jauh",
        distanceM: 350,
      }).body
    ).toContain("Terlalu jauh")
  })
})
