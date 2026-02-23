/**
 * Sincronización GStock → Sherlock DB → RAG Knowledge Base
 *
 * Sincroniza recetas, ingredientes, categorías, familias, proveedores y
 * unidades de medida desde GStock hacia la base de datos de Sherlock.
 * Opcionalmente genera KB entries en Pinecone para el chatbot ATC.
 *
 * Ejecutar:
 *   npx tsx scripts/sync-gstock-recipes.ts            # Sync completo
 *   npx tsx scripts/sync-gstock-recipes.ts --skip-kb  # Solo DB (sin KB/Pinecone)
 *   npx tsx scripts/sync-gstock-recipes.ts --dry-run  # Sin escritura
 *   npx tsx scripts/sync-gstock-recipes.ts --verbose  # Log detallado
 */

import "dotenv/config"
import { syncGstockToSherlock } from "../src/modules/sherlock/domain/gstock-sync/sync-orchestrator"
import type { SyncReport } from "../src/modules/sherlock/domain/gstock-sync/types"

// ─── Colores ANSI ────────────────────────────────────────────────
const RESET = "\x1b[0m"
const BOLD  = "\x1b[1m"
const DIM   = "\x1b[2m"
const RED   = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const CYAN  = "\x1b[36m"

const b = (s: string) => BOLD + s + RESET
const d = (s: string) => DIM + s + RESET
const r = (s: string) => RED + s + RESET
const g = (s: string) => GREEN + s + RESET
const y = (s: string) => YELLOW + s + RESET
const cy = (s: string) => CYAN + s + RESET

// ─── Argparse ─────────────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun  = args.includes("--dry-run")
const skipKB  = args.includes("--skip-kb")
const verbose = args.includes("--verbose")

// ─── Formato de duración ──────────────────────────────────────────
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── Impresión del informe ────────────────────────────────────────
function printReport(report: SyncReport) {
  console.log("")
  console.log(b("═".repeat(55)))
  console.log(b("  RESUMEN DEL SYNC"))
  console.log(b("═".repeat(55)))

  let totalCreated = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const phase of report.phases) {
    const created = phase.created > 0 ? g(`+${phase.created}`) : d("0")
    const updated = phase.updated > 0 ? cy(`~${phase.updated}`) : d("0")
    const errIcon = phase.errors.length ? r(` ⚠ ${phase.errors.length} errores`) : ""
    const duration = d(`(${formatMs(phase.durationMs)})`)

    console.log(
      `  ${b(phase.phase.padEnd(28))} ${created} creados · ${updated} actualizados ${duration}${errIcon}`
    )

    totalCreated += phase.created
    totalUpdated += phase.updated
    totalSkipped += phase.skipped

    if (phase.errors.length && verbose) {
      for (const err of phase.errors.slice(0, 3)) {
        console.log(`    ${r("→")} ${d(err)}`)
      }
      if (phase.errors.length > 3) {
        console.log(`    ${d(`... y ${phase.errors.length - 3} errores más`)}`)
      }
    }
  }

  if (report.kbEntries > 0) {
    console.log(`  ${b("KB entries (RAG)".padEnd(28))} ${g(String(report.kbEntries))} entries indexadas`)
  }

  console.log("")
  console.log(`  Total creados:    ${g(String(totalCreated))}`)
  console.log(`  Total actualizados: ${cy(String(totalUpdated))}`)
  if (totalSkipped > 0) console.log(`  Total omitidos:   ${y(String(totalSkipped))}`)

  const globalErrors = report.errors.filter(e => e.startsWith("Error fatal"))
  if (globalErrors.length) {
    console.log(`  ${r("Errores fatales:")} ${globalErrors.length}`)
    for (const err of globalErrors) console.log(`    ${r("→")} ${err}`)
  }

  console.log(`  Tiempo total:     ${b(formatMs(report.durationMs))}`)
  console.log(b("═".repeat(55)))
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const now = new Date().toLocaleString("es-ES")
  console.log("")
  console.log(b("═".repeat(55)))
  console.log(b("  GStock → Sherlock Sync"))
  console.log(d(`  Dreamland App · ${now}`))
  if (dryRun) console.log(y("  ⚠ DRY RUN — no se escribirá nada en la DB"))
  if (skipKB) console.log(d("  ℹ Knowledge Base (RAG) omitido (--skip-kb)"))
  console.log(b("═".repeat(55)))
  console.log("")

  const report = await syncGstockToSherlock({
    dryRun,
    skipKB,
    verbose,
    onProgress: (phase, detail) => {
      process.stdout.write(`  ⏳ ${cy(phase)}: ${d(detail)}\r`)
      if (detail.includes("creada") || detail.includes("actualizada") || detail.includes("indexada")) {
        console.log(`  ${g("✓")} ${cy(phase)}: ${detail}`)
      }
    },
  })

  printReport(report)

  const hasErrors = report.errors.length > 0
  process.exit(hasErrors ? 1 : 0)
}

main().catch(err => {
  console.error(r("\n[FATAL] ") + (err instanceof Error ? err.message : String(err)))
  if (verbose && err instanceof Error) console.error(err.stack)
  process.exit(1)
})
