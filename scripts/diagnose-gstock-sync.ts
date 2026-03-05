/**
 * Diagnóstico de runs atascados de GStock Sync.
 *
 * Uso:
 *   npx tsx scripts/diagnose-gstock-sync.ts          # Solo muestra estado
 *   npx tsx scripts/diagnose-gstock-sync.ts --fix     # Marca runs RUNNING como FAILED
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const DIM = "\x1b[2m"
const BOLD = "\x1b[1m"

const fix = process.argv.includes("--fix")

async function main() {
  console.log(`\n${CYAN}${BOLD}=== GStock Sync — Diagnóstico ===${RESET}\n`)

  // 1. Runs en estado RUNNING
  const running = await prisma.processRun.findMany({
    where: { processSlug: "gstock-sync", status: "RUNNING" },
    orderBy: { startedAt: "desc" },
  })

  if (running.length === 0) {
    console.log(`${GREEN}No hay runs atascados en RUNNING${RESET}\n`)
  } else {
    console.log(`${RED}${BOLD}${running.length} run(s) atascados en RUNNING:${RESET}\n`)

    for (const run of running) {
      const stuckMinutes = Math.round((Date.now() - run.startedAt.getTime()) / 60000)
      const phases = (run.phases as unknown[] | null) ?? []

      console.log(`  ${BOLD}ID:${RESET}       ${run.id}`)
      console.log(`  ${BOLD}Inicio:${RESET}   ${run.startedAt.toISOString()} ${DIM}(hace ${stuckMinutes} min)${RESET}`)
      console.log(`  ${BOLD}Trigger:${RESET}  ${run.triggerType} por ${run.triggeredBy ?? "desconocido"}`)
      console.log(`  ${BOLD}Fases:${RESET}    ${phases.length}/8 completadas`)

      if (phases.length > 0) {
        for (const p of phases as Array<{ phase?: string; created?: number; updated?: number; errors?: string[]; durationMs?: number }>) {
          const status = (p.errors?.length ?? 0) > 0 ? `${RED}ERRORS(${p.errors!.length})${RESET}` : `${GREEN}OK${RESET}`
          console.log(`            ${DIM}${p.phase?.padEnd(25) ?? "?"} | ${p.created ?? 0} creados, ${p.updated ?? 0} actualizados | ${status} | ${p.durationMs ?? 0}ms${RESET}`)
        }
      }

      if (run.error) {
        console.log(`  ${BOLD}Error:${RESET}    ${RED}${run.error}${RESET}`)
      }

      if (fix) {
        await prisma.processRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            durationMs: Date.now() - run.startedAt.getTime(),
            error: `Diagnóstico manual: proceso atascado ${stuckMinutes} min con ${phases.length}/8 fases. Marcado FAILED.`,
          },
        })
        console.log(`  ${YELLOW}${BOLD}→ Marcado como FAILED${RESET}`)
      }

      console.log()
    }
  }

  // 2. Últimos 10 runs para contexto
  const recent = await prisma.processRun.findMany({
    where: { processSlug: "gstock-sync" },
    orderBy: { startedAt: "desc" },
    take: 10,
  })

  console.log(`${CYAN}${BOLD}=== Últimos 10 runs ===${RESET}\n`)

  for (const r of recent) {
    const statusColor = r.status === "SUCCESS" ? GREEN : r.status === "FAILED" ? RED : YELLOW
    const phases = (r.phases as unknown[] | null) ?? []
    const duration = r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : "N/A"
    const errorSnippet = r.error ? ` | ${r.error.slice(0, 80)}` : ""

    console.log(
      `  ${statusColor}${r.status.padEnd(10)}${RESET} | ${r.startedAt.toISOString()} | ${DIM}${r.triggerType.padEnd(6)}${RESET} | ${phases.length}/8 fases | ${duration}${errorSnippet}`
    )
  }

  console.log()

  if (!fix && running.length > 0) {
    console.log(`${YELLOW}Ejecuta con --fix para marcar los runs atascados como FAILED:${RESET}`)
    console.log(`  npx tsx scripts/diagnose-gstock-sync.ts --fix\n`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
