/**
 * Sherlock Agent — Detección de anomalías de coste alimentario.
 *
 * Analiza KPIs de food cost, detecta desviaciones significativas,
 * investiga causas raíz (ingredientes, mermas, locales) y genera insights.
 *
 * Trigger: evento "sync.food-cost.completed" + análisis bajo demanda
 */

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { registerAgent } from "@/lib/agents/agent-registry"
import { AGENT_DEFAULTS } from "@/lib/agents/types"
import type { AgentDefinition } from "@/lib/agents/types"

// ─── Helpers de fechas ──────────────────────────────────────

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split("T")[0]
}

function today(): string {
  return new Date().toISOString().split("T")[0]
}

// ─── Tools del agente (sin RBAC) ────────────────────────────

const locationFilterSchema = z.object({
  locationIds: z.array(z.string()).optional().describe("IDs de locales a analizar. Omitir para todos."),
  months: z.number().optional().describe("Meses de histórico a analizar (default: 3)"),
})

function createGetFoodCostKpisTool() {
  return tool({
    description:
      "Obtiene KPIs de coste alimentario: coste real, teórico, varianza, food cost %, " +
      "y comparativa con el periodo anterior. Datos mensuales de FoodCostSnapshot.",
    inputSchema: locationFilterSchema,
    execute: async (input: z.infer<typeof locationFilterSchema>) => {
      const months = input.months ?? 3
      const dateStart = monthsAgo(months)
      const dateEnd = today()

      const where: Record<string, unknown> = {
        periodStart: { gte: new Date(dateStart) },
        periodEnd: { lte: new Date(dateEnd) },
      }
      if (input.locationIds?.length) {
        where.restaurantLocationId = { in: input.locationIds }
      }

      const snapshots = await prisma.foodCostSnapshot.findMany({ where })

      if (snapshots.length === 0) return { message: "Sin datos de food cost para el periodo" }

      const realTotal = snapshots.reduce((s, r) => s + r.realCostTotal, 0)
      const theoTotal = snapshots.reduce((s, r) => s + r.theoreticalCostTotal, 0)
      const revenue = snapshots.reduce((s, r) => s + (r.periodRevenue ?? 0), 0)
      const variance = realTotal - theoTotal
      const variancePct = theoTotal > 0 ? (variance / theoTotal) * 100 : 0
      const foodCostPct = revenue > 0 ? (realTotal / revenue) * 100 : null

      return {
        periodMonths: months,
        realCostTotal: Math.round(realTotal * 100) / 100,
        theoreticalCostTotal: Math.round(theoTotal * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePct * 100) / 100,
        foodCostPercent: foodCostPct ? Math.round(foodCostPct * 100) / 100 : null,
        totalRevenue: Math.round(revenue * 100) / 100,
        snapshotCount: snapshots.length,
      }
    },
  })
}

