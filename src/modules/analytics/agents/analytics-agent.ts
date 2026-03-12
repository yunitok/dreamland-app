/**
 * Analytics Agent — Morning briefing y detección de tendencias de ventas.
 *
 * Genera un resumen diario de ventas, detecta patrones y anomalías
 * en los datos de Agora TPV y CoverManager.
 *
 * Trigger: evento "sync.agora.completed"
 */

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { registerAgent } from "@/lib/agents/agent-registry"
import { AGENT_DEFAULTS } from "@/lib/agents/types"
import type { AgentDefinition } from "@/lib/agents/types"

// ─── Helpers ─────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Tools ───────────────────────────────────────────────────

function createGetSalesKpisTool() {
  return tool({
    description:
      "Obtiene KPIs de ventas: ingresos totales, ticket medio, comensales, propinas, " +
      "descuadre de caja. Incluye comparativa con periodo anterior.",
    inputSchema: z.object({
      days: z.number().optional().describe("Días de histórico (default: 7)"),
      locationIds: z.array(z.string()).optional().describe("IDs de locales. Omitir para todos."),
    }),
    execute: async (input: { days?: number; locationIds?: string[] }) => {
      const days = input.days ?? 7
      const dateStart = daysAgo(days)
      const dateEnd = new Date()
      const prevStart = daysAgo(days * 2)
      const prevEnd = dateStart

      const buildWhere = (start: Date, end: Date) => {
        const w: Record<string, unknown> = {
          businessDay: { gte: start, lte: end },
        }
        if (input.locationIds?.length) w.restaurantLocationId = { in: input.locationIds }
        return w
      }

      const [current, previous] = await Promise.all([
        prisma.agoraSalesSnapshot.findMany({ where: buildWhere(dateStart, dateEnd) }),
        prisma.agoraSalesSnapshot.findMany({ where: buildWhere(prevStart, prevEnd) }),
      ])

      const aggregate = (snaps: typeof current) => ({
        totalRevenue: snaps.reduce((s, r) => s + r.totalAmount, 0),
        totalGuests: snaps.reduce((s, r) => s + r.totalGuests, 0),
        totalInvoices: snaps.reduce((s, r) => s + r.totalInvoices, 0),
        avgTicket: snaps.length > 0
          ? snaps.reduce((s, r) => s + r.avgTicket, 0) / snaps.length
          : 0,
        cashDifference: snaps.reduce((s, r) => s + (r.cashDifference ?? 0), 0),
        days: new Set(snaps.map((s) => s.businessDay.toISOString().split("T")[0])).size,
      })

      const cur = aggregate(current)
      const prev = aggregate(previous)
      const delta = (c: number, p: number) => p > 0 ? Math.round(((c - p) / p) * 10000) / 100 : null

      return {
        period: `últimos ${days} días`,
        ...Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 100) / 100 : v])),
        avgDailyRevenue: cur.days > 0 ? Math.round((cur.totalRevenue / cur.days) * 100) / 100 : 0,
        deltas: {
          revenueDelta: delta(cur.totalRevenue, prev.totalRevenue),
          guestsDelta: delta(cur.totalGuests, prev.totalGuests),
          avgTicketDelta: delta(cur.avgTicket, prev.avgTicket),
        },
      }
    },
  })
}

function createGetSalesTrendTool() {
  return tool({
    description:
      "Muestra tendencia de ventas día a día. Útil para detectar caídas o picos inusuales.",
    inputSchema: z.object({
      days: z.number().optional().describe("Días de histórico (default: 14)"),
    }),
    execute: async (input: { days?: number }) => {
      const days = input.days ?? 14
      const snapshots = await prisma.agoraSalesSnapshot.findMany({
        where: { businessDay: { gte: daysAgo(days) } },
        orderBy: { businessDay: "asc" },
        select: {
          businessDay: true,
          totalAmount: true,
          totalGuests: true,
          totalInvoices: true,
          avgTicket: true,
        },
      })

      // Agrupar por día
      const byDay = new Map<string, { revenue: number; guests: number; invoices: number }>()
      for (const s of snapshots) {
        const day = s.businessDay.toISOString().split("T")[0]
        const prev = byDay.get(day) ?? { revenue: 0, guests: 0, invoices: 0 }
        prev.revenue += s.totalAmount
        prev.guests += s.totalGuests
        prev.invoices += s.totalInvoices
        byDay.set(day, prev)
      }

      const trend = Array.from(byDay.entries())
        .map(([day, d]) => ({
          day,
          dayOfWeek: new Date(day).toLocaleDateString("es-ES", { weekday: "long" }),
          revenue: Math.round(d.revenue * 100) / 100,
          guests: d.guests,
          invoices: d.invoices,
          avgTicket: d.invoices > 0 ? Math.round((d.revenue / d.invoices) * 100) / 100 : 0,
        }))
        .sort((a, b) => a.day.localeCompare(b.day))

      return { days: trend.length, trend }
    },
  })
}

