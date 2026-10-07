import { expect, test } from "vitest"
import {
  buildReviewMessage,
  buildStatusMessage,
  buildUnpaidMessage,
  buildVacantMessage,
  type StatusOverviewData,
} from "./formatters"

test("buildStatusMessage - Single Property with pending items", () => {
  const data: StatusOverviewData = {
    properties: [
      {
        id: "prop1",
        name: "Kos Aziza",
        activeTenantsCount: 2,
        pendingCount: 1,
        vacantCount: 0,
        vacantRooms: [],
        totalRooms: 2,
      },
    ],
  }

  const waMsg = buildStatusMessage(data, "whatsapp", 1000)
  expect(waMsg).toContain("Kos Aziza")
  expect(waMsg).toContain("*1 item*")
  expect(waMsg).toContain("menunggu verifikasi Anda")

  const tgMsg = buildStatusMessage(data, "telegram", 1000)
  expect(tgMsg).toContain("<b>1 item</b>")
})

test("buildStatusMessage - Single Property with vacant rooms", () => {
  const data: StatusOverviewData = {
    properties: [
      {
        id: "prop1",
        name: "Kos Aziza",
        activeTenantsCount: 2,
        pendingCount: 0,
        vacantCount: 1,
        vacantRooms: [{ roomNumber: "101", monthlyRent: 1500000 }],
        totalRooms: 3,
      },
    ],
  }

  const waMsg = buildStatusMessage(data, "whatsapp", 1000)
  expect(waMsg).toContain("Kos Aziza")
  expect(waMsg).toContain("1 kamar")
  expect(waMsg).toContain("kesempatan untuk segera dicarikan penyewa baru")
})

test("buildStatusMessage - Single Property all normal", () => {
  const data: StatusOverviewData = {
    properties: [
      {
        id: "prop1",
        name: "Kos Aziza",
        activeTenantsCount: 2,
        pendingCount: 0,
        vacantCount: 0,
        vacantRooms: [],
        totalRooms: 2,
      },
    ],
  }

  const waMsg = buildStatusMessage(data, "whatsapp", 1000)
  expect(waMsg).toContain("Kos Aziza")
  expect(waMsg).toContain("Seluruh kamar terisi")
  expect(waMsg).toContain("*2 tenant aktif*")
})

test("buildStatusMessage - Multi-property sorting priorities", () => {
  const data: StatusOverviewData = {
    properties: [
      {
        id: "prop1",
        name: "Kos Aman",
        activeTenantsCount: 5,
        pendingCount: 0,
        vacantCount: 0,
        vacantRooms: [],
        totalRooms: 5,
      },
      {
        id: "prop2",
        name: "Kos Perhatian",
        activeTenantsCount: 2,
        pendingCount: 2,
        vacantCount: 0,
        vacantRooms: [],
        totalRooms: 2,
      },
      {
        id: "prop3",
        name: "Kos Ada Kosong",
        activeTenantsCount: 3,
        pendingCount: 0,
        vacantCount: 1,
        vacantRooms: [{ roomNumber: "02", monthlyRent: 1000000 }],
        totalRooms: 4,
      },
    ],
  }

  const msg = buildStatusMessage(data, "whatsapp", 2000)
  const posPerhatian = msg.indexOf("Kos Perhatian")
  const posAdaKosong = msg.indexOf("Kos Ada Kosong")
  const posAman = msg.indexOf("Kos Aman")

  expect(posPerhatian).toBeLessThan(posAdaKosong)
  expect(posAdaKosong).toBeLessThan(posAman)
})

test("buildUnpaidMessage - empty vs items", () => {
  const emptyMsgSeed1 = buildUnpaidMessage([], "whatsapp", 0)
  expect(emptyMsgSeed1).toContain("Tidak ada tenant yang menunggak")

  const emptyMsgSeed2 = buildUnpaidMessage([], "whatsapp", 1000)
  expect(emptyMsgSeed2).toContain("lunas tepat waktu")

  const filledMsg = buildUnpaidMessage(
    [
      {
        tenantName: "Budi",
        propertyName: "Kos Aziza",
        roomNumber: "02",
        period: "2026-10",
        amount: 1500000,
        dueDate: Date.now(),
      },
    ],
    "whatsapp",
    1000
  )
  expect(filledMsg).toContain("Budi")
  expect(filledMsg).toContain("Kos Aziza - K.02")
  expect(filledMsg).toContain("1.500.000")
})

test("buildVacantMessage - empty vs items", () => {
  const emptyMsgSeed1 = buildVacantMessage([], "whatsapp", 0)
  expect(emptyMsgSeed1).toContain("terisi penuh")

  const emptyMsgSeed2 = buildVacantMessage([], "whatsapp", 1000)
  expect(emptyMsgSeed2).toContain("Okupansi 100%")

  const filledMsg = buildVacantMessage(
    [
      {
        propertyName: "Kos Aziza",
        roomNumber: "102",
        monthlyRent: 1200000,
      },
    ],
    "whatsapp",
    1000
  )
  expect(filledMsg).toContain("Kos Aziza")
  expect(filledMsg).toContain("Kamar 102")
  expect(filledMsg).toContain("1.200.000")
})

test("buildReviewMessage - Telegram vs WhatsApp", () => {
  const summary = {
    propertyName: "Kos Aziza",
    roomNumber: "101",
    tenantName: "Siti",
    amount: "Rp 1.500.000",
    reference: "KSL-TEST123",
  }

  const wa = buildReviewMessage(summary, "whatsapp")
  expect(wa.text).toContain("*Kos Aziza*")
  expect(wa.text).toContain("KONFIRMASI KSL-TEST123")

  const tg = buildReviewMessage(summary, "telegram")
  expect(tg.text).toContain("<b>Kos Aziza</b>")
  expect(tg.parseMode).toBe("HTML")
})