function createGetCostByLocationTool() {
  return tool({
    description:
      "Compara food cost por local. Retorna varianza (real vs teórico) por ubicación, " +
      "ordenado por mayor desviación. Clave para detectar locales con problemas.",
    inputSchema: locationFilterSchema,
    execute: async (input: z.infer<typeof locationFilterSchema>) => {
      const months = input.months ?? 3
      const where: Record<string, unknown> = {
        periodStart: { gte: new Date(monthsAgo(months)) },
        periodEnd: { lte: new Date(today()) },
      }
      if (input.locationIds?.length) {
        where.restaurantLocationId = { in: input.locationIds }
      }

      const snapshots = await prisma.foodCostSnapshot.findMany({
        where,
        include: { restaurantLocation: { select: { name: true } } },
      })

      const byLocation = new Map<string, { name: string; real: number; theo: number; revenue: number }>()
      for (const s of snapshots) {
        const key = s.restaurantLocationId
        const prev = byLocation.get(key) ?? { name: s.restaurantLocation.name, real: 0, theo: 0, revenue: 0 }
        prev.real += s.realCostTotal
        prev.theo += s.theoreticalCostTotal
        prev.revenue += s.periodRevenue ?? 0
        byLocation.set(key, prev)
      }

      const results = Array.from(byLocation.entries())
        .map(([id, d]) => {
          const variance = d.real - d.theo
          return {
            locationId: id,
            locationName: d.name,
            realCost: Math.round(d.real * 100) / 100,
            theoreticalCost: Math.round(d.theo * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            variancePercent: d.theo > 0 ? Math.round((variance / d.theo) * 10000) / 100 : 0,
            foodCostPercent: d.revenue > 0 ? Math.round((d.real / d.revenue) * 10000) / 100 : null,
          }
        })
        .sort((a, b) => b.variance - a.variance)

      return { locations: results, anomalyThreshold: "variancePercent > 15% indica problema" }
    },
  })
}

function createGetWasteAnalysisTool() {
  return tool({
    description:
      "Analiza mermas: top ingredientes por impacto económico y distribución por motivo. " +
      "Útil para identificar causas de sobrecoste.",
    inputSchema: locationFilterSchema,
    execute: async (input: z.infer<typeof locationFilterSchema>) => {
      const months = input.months ?? 3
      const where: Record<string, unknown> = {
        createdAt: { gte: new Date(monthsAgo(months)) },
      }
      if (input.locationIds?.length) {
        where.restaurantLocationId = { in: input.locationIds }
      }

      const records = await prisma.wasteRecord.findMany({
        where,
        include: {
          ingredient: { select: { name: true, cost: true, unitType: { select: { abbreviation: true } } } },
        },
      })

      // Por motivo
      const byReason = new Map<string, { count: number; costImpact: number }>()
      // Por ingrediente
      const byIngredient = new Map<string, { name: string; quantity: number; costImpact: number; unit: string }>()

      for (const r of records) {
        const cost = r.quantity * (r.ingredient.cost ?? 0)

        const prev = byReason.get(r.reason) ?? { count: 0, costImpact: 0 }
        prev.count++
        prev.costImpact += cost
        byReason.set(r.reason, prev)

        const iPrev = byIngredient.get(r.ingredientId) ?? {
          name: r.ingredient.name,
          quantity: 0,
          costImpact: 0,
          unit: r.ingredient.unitType?.abbreviation ?? "ud",
        }
        iPrev.quantity += r.quantity
        iPrev.costImpact += cost
        byIngredient.set(r.ingredientId, iPrev)
      }

      return {
        totalRecords: records.length,
        totalCostImpact: Math.round(records.reduce((s, r) => s + r.quantity * (r.ingredient.cost ?? 0), 0) * 100) / 100,
        byReason: Array.from(byReason.entries())
          .map(([reason, d]) => ({ reason, ...d, costImpact: Math.round(d.costImpact * 100) / 100 }))
          .sort((a, b) => b.costImpact - a.costImpact),
        topIngredients: Array.from(byIngredient.values())
          .sort((a, b) => b.costImpact - a.costImpact)
          .slice(0, 10)
          .map((d) => ({ ...d, costImpact: Math.round(d.costImpact * 100) / 100 })),
      }
    },
  })
}

function createGetStockAlertsTool() {
  return tool({
    description:
      "Consulta alertas de stock: ingredientes con stock bajo, caducidad próxima y sin stock. " +
      "Útil para detectar problemas de aprovisionamiento.",
    inputSchema: z.object({
      expiryDaysThreshold: z.number().optional().describe("Días hasta caducidad para alertar (default: 7)"),
    }),
    execute: async (input: { expiryDaysThreshold?: number }) => {
      const days = input.expiryDaysThreshold ?? 7
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + days)

      const [lowStock, expiring, outOfStock] = await Promise.all([
        // Bajo stock
        prisma.ingredient.findMany({
          where: {
            status: "ACTIVE",
            minStock: { not: null },
            currentStock: { not: null },
          },
          select: { id: true, name: true, currentStock: true, minStock: true },
        }).then((items) => items.filter((i) => (i.currentStock ?? 0) < (i.minStock ?? 0))),

        // Caducidad próxima
        prisma.inventoryRecord.findMany({
          where: {
            status: "AVAILABLE",
            expiryDate: { lte: cutoff, gte: new Date() },
          },
          include: { ingredient: { select: { name: true } } },
          take: 20,
        }),

        // Sin stock
        prisma.ingredient.findMany({
          where: { status: "ACTIVE", currentStock: { lte: 0 } },
          select: { id: true, name: true },
          take: 20,
        }),
      ])

      return {
        lowStock: lowStock.map((i) => ({
          name: i.name,
          current: i.currentStock,
          minimum: i.minStock,
          deficit: (i.minStock ?? 0) - (i.currentStock ?? 0),
        })),
        expiringItems: expiring.map((r) => ({
          ingredient: r.ingredient.name,
          quantity: r.quantity,
          expiryDate: r.expiryDate?.toISOString().split("T")[0],
          daysLeft: r.expiryDate ? Math.ceil((r.expiryDate.getTime() - Date.now()) / 86400000) : null,
        })),
        outOfStock: outOfStock.map((i) => ({ name: i.name })),
        totalAlerts: lowStock.length + expiring.length + outOfStock.length,
      }
    },
  })
}

