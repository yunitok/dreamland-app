import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks hoisted ────────────────────────────────────────────────────────────

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockCheckAllLocationsWeather = vi.hoisted(() => vi.fn())

const mockPrismaIncident = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))
const mockPrismaPaymentRecovery = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
}))
const mockPrismaGroupReservation = vi.hoisted(() => ({
  findMany: vi.fn(),
}))
const mockPrismaWeatherAlert = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))
const mockPrismaReservation = vi.hoisted(() => ({
  findMany: vi.fn(),
}))
const mockPrismaRestaurantLocation = vi.hoisted(() => ({
  findMany: vi.fn(),
}))
const mockPrismaWeatherConfig = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/actions/rbac", () => ({ requirePermission: mockRequirePermission }))
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }))
vi.mock("@/lib/weather", () => ({ checkAllLocationsWeather: mockCheckAllLocationsWeather }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: mockPrismaIncident,
    paymentRecovery: mockPrismaPaymentRecovery,
    groupReservation: mockPrismaGroupReservation,
    weatherAlert: mockPrismaWeatherAlert,
    reservation: mockPrismaReservation,
    restaurantLocation: mockPrismaRestaurantLocation,
    weatherConfig: mockPrismaWeatherConfig,
  },
}))

import {
  getIncidents,
  createIncident,
  resolveIncident,
  updateIncidentStatus,
  getPaymentRecoveries,
  retryPayment,
  getGroupReservations,
  getWeatherAlerts,
  createWeatherAlert,
  updateWeatherAlertStatus,
  resolveWeatherAlert,
  getAffectedReservations,
  getRestaurantLocations,
  getWeatherConfig,
  updateWeatherConfig,
  checkWeatherNow,
} from "@/modules/atc/actions/operations"

import { createMockIncident, createMockWeatherAlert } from "./helpers/mock-factories"

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
  mockPrismaIncident.findMany.mockResolvedValue([])
  mockPrismaIncident.create.mockResolvedValue(createMockIncident({ id: "inc-1" }))
  mockPrismaIncident.update.mockResolvedValue(createMockIncident({ id: "inc-1" }))
  mockPrismaPaymentRecovery.findMany.mockResolvedValue([])
  mockPrismaPaymentRecovery.update.mockResolvedValue({ id: "pay-1", attempts: 2 })
  mockPrismaGroupReservation.findMany.mockResolvedValue([])
  mockPrismaWeatherAlert.findMany.mockResolvedValue([])
  mockPrismaWeatherAlert.create.mockResolvedValue(createMockWeatherAlert({ id: "wa-1" }))
  mockPrismaWeatherAlert.update.mockResolvedValue(createMockWeatherAlert({ id: "wa-1" }))
  mockPrismaReservation.findMany.mockResolvedValue([])
  mockPrismaRestaurantLocation.findMany.mockResolvedValue([])
  mockPrismaWeatherConfig.findUnique.mockResolvedValue({ id: "default" })
  mockPrismaWeatherConfig.create.mockResolvedValue({ id: "default" })
  mockPrismaWeatherConfig.upsert.mockResolvedValue({ id: "default" })
  mockCheckAllLocationsWeather.mockResolvedValue({ forecasts: [], totalAlertsCreated: 0 })
})

// ─── getIncidents ─────────────────────────────────────────────────────────────

