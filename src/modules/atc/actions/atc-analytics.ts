"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"

// ─── Types ──────────────────────────────────────────────────

export interface UnreadByCategoryItem {
  categoryId: string | null
  categoryName: string
  slug: string | null
  color: string
  icon: string | null
  unreadCount: number
  /** Desglose por prioridad IA dentro de esta categoría (solo no leídos) */
  urgentCount: number    // P5 — requiere atención inmediata
  highCount: number      // P4 — importante, revisar pronto
  normalCount: number    // P1-P3 — puede esperar
}

export interface EmailKpis {
  totalUnread: number
  actionRequiredPending: number
  unassigned: number
  pendingDrafts: number
  avgResponseTimeMinutes: number | null
  totalToday: number
}

export interface IncidentSummaryItem {
  severity: string
  count: number
}

export interface QuerySummaryData {
  openCount: number
  escalatedCount: number
  aiResolved: number
  humanResolved: number
}

export interface EmailVolumePoint {
  date: string
  count: number
}

// ─── Emails no leídos por categoría ─────────────────────────

export async function getUnreadByCategory(): Promise<{ success: boolean; data?: UnreadByCategoryItem[]; error?: string }> {
  await requirePermission("atc", "read")
  try {
    const [unreadGroups, urgentGroups, highGroups, categories] = await Promise.all([
      prisma.emailInbox.groupBy({
        by: ["categoryId"],
        where: { isRead: false },
        _count: { id: true },
      }),
      prisma.emailInbox.groupBy({
        by: ["categoryId"],
        where: { isRead: false, aiPriority: 5 },
        _count: { id: true },
      }),
      prisma.emailInbox.groupBy({
        by: ["categoryId"],
        where: { isRead: false, aiPriority: 4 },
        _count: { id: true },
      }),
      prisma.emailCategory.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, color: true, icon: true },
      }),
    ])

    const categoryMap = new Map(categories.map((c) => [c.id, c]))
    const urgentMap = new Map(
      urgentGroups.map((g) => [g.categoryId ?? "__null__", g._count.id])
    )
    const highMap = new Map(
      highGroups.map((g) => [g.categoryId ?? "__null__", g._count.id])
    )

    const result: UnreadByCategoryItem[] = unreadGroups.map((g) => {
      const cat = g.categoryId ? categoryMap.get(g.categoryId) : null
      const key = g.categoryId ?? "__null__"
      const urgent = urgentMap.get(key) ?? 0
      const high = highMap.get(key) ?? 0
      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? "Sin clasificar",
        slug: cat?.slug ?? null,
        color: cat?.color ?? "#6b7280",
        icon: cat?.icon ?? null,
        unreadCount: g._count.id,
        urgentCount: urgent,
        highCount: high,
        normalCount: g._count.id - urgent - high,
      }
    })

    result.sort((a, b) => b.unreadCount - a.unreadCount)
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching unread by category:", error)
    return { success: false, error: "Error al cargar emails no leídos por categoría" }
  }
}

// ─── KPIs de Email ──────────────────────────────────────────

export async function getEmailKpis(): Promise<{ success: boolean; data?: EmailKpis; error?: string }> {
  await requirePermission("atc", "read")
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [totalUnread, actionRequiredPending, unassigned, pendingDrafts, totalToday, emailsWithReply] =
      await Promise.all([
        prisma.emailInbox.count({ where: { isRead: false } }),
        prisma.emailInbox.count({ where: { isRead: false, actionRequired: true } }),
        prisma.emailInbox.count({ where: { isRead: false, assignedTo: null } }),
        prisma.emailInbox.count({ where: { hasDraft: true } }),
        prisma.emailInbox.count({ where: { receivedAt: { gte: todayStart } } }),
        prisma.emailInbox.findMany({
          where: { replies: { some: { isDraft: false } } },
          select: {
            receivedAt: true,
            replies: {
              where: { isDraft: false },
              orderBy: { sentAt: "asc" },
              take: 1,
              select: { sentAt: true },
            },
          },
          take: 200,
          orderBy: { receivedAt: "desc" },
        }),
      ])

    let avgResponseTimeMinutes: number | null = null
    if (emailsWithReply.length > 0) {
      const diffs = emailsWithReply
        .filter((e) => e.replies[0]?.sentAt)
        .map((e) => {
          const received = new Date(e.receivedAt).getTime()
          const replied = new Date(e.replies[0].sentAt!).getTime()
          return (replied - received) / 60_000
        })
        .filter((d) => d > 0)

      if (diffs.length > 0) {
        avgResponseTimeMinutes = Math.round(
          diffs.reduce((sum, d) => sum + d, 0) / diffs.length
        )
      }
    }

    return {
      success: true,
      data: {
        totalUnread,
        actionRequiredPending,
        unassigned,
        pendingDrafts,
        avgResponseTimeMinutes,
        totalToday,
      },
    }
  } catch (error) {
    console.error("Error fetching email KPIs:", error)
    return { success: false, error: "Error al cargar KPIs de email" }
  }
}

// ─── Resumen de Incidencias ─────────────────────────────────

export async function getIncidentSummary(): Promise<{ success: boolean; data?: IncidentSummaryItem[]; error?: string }> {
  await requirePermission("atc", "read")
  try {
    const groups = await prisma.incident.groupBy({
      by: ["severity"],
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      _count: { id: true },
    })

    const data = groups.map((g) => ({
      severity: g.severity,
      count: g._count.id,
    }))

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching incident summary:", error)
    return { success: false, error: "Error al cargar resumen de incidencias" }
  }
}

// ─── Resumen de Queries ─────────────────────────────────────

export async function getQuerySummary(): Promise<{ success: boolean; data?: QuerySummaryData; error?: string }> {
  await requirePermission("atc", "read")
  try {
    const [openCount, escalatedCount, aiResolved, humanResolved] = await Promise.all([
      prisma.query.count({ where: { status: "OPEN" } }),
      prisma.query.count({ where: { status: "ESCALATED" } }),
      prisma.queryResolution.count({ where: { source: "AI" } }),
      prisma.queryResolution.count({ where: { source: "HUMAN" } }),
    ])

    return { success: true, data: { openCount, escalatedCount, aiResolved, humanResolved } }
  } catch (error) {
    console.error("Error fetching query summary:", error)
    return { success: false, error: "Error al cargar resumen de consultas" }
  }
}

// ─── Volumen de emails por día ──────────────────────────────

export async function getEmailVolumeByDay(days = 14): Promise<{ success: boolean; data?: EmailVolumePoint[]; error?: string }> {
  await requirePermission("atc", "read")
  try {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const emails = await prisma.emailInbox.findMany({
      where: { receivedAt: { gte: since } },
      select: { receivedAt: true },
      orderBy: { receivedAt: "asc" },
    })

    const volumeMap = new Map<string, number>()
    // Pre-fill all days
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      volumeMap.set(d.toISOString().slice(0, 10), 0)
    }

    for (const email of emails) {
      const day = new Date(email.receivedAt).toISOString().slice(0, 10)
      volumeMap.set(day, (volumeMap.get(day) ?? 0) + 1)
    }

    const data: EmailVolumePoint[] = Array.from(volumeMap.entries()).map(
      ([date, count]) => ({ date, count })
    )

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching email volume:", error)
    return { success: false, error: "Error al cargar volumen de emails" }
  }
}
