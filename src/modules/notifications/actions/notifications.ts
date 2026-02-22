"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/actions/rbac"

export async function getNotifications() {
  const auth = await requireAuth()
  if (!auth.authenticated) return { success: false as const, data: [] }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        href: true,
        metadata: true,
        createdAt: true,
      },
    })
    return { success: true as const, data: notifications }
  } catch {
    return { success: false as const, data: [] }
  }
}

export async function getUnreadCount() {
  const auth = await requireAuth()
  if (!auth.authenticated) return { count: 0 }

  try {
    const count = await prisma.notification.count({
      where: { userId: auth.userId, isRead: false },
    })
    return { count }
  } catch {
    return { count: 0 }
  }
}

export async function markAsRead(id: string) {
  const auth = await requireAuth()
  if (!auth.authenticated) return { success: false }

  try {
    await prisma.notification.updateMany({
      where: { id, userId: auth.userId },
      data: { isRead: true },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function markAllAsRead() {
  const auth = await requireAuth()
  if (!auth.authenticated) return { success: false }

  try {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function deleteNotification(id: string) {
  const auth = await requireAuth()
  if (!auth.authenticated) return { success: false }

  try {
    await prisma.notification.deleteMany({
      where: { id, userId: auth.userId },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function deleteAllNotifications() {
  const auth = await requireAuth()
  if (!auth.authenticated) return { success: false }

  try {
    await prisma.notification.deleteMany({
      where: { userId: auth.userId },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
