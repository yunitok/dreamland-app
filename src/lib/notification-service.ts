/**
 * Servicio de notificaciones in-app.
 * Utilidad de servidor pura — NO "use server".
 * Importable desde cualquier server action sin restricciones.
 *
 * Las funciones fallan silenciosamente con console.error para que
 * las notificaciones nunca bloqueen la operación principal.
 */

import { prisma } from "@/lib/prisma"
import { NotificationType, Prisma } from "@prisma/client"

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  href?: string
  metadata?: Record<string, unknown>
}

/**
 * Crea una notificación para un usuario específico.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        metadata: input.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
    })
  } catch (error) {
    console.error("[notification-service] Error creando notificación:", error)
  }
}

/**
 * Crea notificaciones para todos los usuarios que tienen un permiso dado.
 * Útil para broadcasts a un rol/recurso: p.ej. todos los usuarios con read:atc.
 *
 * @param resource  Recurso del permiso (e.g. "atc", "projects")
 * @param action    Acción del permiso (e.g. "read", "manage")
 * @param input     Datos de la notificación (sin userId)
 */
export async function createNotificationsForPermission(
  resource: string,
  action: string,
  input: Omit<CreateNotificationInput, "userId">
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          permissions: {
            some: {
              resource,
              action: { in: [action, "manage"] },
            },
          },
        },
      },
      select: { id: true },
    })

    console.log(`[notification-service] ${resource}:${action} → ${users.length} usuario(s) encontrado(s)`)
    if (users.length === 0) return

    const result = await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    })
    console.log(`[notification-service] ${result.count} notificación(es) creada(s) — tipo: ${input.type}`)
  } catch (error) {
    console.error("[notification-service] Error creando notificaciones broadcast:", error)
  }
}
