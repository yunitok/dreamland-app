"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { incidentSchema, IncidentFormValues } from "@/modules/atc/domain/schemas"
import { IncidentStatus } from "@prisma/client"

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