describe("getIncidents", () => {
  it("requiere permiso read:atc", async () => {
    await getIncidents()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("sin filtro: findMany llamado sin where y con orderBy correcto", async () => {
    const incidents = [createMockIncident({ id: "inc-1" })]
    mockPrismaIncident.findMany.mockResolvedValue(incidents)

    const result = await getIncidents()

    expect(result).toEqual({ success: true, data: incidents })
    expect(mockPrismaIncident.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    })
  })

  it("con filtro status: where contiene el status", async () => {
    mockPrismaIncident.findMany.mockResolvedValue([])

    await getIncidents("OPEN")

    expect(mockPrismaIncident.findMany).toHaveBeenCalledWith({
      where: { status: "OPEN" },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    })
  })
})

// ─── createIncident ───────────────────────────────────────────────────────────

describe("createIncident", () => {
  const validData = {
    type: "COMPLAINT" as const,
    severity: "MEDIUM" as const,
    description: "Cliente reporta ruido excesivo en el salon principal",
    assignedTo: "Maria Garcia",
  }

  it("requiere permiso manage:atc", async () => {
    await createIncident(validData)
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("datos validos: crea en DB y llama revalidatePath", async () => {
    const incident = createMockIncident({ id: "inc-new" })
    mockPrismaIncident.create.mockResolvedValue(incident)

    const result = await createIncident(validData)

    expect(result).toEqual({ success: true, data: incident })
    expect(mockPrismaIncident.create).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/operations")
  })

  it("Zod invalido (description demasiado corta): retorna {success:false}", async () => {
    const result = await createIncident({ ...validData, description: "Corta" })
    expect(result.success).toBe(false)
  })
})

// ─── resolveIncident ──────────────────────────────────────────────────────────

describe("resolveIncident", () => {
  it("requiere permiso manage:atc", async () => {
    await resolveIncident("inc-1")
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("update llamado con status:RESOLVED y resolvedAt:Date", async () => {
    await resolveIncident("inc-1")

    expect(mockPrismaIncident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: { status: "RESOLVED", resolvedAt: expect.any(Date) },
    })
  })

  it("revalidatePath llamado tras resolver", async () => {
    await resolveIncident("inc-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/operations")
  })
})

// ─── updateIncidentStatus ─────────────────────────────────────────────────────

describe("updateIncidentStatus", () => {
  it("status OPEN: update SIN resolvedAt", async () => {
    await updateIncidentStatus("inc-1", "OPEN")

    expect(mockPrismaIncident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: { status: "OPEN" },
    })
  })

  it("status RESOLVED: update CON resolvedAt:Date", async () => {
    await updateIncidentStatus("inc-1", "RESOLVED")

    expect(mockPrismaIncident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: { status: "RESOLVED", resolvedAt: expect.any(Date) },
    })
  })

  it("status CLOSED: update CON resolvedAt:Date", async () => {
    await updateIncidentStatus("inc-1", "CLOSED")

    expect(mockPrismaIncident.update).toHaveBeenCalledWith({
      where: { id: "inc-1" },
      data: { status: "CLOSED", resolvedAt: expect.any(Date) },
    })
  })
})

// ─── getPaymentRecoveries ─────────────────────────────────────────────────────

describe("getPaymentRecoveries", () => {
  it("requiere permiso manage:atc", async () => {
    await getPaymentRecoveries()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("findMany llamado con include correcto", async () => {
    await getPaymentRecoveries()

    expect(mockPrismaPaymentRecovery.findMany).toHaveBeenCalledWith({
      include: {
        reservation: { select: { id: true, guestName: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  })
})

// ─── retryPayment ─────────────────────────────────────────────────────────────

describe("retryPayment", () => {
  it("update llamado con attempts:{increment:1}", async () => {
    await retryPayment("pay-1")

    expect(mockPrismaPaymentRecovery.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { attempts: { increment: 1 } },
    })
  })

  it("revalidatePath llamado tras reintento", async () => {
    await retryPayment("pay-1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/operations")
  })
})

// ─── getGroupReservations ─────────────────────────────────────────────────────

describe("getGroupReservations", () => {
  it("requiere permiso manage:atc", async () => {
    await getGroupReservations()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("findMany llamado con include correcto", async () => {
    await getGroupReservations()

    expect(mockPrismaGroupReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { reservation: { include: { channel: true } } },
      })
    )
  })
})

// ─── getWeatherAlerts ─────────────────────────────────────────────────────────

describe("getWeatherAlerts", () => {
  it("sin filtros: where vacio y orderBy correcto", async () => {
    await getWeatherAlerts()

    expect(mockPrismaWeatherAlert.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ severity: "desc" }, { forecastDate: "desc" }],
    })
  })

  it("con filtro status: where contiene status", async () => {
    await getWeatherAlerts({ status: "ACTIVE" })

    expect(mockPrismaWeatherAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      })
    )
  })

  it("con fromDate y toDate: where.forecastDate contiene gte y lte", async () => {
    const fromDate = new Date("2026-02-20")
    const toDate = new Date("2026-02-25")

    await getWeatherAlerts({ fromDate, toDate })

    expect(mockPrismaWeatherAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          forecastDate: { gte: fromDate, lte: toDate },
        }),
      })
    )
  })
})

