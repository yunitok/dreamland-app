/**
 * Calidad Agent — Auditorías automáticas de calidad de datos.
 *
 * Ejecuta auditorías sobre los datos sincronizados desde GStock,
 * detecta degradación de calidad y genera alertas.
 *
 * Trigger: evento "sync.gstock.completed"
 */

import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { registerAgent } from "@/lib/agents/agent-registry"
import { AGENT_DEFAULTS } from "@/lib/agents/types"
import type { AgentDefinition } from "@/lib/agents/types"
import { runFullAuditCore } from "@/modules/calidad/domain/data-quality/audit-core"

// ─── Tools ───────────────────────────────────────────────────

function createRunAuditTool() {
  return tool({
    description:
      "Ejecuta una auditoría completa de calidad de datos sobre todos los endpoints de GStock. " +
      "Analiza duplicados, inconsistencias de capitalización, espacios, diacríticos, etc. " +
      "Retorna un health score global (0-100) y detalles por endpoint.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const report = await runFullAuditCore()
        return {
          durationMs: report.durationMs,
          overallScore: report.overallScore,
          totalEndpoints: report.totalEndpoints,
          auditedEndpoints: report.auditedEndpoints,
          failedEndpoints: report.failedEndpoints,
          message: report.message,
          errors: report.errors,
          endpointSummaries: report.endpoints
            .filter((e) => e.summary.totalIssues > 0)
            .map((e) => ({
              endpoint: e.label,
              healthScore: e.summary.healthScore,
              records: e.recordCount,
              critical: e.summary.criticalCount,
              warnings: e.summary.warningCount,
              topIssues: e.fields
                .flatMap((f) => f.issues.filter((i) => i.severity === "critical"))
                .slice(0, 5)
                .map((i) => ({ field: i.field, type: i.type, value: i.value, suggestion: i.suggestion })),
            })),
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    },
  })
}

function createGetDataConsistencyTool() {
  return tool({
    description:
      "Verifica la consistencia entre datos de GStock sincronizados y la base de datos local. " +
      "Compara conteos de recetas, ingredientes y categorías.",
    inputSchema: z.object({}),
    execute: async () => {
      const [recipes, ingredients, categories, families, suppliers] = await Promise.all([
        prisma.recipe.count(),
        prisma.ingredient.count({ where: { status: "ACTIVE" } }),
        prisma.recipeCategory.count(),
        prisma.recipeFamily.count(),
        prisma.supplier.count(),
      ])

      const allRecipes = await prisma.recipe.count()
      const recipesWithCategory = await prisma.recipe.count({
        where: { categoryId: { not: undefined } },
      })
      const recipesWithoutCategory = allRecipes - recipesWithCategory

      const ingredientsWithoutCost = await prisma.ingredient.count({
        where: { status: "ACTIVE", cost: { lte: 0 } },
      })

      const recipesWithoutIngredients = await prisma.recipe.count({
        where: { ingredients: { none: {} } },
      })

      return {
        counts: { recipes, ingredients, categories, families, suppliers },
        dataIssues: {
          recipesWithoutCategory,
          ingredientsWithoutCost,
          recipesWithoutIngredients,
        },
        healthIndicators: {
          categoryCoverage: recipes > 0 ? Math.round(((recipes - recipesWithoutCategory) / recipes) * 100) : 100,
          costCoverage: ingredients > 0 ? Math.round(((ingredients - ingredientsWithoutCost) / ingredients) * 100) : 100,
          ingredientCoverage: recipes > 0 ? Math.round(((recipes - recipesWithoutIngredients) / recipes) * 100) : 100,
        },
      }
    },
  })
}

const compareHistorySchema = z.object({
  currentScore: z.number().describe("Health score actual (0-100)"),
  currentIssues: z.number().describe("Número total de issues actuales"),
})

function createCompareWithHistoryTool() {
  return tool({
    description:
      "Compara la auditoría actual con memorias de auditorías previas. " +
      "Detecta si la calidad ha mejorado o empeorado.",
    inputSchema: compareHistorySchema,
    execute: async (input: z.infer<typeof compareHistorySchema>) => {
      const previousAudits = await prisma.agentMemory.findMany({
        where: {
          agentId: "calidad-agent",
          type: "insight",
          content: { contains: "health score" },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { content: true, createdAt: true },
      })

      return {
        currentScore: input.currentScore,
        currentIssues: input.currentIssues,
        previousAudits: previousAudits.map((a) => ({
          summary: a.content,
          date: a.createdAt.toISOString().split("T")[0],
        })),
        hasPreviousData: previousAudits.length > 0,
        recommendation: input.currentScore >= 80
          ? "Calidad aceptable. Mantener monitorización."
          : input.currentScore >= 60
            ? "Calidad mejorable. Revisar issues críticos."
            : "Calidad baja. Requiere intervención urgente.",
      }
    },
  })
}

// ─── Definición del agente ──────────────────────────────────

export const CALIDAD_AGENT: AgentDefinition = {
  id: "calidad-agent",
  name: "Calidad Agent",
  description:
    "Auditor de calidad de datos. Ejecuta auditorías periódicas sobre datos de GStock, " +
    "detecta degradación y genera informes de salud de datos.",
  icon: "ClipboardCheck",
  module: "calidad",

  systemPrompt:
    `Eres el agente de calidad de datos del grupo Voltereta.

Tu misión es auditar la calidad de los datos sincronizados desde GStock:

1. AUDITAR: Ejecuta la auditoría completa de calidad sobre los endpoints de GStock.
2. VERIFICAR: Comprueba la consistencia de datos locales (recetas sin categoría, ingredientes sin coste).
3. COMPARAR: Contrasta con auditorías previas — ¿mejora o empeora la calidad?
4. REPORTAR: Genera un insight con el health score y los problemas principales.

UMBRALES:
- Health score < 60: escalar como urgente
- Health score 60-80: generar insight y recordar para seguimiento
- Health score > 80: registrar y continuar
- Issues críticos (duplicados potenciales) > 10: escalar

SEÑALES DE FINALIZACIÓN:
- Cuando hayas completado la auditoría y registrado el insight, responde "Análisis finalizado."
- Si la calidad es crítica (<60), escala y responde "Escalación necesaria."`,
  maxTokensPerStep: AGENT_DEFAULTS.maxTokensPerStep,
  temperature: 0.1,

  tools: () => ({
    runFullAudit: createRunAuditTool(),
    getDataConsistency: createGetDataConsistencyTool(),
    compareWithHistory: createCompareWithHistoryTool(),
  }),

  triggers: [
    { type: "event", config: "sync.gstock.completed" },
  ],

  maxStepsPerRun: 6,
  maxDurationMs: 300_000,
  maxTokensPerRun: 6_000,
  cooldownMs: 3600_000,

  escalationPolicy: {
    onLowConfidence: 0.5,
    onError: "skip",
    maxRetries: 1,
    escalateTo: "notification",
  },

  rbacResource: "calidad",
}

registerAgent(CALIDAD_AGENT)