function createComparePeriodsTool() {
  return tool({
    description:
      "Compara food cost entre dos periodos consecutivos para detectar tendencias. " +
      "Calcula deltas de coste real, teórico y food cost %.",
    inputSchema: z.object({
      months: z.number().optional().describe("Meses del periodo actual (default: 1). Se comparará con el periodo anterior equivalente."),
    }),
    execute: async (input: { months?: number }) => {
      const m = input.months ?? 1
      const currentStart = new Date(monthsAgo(m))
      const currentEnd = new Date(today())
      const previousStart = new Date(monthsAgo(m * 2))
      const previousEnd = currentStart

      const [current, previous] = await Promise.all([
        prisma.foodCostSnapshot.findMany({
          where: { periodStart: { gte: currentStart }, periodEnd: { lte: currentEnd } },
        }),
        prisma.foodCostSnapshot.findMany({
          where: { periodStart: { gte: previousStart }, periodEnd: { lt: previousEnd } },
        }),
      ])

      const sum = (arr: typeof current) => ({
        real: arr.reduce((s, r) => s + r.realCostTotal, 0),
        theo: arr.reduce((s, r) => s + r.theoreticalCostTotal, 0),
        revenue: arr.reduce((s, r) => s + (r.periodRevenue ?? 0), 0),
      })

      const cur = sum(current)
      const prev = sum(previous)

      const delta = (c: number, p: number) => p > 0 ? Math.round(((c - p) / p) * 10000) / 100 : null

      return {
        current: {
          realCost: Math.round(cur.real * 100) / 100,
          theoreticalCost: Math.round(cur.theo * 100) / 100,
          revenue: Math.round(cur.revenue * 100) / 100,
          foodCostPercent: cur.revenue > 0 ? Math.round((cur.real / cur.revenue) * 10000) / 100 : null,
        },
        previous: {
          realCost: Math.round(prev.real * 100) / 100,
          theoreticalCost: Math.round(prev.theo * 100) / 100,
          revenue: Math.round(prev.revenue * 100) / 100,
          foodCostPercent: prev.revenue > 0 ? Math.round((prev.real / prev.revenue) * 10000) / 100 : null,
        },
        deltas: {
          realCostDelta: delta(cur.real, prev.real),
          theoreticalCostDelta: delta(cur.theo, prev.theo),
          revenueDelta: delta(cur.revenue, prev.revenue),
        },
      }
    },
  })
}

// ─── Definición del agente ──────────────────────────────────

export const SHERLOCK_AGENT: AgentDefinition = {
  id: "sherlock-agent",
  name: "Sherlock Agent",
  description:
    "Detective de costes alimentarios. Analiza food cost, detecta anomalías, " +
    "investiga causas raíz y genera insights accionables.",
  icon: "Search",

  systemPrompt:
    `Eres Sherlock, el agente de detección de anomalías de coste alimentario del grupo Voltereta.

Tu misión es analizar los datos de food cost y detectar problemas:

1. ANALIZAR: Obtén KPIs globales y por local. Busca varianzas significativas (>15%).
2. INVESTIGAR: Si hay anomalías, profundiza — ¿qué locales? ¿qué ingredientes? ¿qué tipo de merma?
3. COMPARAR: Contrasta con periodos anteriores para confirmar si es una tendencia o un pico puntual.
4. ALERTAR: Genera insights y escala si detectas problemas graves (food cost >35%, varianza >25%).

UMBRALES DE ALERTA:
- Varianza real vs teórico > 15%: investigar
- Varianza > 25%: escalar a humano
- Food cost % > 35%: escalar a humano
- Spike de merma > 50% vs periodo anterior: investigar

SEÑALES DE FINALIZACIÓN:
- Si todo está dentro de parámetros, responde "No hay anomalías. Todo dentro de parámetros."
- Si has generado insights y/o escalado, responde "Análisis finalizado."`,
  maxTokensPerStep: AGENT_DEFAULTS.maxTokensPerStep,
  temperature: 0.2,

  tools: () => ({
    getFoodCostKpis: createGetFoodCostKpisTool(),
    getCostByLocation: createGetCostByLocationTool(),
    getWasteAnalysis: createGetWasteAnalysisTool(),
    getStockAlerts: createGetStockAlertsTool(),
    comparePeriods: createComparePeriodsTool(),
  }),

  triggers: [
    { type: "event", config: "sync.food-cost.completed" },
  ],

  maxStepsPerRun: 8,
  maxDurationMs: 240_000,
  maxTokensPerRun: 10_000,
  cooldownMs: 300_000, // 5min entre runs

  escalationPolicy: {
    onLowConfidence: 0.6,
    onError: "escalate",
    maxRetries: 1,
    escalateTo: "notification",
  },

  rbacResource: "sherlock",
  module: "sherlock",
}

registerAgent(SHERLOCK_AGENT)