// ─── createWeatherAlert ───────────────────────────────────────────────────────

describe("createWeatherAlert", () => {
  const validData = {
    alertType: "STORM" as const,
    severity: "HIGH" as const,
    description: "Tormenta electrica prevista con granizo y vientos fuertes",
    forecastDate: new Date("2026-02-22"),
    location: "Malaga Centro",
    precipitationMm: 45,
    windSpeedKmh: 80,
    temperatureC: 12,
    threshold: 60,
  }

  it("requiere permiso manage:atc", async () => {
    await createWeatherAlert(validData)
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("create llamado con datos validados + source:MANUAL + isActive:true + triggeredAt:Date", async () => {
    await createWeatherAlert(validData)

    expect(mockPrismaWeatherAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        alertType: "STORM",
        severity: "HIGH",
        source: "MANUAL",
        isActive: true,
        triggeredAt: expect.any(Date),
      }),
    })
  })

  it("revalidatePath llamado con /atc/operations", async () => {
    await createWeatherAlert(validData)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/operations")
  })
})

// ─── updateWeatherAlertStatus ─────────────────────────────────────────────────

describe("updateWeatherAlertStatus", () => {
  it("status ACTIVE: update con isActive:true SIN resolvedAt", async () => {
    await updateWeatherAlertStatus("wa-1", "ACTIVE")

    expect(mockPrismaWeatherAlert.update).toHaveBeenCalledWith({
      where: { id: "wa-1" },
      data: { status: "ACTIVE", isActive: true },
    })
  })

  it("status RESOLVED: update con isActive:false y resolvedAt:Date", async () => {
    await updateWeatherAlertStatus("wa-1", "RESOLVED")

    expect(mockPrismaWeatherAlert.update).toHaveBeenCalledWith({
      where: { id: "wa-1" },
      data: { status: "RESOLVED", isActive: false, resolvedAt: expect.any(Date) },
    })
  })

  it("status EXPIRED: update con isActive:false y resolvedAt:Date", async () => {
    await updateWeatherAlertStatus("wa-1", "EXPIRED")

    expect(mockPrismaWeatherAlert.update).toHaveBeenCalledWith({
      where: { id: "wa-1" },
      data: { status: "EXPIRED", isActive: false, resolvedAt: expect.any(Date) },
    })
  })
})

// ─── resolveWeatherAlert ──────────────────────────────────────────────────────