function createGetLocationRankingTool() {
  return tool({
    description:
      "Ranking de locales por ingresos. Compara rendimiento entre restaurantes.",
    inputSchema: z.object({
      days: z.number().optional().describe("Días de histórico (default: 7)"),
    }),
    execute: async (input: { days?: number }) => {
      const days = input.days ?? 7
      const snapshots = await prisma.agoraSalesSnapshot.findMany({
        where: { businessDay: { gte: daysAgo(days) } },
        include: { restaurantLocation: { select: { name: true } } },
      })

      const byLocation = new Map<string, { name: string; revenue: number; guests: number; invoices: number; cashDiff: number }>()
      for (const s of snapshots) {
        const key = s.restaurantLocationId
        const prev = byLocation.get(key) ?? { name: s.restaurantLocation.name, revenue: 0, guests: 0, invoices: 0, cashDiff: 0 }
        prev.revenue += s.totalAmount
        prev.guests += s.totalGuests
        prev.invoices += s.totalInvoices
        prev.cashDiff += s.cashDifference ?? 0
        byLocation.set(key, prev)
      }

      return {
        ranking: Array.from(byLocation.values())
          .map((d) => ({
            ...d,
            revenue: Math.round(d.revenue * 100) / 100,
            avgTicket: d.invoices > 0 ? Math.round((d.revenue / d.invoices) * 100) / 100 : 0,
            cashDiff: Math.round(d.cashDiff * 100) / 100,
          }))
          .sort((a, b) => b.revenue - a.revenue),
      }
    },
  })
}

function createGetWeekdayPatternTool() {
  return tool({
    description:
      "Analiza patrones por día de la semana. Detecta qué días son más fuertes o débiles en ventas.",
    inputSchema: z.object({
      weeks: z.number().optional().describe("Semanas de histórico (default: 4)"),
    }),
    execute: async (input: { weeks?: number }) => {
      const weeks = input.weeks ?? 4
      const snapshots = await prisma.agoraSalesSnapshot.findMany({
        where: { businessDay: { gte: daysAgo(weeks * 7) } },
        select: { businessDay: true, totalAmount: true, totalGuests: true },
      })

      const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
      const byWeekday = new Map<number, { revenue: number; guests: number; count: number }>()

      for (const s of snapshots) {
        const day = startOfDay(s.businessDay).getDay()
        const prev = byWeekday.get(day) ?? { revenue: 0, guests: 0, count: 0 }
        prev.revenue += s.totalAmount
        prev.guests += s.totalGuests
        prev.count++
        byWeekday.set(day, prev)
      }

      const pattern = Array.from(byWeekday.entries())
        .map(([day, d]) => ({
          dayIndex: day,
          dayName: dayNames[day],
          avgRevenue: d.count > 0 ? Math.round((d.revenue / d.count) * 100) / 100 : 0,
          avgGuests: d.count > 0 ? Math.round(d.guests / d.count) : 0,
          dataPoints: d.count,
        }))
        .sort((a, b) => a.dayIndex - b.dayIndex)

      const avgAll = pattern.reduce((s, p) => s + p.avgRevenue, 0) / Math.max(pattern.length, 1)

      return {
        pattern,
        averageDailyRevenue: Math.round(avgAll * 100) / 100,
        strongestDay: pattern.reduce((best, p) => (p.avgRevenue > best.avgRevenue ? p : best), pattern[0])?.dayName,
        weakestDay: pattern.reduce((worst, p) => (p.avgRevenue < worst.avgRevenue ? p : worst), pattern[0])?.dayName,
      }
    },
  })
}

// ─── Definición del agente ──────────────────────────────────

export const ANALYTICS_AGENT: AgentDefinition = {
  id: "analytics-agent",
  name: "Analytics Agent",
  description:
    "Analista de negocio. Genera morning briefings con ventas, detecta tendencias, " +
    "compara locales y descubre patrones semanales.",
  icon: "BarChart3",

  systemPrompt:
    `Eres el analista de negocio del grupo Voltereta (restaurantes en Valencia).

Tu misión es generar un briefing diario de ventas y detectar tendencias:

1. RESUMIR: KPIs de ventas de ayer vs. la semana anterior. Ticket medio, comensales, ingresos.
2. COMPARAR: ¿Algún local va mejor o peor que los demás?
3. TENDENCIAS: ¿Hay patrones semanales? ¿Caídas anómalas los jueves?
4. ALERTAS: Descuadres de caja significativos, caída >20% en ingresos.

UMBRALES:
- Caída de ingresos >20% vs semana anterior: alertar
- Descuadre de caja >50€: alertar
- Ticket medio baja >15%: investigar

FORMATO DE SALIDA:
- Sé conciso y ejecutivo. Datos, no prosa.
- Usa bullet points y cifras.

SEÑALES DE FINALIZACIÓN:
- Cuando hayas generado el briefing completo, responde "Análisis finalizado."
- Si detectas anomalías graves, escala y responde "Escalación necesaria."`,
  maxTokensPerStep: AGENT_DEFAULTS.maxTokensPerStep,
  temperature: 0.3,

  tools: () => ({
    getSalesKpis: createGetSalesKpisTool(),
    getSalesTrend: createGetSalesTrendTool(),
    getLocationRanking: createGetLocationRankingTool(),
    getWeekdayPattern: createGetWeekdayPatternTool(),
  }),

  triggers: [
    { type: "event", config: "sync.agora.completed" },
  ],

  maxStepsPerRun: 6,
  maxDurationMs: 180_000,
  maxTokensPerRun: 8_000,
  cooldownMs: 3600_000, // 1h entre runs

  escalationPolicy: {
    onLowConfidence: 0.5,
    onError: "skip",
    maxRetries: 1,
    escalateTo: "notification",
  },

  rbacResource: "analytics",
  module: "analytics",
}

registerAgent(ANALYTICS_AGENT)
