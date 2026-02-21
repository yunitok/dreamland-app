"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import {
  incidentSchema, IncidentFormValues,
  weatherAlertSchema, WeatherAlertFormValues,
  resolveWeatherAlertSchema, ResolveWeatherAlertFormValues,
} from "@/modules/atc/domain/schemas"
import { IncidentStatus, WeatherAlertStatus, WeatherAlertSeverity } from "@prisma/client"

export async function getIncidents(status?: IncidentStatus) {
  await requirePermission("atc", "read")
  try {
    const incidents = await prisma.incident.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    })
    return { success: true, data: incidents }
  } catch (error) {
    console.error("Error fetching incidents:", error)
    return { success: false, error: "Error al cargar las incidencias" }
  }
}

export async function createIncident(data: IncidentFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = incidentSchema.parse(data)
    const incident = await prisma.incident.create({ data: validated })
    revalidatePath("/atc/operations")
    return { success: true, data: incident }
  } catch (error) {
    console.error("Error creating incident:", error)
    return { success: false, error: "Error al crear la incidencia" }
  }
}

export async function resolveIncident(id: string) {
  await requirePermission("atc", "manage")
  try {
    const incident = await prisma.incident.update({
      where: { id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    })
    revalidatePath("/atc/operations")
    return { success: true, data: incident }
  } catch (error) {
    console.error("Error resolving incident:", error)
    return { success: false, error: "Error al resolver la incidencia" }
  }
}

export async function updateIncidentStatus(id: string, status: IncidentStatus) {
  await requirePermission("atc", "manage")
  try {
    const data: any = { status }
    if (status === "RESOLVED" || status === "CLOSED") {
      data.resolvedAt = new Date()
    }
    const incident = await prisma.incident.update({ where: { id }, data })
    revalidatePath("/atc/operations")
    return { success: true, data: incident }
  } catch (error) {
    console.error("Error updating incident status:", error)
    return { success: false, error: "Error al actualizar el estado" }
  }
}

export async function getPaymentRecoveries() {
  await requirePermission("atc", "manage")
  try {
    const recoveries = await prisma.paymentRecovery.findMany({
      include: {
        reservation: { select: { id: true, guestName: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: recoveries }
  } catch (error) {
    console.error("Error fetching payment recoveries:", error)
    return { success: false, error: "Error al cargar las recuperaciones de pago" }
  }
}

export async function retryPayment(id: string) {
  await requirePermission("atc", "manage")
  try {
    const recovery = await prisma.paymentRecovery.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    })
    // TODO: integrar con pasarela de pago (Stripe/Redsys)
    revalidatePath("/atc/operations")
    return { success: true, data: recovery }
  } catch (error) {
    console.error("Error retrying payment:", error)
    return { success: false, error: "Error al reintentar el pago" }
  }
}

export async function getGroupReservations() {
  await requirePermission("atc", "manage")
  try {
    const groups = await prisma.groupReservation.findMany({
      include: { reservation: { include: { channel: true } } },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: groups }
  } catch (error) {
    console.error("Error fetching group reservations:", error)
    return { success: false, error: "Error al cargar las reservas de grupo" }
  }
}

// --- WEATHER ALERTS ---

export async function getWeatherAlerts(filters?: {
  status?: WeatherAlertStatus
  severity?: WeatherAlertSeverity
  fromDate?: Date
  toDate?: Date
}) {
  await requirePermission("atc", "read")
  try {
    const where: Record<string, unknown> = {}
    if (filters?.status) where.status = filters.status
    if (filters?.severity) where.severity = filters.severity
    if (filters?.fromDate || filters?.toDate) {
      const forecastDate: Record<string, Date> = {}
      if (filters?.fromDate) forecastDate.gte = filters.fromDate
      if (filters?.toDate) forecastDate.lte = filters.toDate
      where.forecastDate = forecastDate
    }

    const alerts = await prisma.weatherAlert.findMany({
      where,
      orderBy: [{ severity: "desc" }, { forecastDate: "desc" }],
    })
    return { success: true, data: alerts }
  } catch (error) {
    console.error("Error fetching weather alerts:", error)
    return { success: false, error: "Error al cargar las alertas meteorológicas" }
  }
}

export async function createWeatherAlert(data: WeatherAlertFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = weatherAlertSchema.parse(data)
    const alert = await prisma.weatherAlert.create({
      data: {
        ...validated,
        source: "MANUAL",
        triggeredAt: new Date(),
        isActive: true,
      },
    })
    revalidatePath("/atc/operations")
    return { success: true, data: alert }
  } catch (error) {
    console.error("Error creating weather alert:", error)
    return { success: false, error: "Error al crear la alerta meteorológica" }
  }
}

export async function updateWeatherAlertStatus(id: string, status: WeatherAlertStatus) {
  await requirePermission("atc", "manage")
  try {
    const data: Record<string, unknown> = { status }
    if (status === "RESOLVED" || status === "EXPIRED") {
      data.isActive = false
      data.resolvedAt = new Date()
    }
    if (status === "ACTIVE") {
      data.isActive = true
    }
    const alert = await prisma.weatherAlert.update({ where: { id }, data })
    revalidatePath("/atc/operations")
    return { success: true, data: alert }
  } catch (error) {
    console.error("Error updating weather alert status:", error)
    return { success: false, error: "Error al actualizar el estado de la alerta" }
  }
}

export async function resolveWeatherAlert(id: string, resolution: ResolveWeatherAlertFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = resolveWeatherAlertSchema.parse(resolution)
    const alert = await prisma.weatherAlert.update({
      where: { id },
      data: {
        status: "RESOLVED",
        isActive: false,
        actionsTaken: validated.actionsTaken,
        resolvedBy: validated.resolvedBy,
        resolvedAt: new Date(),
      },
    })
    revalidatePath("/atc/operations")
    return { success: true, data: alert }
  } catch (error) {
    console.error("Error resolving weather alert:", error)
    return { success: false, error: "Error al resolver la alerta meteorológica" }
  }
}

export async function getAffectedReservations(forecastDate: Date) {
  await requirePermission("atc", "read")
  try {
    const start = new Date(forecastDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(forecastDate)
    end.setHours(23, 59, 59, 999)

    const reservations = await prisma.reservation.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { channel: { select: { name: true } } },
      orderBy: [{ time: "asc" }],
    })
    return { success: true, data: reservations }
  } catch (error) {
    console.error("Error fetching affected reservations:", error)
    return { success: false, error: "Error al cargar las reservas afectadas" }
  }
}

// --- RESTAURANT LOCATIONS ---

export async function getRestaurantLocations() {
  await requirePermission("atc", "read")
  try {
    const locations = await prisma.restaurantLocation.findMany({
      where: { isActive: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true },
    })
    return { success: true, data: locations }
  } catch (error) {
    console.error("Error fetching restaurant locations:", error)
    return { success: false, error: "Error al cargar las ubicaciones" }
  }
}

// --- WEATHER CONFIG ---

export async function getWeatherConfig() {
  await requirePermission("atc", "read")
  try {
    // Obtener o crear config por defecto
    let config = await prisma.weatherConfig.findUnique({ where: { id: "default" } })
    if (!config) {
      config = await prisma.weatherConfig.create({
        data: { id: "default" },
      })
    }
    return { success: true, data: config }
  } catch (error) {
    console.error("Error fetching weather config:", error)
    return { success: false, error: "Error al cargar la configuración meteorológica" }
  }
}

export async function updateWeatherConfig(data: {
  rainProbability: number
  rainMm: number
  windSpeed: number
  windGust: number
  temperatureLow: number
  temperatureHigh: number
  serviceHoursStart: number
  serviceHoursEnd: number
}) {
  await requirePermission("atc", "manage")
  try {
    const config = await prisma.weatherConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    })
    revalidatePath("/atc/operations")
    return { success: true, data: config }
  } catch (error) {
    console.error("Error updating weather config:", error)
    return { success: false, error: "Error al guardar la configuración" }
  }
}

// --- WEATHER CHECK (real-time) ---

export async function checkWeatherNow() {
  await requirePermission("atc", "manage")
  try {
    const { checkAllLocationsWeather } = await import("@/lib/weather")

    const locations = await prisma.restaurantLocation.findMany({
      where: { isActive: true },
      select: { city: true, aemetMunicipioId: true, latitude: true, longitude: true },
    })

    if (locations.length === 0) {
      return { success: true, data: { forecasts: [], totalAlertsCreated: 0 } }
    }

    const result = await checkAllLocationsWeather(locations, prisma)
    revalidatePath("/atc/operations")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error checking weather:", error)
    return { success: false, error: "Error al consultar la previsión meteorológica" }
  }
}
