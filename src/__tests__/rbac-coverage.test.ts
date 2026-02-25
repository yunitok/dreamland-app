/**
 * Test de cobertura RBAC
 *
 * Verifica que todas las server actions exportadas estén protegidas con
 * alguna de las llamadas de autorización del sistema RBAC.
 *
 * Si un nuevo server action falla este test, añade una de estas llamadas
 * al inicio de la función:
 *   - requirePermission(resource, action)
 *   - requireAuth()
 *   - hasProjectAccess(projectId, role)
 *   - getSession() + validación manual
 */

import { describe, it, expect } from 'vitest'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = join(process.cwd(), 'src')

// Patrones que indican una función está protegida
const RBAC_GUARDS = [
  'requirePermission(',
  'requireAuth(',
  'hasProjectAccess(',
  'getSession(',
  'getAccessibleProjectIds(',
  'getCurrentUserId(',
]

// Archivos con server actions que no requieren autenticación (lista blanca)
const EXEMPT_FILES: string[] = []

// Funciones exportadas que no requieren autenticación (lectura pública, utilidades)
const EXEMPT_FUNCTIONS: string[] = [
  // Añadir aquí si hay alguna excepción justificada
]

async function findActionFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        // Excluir node_modules, .next, __tests__
        if (!['node_modules', '.next', '__tests__', '.git'].includes(entry.name)) {
          await walk(fullPath)
        }
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.spec.ts')
      ) {
        // Solo archivos que están en un directorio llamado 'actions'
        if (currentDir.endsWith('actions') || currentDir.endsWith('actions\\') || currentDir.endsWith('actions/')) {
          files.push(fullPath)
        }
      }
    }
  }

  await walk(dir)
  return files
}

function extractExportedFunctions(content: string): string[] {
  const functions: string[] = []

  // export async function nombre(
  const asyncFnRegex = /^export\s+async\s+function\s+(\w+)\s*\(/gm
  let match: RegExpExecArray | null
  while ((match = asyncFnRegex.exec(content)) !== null) {
    functions.push(match[1])
  }

  // export const nombre = async (
  const constFnRegex = /^export\s+const\s+(\w+)\s*=\s*async\s*(?:\([^)]*\)|[^=]+)\s*=>/gm
  while ((match = constFnRegex.exec(content)) !== null) {
    functions.push(match[1])
  }

  return functions
}

function extractFunctionBody(content: string, fnName: string): string {
  // Buscar el inicio de la función
  const startRegex = new RegExp(
    `(?:export\\s+async\\s+function\\s+${fnName}\\s*\\([^)]*\\)|export\\s+const\\s+${fnName}\\s*=\\s*async)`,
    'm'
  )
  const startMatch = startRegex.exec(content)
  if (!startMatch) return ''

  // Extraer desde el inicio hasta el final de la función (buscando el bloque {})
  const fromStart = content.slice(startMatch.index)
  let depth = 0
  let inBody = false
  let bodyStart = 0

  for (let i = 0; i < fromStart.length; i++) {
    if (fromStart[i] === '{') {
      if (!inBody) {
        inBody = true
        bodyStart = i
      }
      depth++
    } else if (fromStart[i] === '}') {
      depth--
      if (depth === 0 && inBody) {
        return fromStart.slice(bodyStart, i + 1)
      }
    }
  }

  return fromStart.slice(0, 500) // fallback: primeros 500 chars
}

function hasRBACGuard(body: string): boolean {
  return RBAC_GUARDS.some((guard) => body.includes(guard))
}

describe('Cobertura RBAC — Server Actions', () => {
  it('todas las server actions exportadas deben tener protección RBAC', async () => {
    const actionFiles = await findActionFiles(ROOT)
    expect(actionFiles.length).toBeGreaterThan(0)

    const unprotected: { file: string; function: string }[] = []

    for (const filePath of actionFiles) {
      const relPath = relative(ROOT, filePath)

      // Saltar archivos exentos
      if (EXEMPT_FILES.some((exempt) => filePath.includes(exempt))) continue

      const content = await readFile(filePath, 'utf-8')

      // Solo analizar archivos con 'use server'
      if (!content.includes('"use server"') && !content.includes("'use server'")) continue

      const functions = extractExportedFunctions(content)

      for (const fnName of functions) {
        if (EXEMPT_FUNCTIONS.includes(fnName)) continue

        const body = extractFunctionBody(content, fnName)
        if (!hasRBACGuard(body)) {
          unprotected.push({ file: relPath, function: fnName })
        }
      }
    }

    if (unprotected.length > 0) {
      const report = unprotected
        .map((u) => `  ❌ ${u.file} → ${u.function}()`)
        .join('\n')
      console.error(`\nFunciones sin protección RBAC:\n${report}\n`)
    }

    expect(unprotected).toHaveLength(0)
  })
})