describe("resolveWeatherAlert", () => {
  const validResolution = {
    actionsTaken: "Terraza cerrada y reservas reubicadas en interior",
    resolvedBy: "Ana Martinez",
  }

  it("requiere permiso manage:atc", async () => {
    await resolveWeatherAlert("wa-1", validResolution)
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("update con status:RESOLVED, isActive:false, actionsTaken, resolvedBy, resolvedAt:Date", async () => {
    await resolveWeatherAlert("wa-1", validResolution)

    expect(mockPrismaWeatherAlert.update).toHaveBeenCalledWith({
      where: { id: "wa-1" },
      data: {
        status: "RESOLVED",
        isActive: false,
        actionsTaken: validResolution.actionsTaken,
        resolvedBy: validResolution.resolvedBy,
        resolvedAt: expect.any(Date),
      },
    })
  })

  it("Zod invalido (actionsTaken demasiado corta): retorna {success:false}", async () => {
    const result = await resolveWeatherAlert("wa-1", { actionsTaken: "Ok" })
    expect(result.success).toBe(false)
  })
})

// ─── getAffectedReservations ──────────────────────────────────────────────────

describe("getAffectedReservations", () => {
  it("requiere permiso read:atc", async () => {
    await getAffectedReservations(new Date("2026-02-22"))
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("findMany con rango dia completo, status in [PENDING,CONFIRMED], include channel, orderBy time asc", async () => {
    const forecastDate = new Date("2026-02-22")

    await getAffectedReservations(forecastDate)

    const call = mockPrismaReservation.findMany.mock.calls[0][0]

    expect(call.where.date.gte.getHours()).toBe(0)
    expect(call.where.date.gte.getMinutes()).toBe(0)
    expect(call.where.date.lte.getHours()).toBe(23)
    expect(call.where.date.lte.getMinutes()).toBe(59)
    expect(call.where.status).toEqual({ in: ["PENDING", "CONFIRMED"] })
    expect(call.include).toEqual({ channel: { select: { name: true } } })
    expect(call.orderBy).toEqual([{ time: "asc" }])
  })
})

// ─── getRestaurantLocations ───────────────────────────────────────────────────

describe("getRestaurantLocations", () => {
  it("requiere permiso read:atc", async () => {
    await getRestaurantLocations()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("findMany con isActive:true, orderBy [city, name], select {id,name,city}", async () => {
    await getRestaurantLocations()

    expect(mockPrismaRestaurantLocation.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true },
    })
  })
})

// ─── getWeatherConfig ─────────────────────────────────────────────────────────

describe("getWeatherConfig", () => {
  it("requiere permiso read:atc", async () => {
    await getWeatherConfig()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "read")
  })

  it("config existe: findUnique llamado, create NO llamado", async () => {
    mockPrismaWeatherConfig.findUnique.mockResolvedValue({ id: "default", rainMm: 10 })

    await getWeatherConfig()

    expect(mockPrismaWeatherConfig.findUnique).toHaveBeenCalledWith({ where: { id: "default" } })
    expect(mockPrismaWeatherConfig.create).not.toHaveBeenCalled()
  })

  it("config null: findUnique retorna null y create llamado con {id:default}", async () => {
    mockPrismaWeatherConfig.findUnique.mockResolvedValue(null)
    mockPrismaWeatherConfig.create.mockResolvedValue({ id: "default" })

    await getWeatherConfig()

    expect(mockPrismaWeatherConfig.create).toHaveBeenCalledWith({
      data: { id: "default" },
    })
  })
})

// ─── updateWeatherConfig ──────────────────────────────────────────────────────

describe("updateWeatherConfig", () => {
  const configData = {
    rainProbability: 70,
    rainMm: 20,
    windSpeed: 50,
    windGust: 80,
    temperatureLow: 5,
    temperatureHigh: 38,
    serviceHoursStart: 12,
    serviceHoursEnd: 23,
  }

  it("requiere permiso manage:atc", async () => {
    await updateWeatherConfig(configData)
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("upsert llamado con where {id:default} y revalidatePath", async () => {
    await updateWeatherConfig(configData)

    expect(mockPrismaWeatherConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "default" },
      })
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/operations")
  })
})

// ─── checkWeatherNow ──────────────────────────────────────────────────────────

describe("checkWeatherNow", () => {
  it("requiere permiso manage:atc", async () => {
    await checkWeatherNow()
    expect(mockRequirePermission).toHaveBeenCalledWith("atc", "manage")
  })

  it("sin ubicaciones activas: retorno anticipado con forecasts:[] y totalAlertsCreated:0", async () => {
    mockPrismaRestaurantLocation.findMany.mockResolvedValue([])

    const result = await checkWeatherNow()

    expect(result).toEqual({ success: true, data: { forecasts: [], totalAlertsCreated: 0 } })
    expect(mockCheckAllLocationsWeather).not.toHaveBeenCalled()
  })

  it("con ubicaciones: checkAllLocationsWeather llamado con locations y prisma", async () => {
    const locations = [
      { city: "Malaga", aemetMunicipioId: "29067", latitude: 36.72, longitude: -4.42 },
    ]
    mockPrismaRestaurantLocation.findMany.mockResolvedValue(locations)
    mockCheckAllLocationsWeather.mockResolvedValue({ forecasts: [{}], totalAlertsCreated: 1 })

    const result = await checkWeatherNow()

    expect(mockCheckAllLocationsWeather).toHaveBeenCalledWith(locations, expect.anything())
    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/atc/operations")
  })
})
