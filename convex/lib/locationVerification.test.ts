import { describe, expect, test } from "vitest"
import {
  MAX_ACCURACY_M,
  PASS_DISTANCE_M,
  REVIEW_DISTANCE_M,
  deriveVerificationStatus,
  evaluateCapture,
  haversineMeters,
} from "./locationVerification"

describe("location verification", () => {
  test("calculates a known equatorial distance within a small tolerance", () => {
    expect(
      haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 })
    ).toBeCloseTo(111.195, 2)
  })

  test("evaluates distance and accuracy at their exact boundaries", () => {
    const pin = { lat: 0, lng: 0 }
    const pointAt = (distance: number) => ({ lat: distance / 111_195, lng: 0 })

    expect(
      evaluateCapture({
        pin,
        point: pointAt(PASS_DISTANCE_M),
        accuracyM: MAX_ACCURACY_M,
      }).status
    ).toBe("passed")
    expect(
      evaluateCapture({
        pin,
        point: pointAt(PASS_DISTANCE_M + 1),
        accuracyM: MAX_ACCURACY_M,
      }).status
    ).toBe("needs_review")
    expect(
      evaluateCapture({
        pin,
        point: pointAt(REVIEW_DISTANCE_M),
        accuracyM: MAX_ACCURACY_M,
      }).status
    ).toBe("needs_review")
    expect(
      evaluateCapture({
        pin,
        point: pointAt(REVIEW_DISTANCE_M + 1),
        accuracyM: MAX_ACCURACY_M,
      }).status
    ).toBe("rejected")
    expect(
      evaluateCapture({ pin, point: pin, accuracyM: MAX_ACCURACY_M + 0.1 })
    ).toMatchObject({
      status: "rejected",
      reason: "akurasi_rendah",
    })
  })

  test("requires two non-superseded passed captures including a front capture", () => {
    expect(
      deriveVerificationStatus([
        { kind: "street", status: "passed" },
        { kind: "room", status: "passed" },
      ])
    ).toBe("unverified")
    expect(
      deriveVerificationStatus([
        { kind: "front", status: "passed" },
        { kind: "street", status: "passed" },
      ])
    ).toBe("verified")
    expect(
      deriveVerificationStatus([
        { kind: "front", status: "passed", supersededAt: 1 },
        { kind: "street", status: "passed" },
        { kind: "room", status: "needs_review" },
      ])
    ).toBe("pending_review")
  })
})
