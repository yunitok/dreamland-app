"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import {
  reservationSchema,
  waitingListSchema,
  ReservationFormValues,
  WaitingListFormValues,
} from "@/modules/atc/domain/schemas"
import { ReservationStatus } from "@prisma/client"

export async function getReservations(filters?: {
  status?: ReservationStatus
  date?: Date
  search?: string
}) {
  await requirePermission("atc", "read")
  try {
    const where: any = {}
    if (filters?.status) where.status = filters.status
    if (filters?.date) {
      const start = new Date(filters.date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(filters.date)
      end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }
    if (filters?.search) {
      where.OR = [
        { guestName:  { contains: filters.search, mode: "insensitive" } },
        { guestEmail: { contains: filters.search, mode: "insensitive" } },
        { guestPhone: { contains: filters.search, mode: "insensitive" } },
      ]
    }
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        channel: true,
        modifications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    })
    return { success: true, data: reservations }
  } catch (error) {
    console.error("Error fetching reservations:", error)
    return { success: false, error: "Error al cargar las reservas" }
  }
}

export async function getReservation(id: string) {
  await requirePermission("atc", "read")
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        channel: true,
        modifications: { orderBy: { createdAt: "desc" } },
        groupReservation: true,
        paymentRecoveries: true,
      },
    })
    return { success: true, data: reservation }
  } catch (error) {
    console.error("Error fetching reservation:", error)
    return { success: false, error: "Error al cargar la reserva" }
  }
}

export async function createReservation(data: ReservationFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = reservationSchema.parse(data)
    const reservation = await prisma.reservation.create({ data: validated })
    revalidatePath("/atc/reservations")
    return { success: true, data: reservation }
  } catch (error) {
    console.error("Error creating reservation:", error)
    return { success: false, error: "Error al crear la reserva" }
  }
}

export async function updateReservation(id: string, data: ReservationFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = reservationSchema.parse(data)
    const reservation = await prisma.reservation.update({ where: { id }, data: validated })
    revalidatePath("/atc/reservations")
    return { success: true, data: reservation }
  } catch (error) {
    console.error("Error updating reservation:", error)
    return { success: false, error: "Error al actualizar la reserva" }
  }
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  await requirePermission("atc", "manage")
  try {
    const reservation = await prisma.reservation.update({ where: { id }, data: { status } })
    revalidatePath("/atc/reservations")
    return { success: true, data: reservation }
  } catch (error) {
    console.error("Error updating reservation status:", error)
    return { success: false, error: "Error al actualizar el estado" }
  }
}

export async function deleteReservation(id: string) {
  await requirePermission("atc", "manage")
  try {
    await prisma.reservation.delete({ where: { id } })
    revalidatePath("/atc/reservations")
    return { success: true }
  } catch (error) {
    console.error("Error deleting reservation:", error)
    return { success: false, error: "Error al eliminar la reserva" }
  }
}

export async function getWaitingList() {
  await requirePermission("atc", "read")
  try {
    const entries = await prisma.waitingList.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })
    return { success: true, data: entries }
  } catch (error) {
    console.error("Error fetching waiting list:", error)
    return { success: false, error: "Error al cargar la lista de espera" }
  }
}

export async function addToWaitingList(data: WaitingListFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = waitingListSchema.parse(data)
    const entry = await prisma.waitingList.create({ data: validated })
    revalidatePath("/atc/reservations")
    return { success: true, data: entry }
  } catch (error) {
    console.error("Error adding to waiting list:", error)
    return { success: false, error: "Error al añadir a la lista de espera" }
  }
}

export async function getReservationChannels() {
  await requirePermission("atc", "read")
  try {
    const channels = await prisma.reservationChannel.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })
    return { success: true, data: channels }
  } catch (error) {
    console.error("Error fetching channels:", error)
    return { success: false, error: "Error al cargar los canales" }
  }
}
