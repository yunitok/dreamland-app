import { NextRequest, NextResponse } from "next/server"
import { registerExternalRun } from "@/lib/process-runner"
import { ProcessRunStatus, ProcessTriggerType } from "@prisma/client"
import { getProcessDefinition } from "@/modules/admin/domain/process-registry"

/**
 * POST /api/processes/callback
 *
 * Callback para que n8n (u otro orquestador externo) reporte el resultado
 * de un proceso ejecutado externamente.
 *
 * Headers: x-n8n-webhook-secret | Authorization: Bearer CRON_SECRET
 * Body: { runId?, processSlug, status, output?, error?, phases?, triggerType?, durationMs? }
 */
export async function POST(request: NextRequest) {
  // Autenticación dual: n8n secret o cron secret
  const n8nSecret = request.headers.get("x-n8n-webhook-secret")
  const authHeader = request.headers.get("authorization")
  const expectedN8n = process.env.N8N_WEBHOOK_SECRET
  const expectedCron = process.env.CRON_SECRET

  const isAuthed =
    (expectedN8n && n8nSecret === expectedN8n) ||
    (expectedCron && authHeader === `Bearer ${expectedCron}`)

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      runId,
      processSlug,
      status,
      output,
      error: errorMsg,
      phases,
      triggerType,
      durationMs,
    } = body as {
      runId?: string
      processSlug?: string
      status?: string
      output?: Record<string, unknown>
      error?: string
      phases?: unknown[]
      triggerType?: string
      durationMs?: number
    }

    if (!processSlug) {
      return NextResponse.json({ error: "Missing processSlug" }, { status: 400 })
    }

    // Validar que el proceso existe en el registry
    if (!getProcessDefinition(processSlug)) {
      return NextResponse.json(
        { error: `Unknown process: ${processSlug}` },
        { status: 400 }
      )
    }

    // Mapear status string a enum
    const statusEnum = mapStatus(status)
    if (!statusEnum) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Use: SUCCESS, FAILED, RUNNING, CANCELLED` },
        { status: 400 }
      )
    }

    const id = await registerExternalRun({
      runId,
      processSlug,
      triggerType: mapTriggerType(triggerType),
      status: statusEnum,
      durationMs,
      output,
      error: errorMsg,
      phases,
    })

    return NextResponse.json({ success: true, runId: id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function mapStatus(s?: string): ProcessRunStatus | null {
  if (!s) return null
  const upper = s.toUpperCase()
  if (upper in ProcessRunStatus) return upper as ProcessRunStatus
  return null
}

function mapTriggerType(t?: string): ProcessTriggerType {
  if (!t) return ProcessTriggerType.CRON
  const upper = t.toUpperCase()
  if (upper in ProcessTriggerType) return upper as ProcessTriggerType
  return ProcessTriggerType.WEBHOOK
}
