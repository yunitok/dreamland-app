import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../src/lib/prisma'

interface ProjectEntry {
  id: number
  titulo_proyecto: string
  departamento_origen: string
  tipo: string
  prioridad_detectada: string
  descripcion_corta: string
  fuente_cita: string
  area_funcional: string
  departamento_legacy: string
}

function buildProjectCatalogMarkdown(projects: ProjectEntry[]): string {
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  const prioridadEmoji: Record<string, string> = {
    'Alta': '🔴',
    'Media': '🟡',
    'Baja': '🟢',
  }

  const tipoEmoji: Record<string, string> = {
    'Problema': '⚠️',
    'Oportunidad': '🚀',
    'Idea': '💡',
  }

  const rows = projects
    .map(p => {
      const prio = `${prioridadEmoji[p.prioridad_detectada] ?? ''} ${p.prioridad_detectada}`
      const tipo = `${tipoEmoji[p.tipo] ?? ''} ${p.tipo}`
      return `| ${p.id} | **${p.titulo_proyecto}** | ${p.departamento_origen} | ${tipo} | ${prio} | ${p.descripcion_corta} |`
    })
    .join('\n')

  return `# 📋 Catálogo de Proyectos e Iniciativas — Dreamland

> **Documento de Descubrimiento Organizacional**
> Fecha de importación: ${today}
> Total de iniciativas identificadas: **${projects.length}**

---

## Resumen por Tipo

| Tipo | Cantidad |
| :--- | :---: |
| ⚠️ Problemas | ${projects.filter(p => p.tipo === 'Problema').length} |
| 🚀 Oportunidades | ${projects.filter(p => p.tipo === 'Oportunidad').length} |
| 💡 Ideas | ${projects.filter(p => p.tipo === 'Idea').length} |

## Resumen por Prioridad

| Prioridad | Cantidad |
| :--- | :---: |
| 🔴 Alta | ${projects.filter(p => p.prioridad_detectada === 'Alta').length} |
| 🟡 Media | ${projects.filter(p => p.prioridad_detectada === 'Media').length} |
| 🟢 Baja | ${projects.filter(p => p.prioridad_detectada === 'Baja').length} |

---

## Listado Completo de Iniciativas

| # | Proyecto | Departamento | Tipo | Prioridad | Descripción |
| :---: | :--- | :--- | :--- | :--- | :--- |
${rows}

---

*Datos extraídos del proceso de descubrimiento y entrevistas con stakeholders de Dreamland.*
`
}

async function main() {
  console.log('🚀 Iniciando importación de informes legacy...\n')

  const reportsDir = path.join(process.cwd(), 'data', 'reports')

  // --- 1. Informe psicosocial ---
  const sentimentPath = path.join(reportsDir, 'dreamland_feeling_projects.txt')
  const sentimentContent = fs.readFileSync(sentimentPath, 'utf-8')

  const existingSentiment = await prisma.report.findFirst({
    where: { type: 'SentimentAnalysis', title: { contains: 'Psicosocial' } }
  })

  if (existingSentiment) {
    console.log('⚠️  El informe de Análisis Psicosocial ya existe en BD, se omite.')
  } else {
    const sentimentReport = await prisma.report.create({
      data: {
        title: 'Análisis Psicosocial Organizacional — Dreamland',
        type: 'SentimentAnalysis',
        content: sentimentContent,
        authorId: null,
        projectId: null,
      }
    })
    console.log(`✅ Informe psicosocial creado: ${sentimentReport.id}`)
    console.log(`   Título: ${sentimentReport.title}`)
    console.log(`   Chars: ${sentimentReport.content.length}\n`)
  }

  // --- 2. Catálogo de proyectos ---
  const catalogPath = path.join(reportsDir, 'dreamland - projects.txt')
  const catalogRaw = fs.readFileSync(catalogPath, 'utf-8')
  const catalogData: ProjectEntry[] = JSON.parse(catalogRaw)

  const existingCatalog = await prisma.report.findFirst({
    where: { type: 'ProjectCatalog', title: { contains: 'Catálogo' } }
  })

  if (existingCatalog) {
    console.log('⚠️  El Catálogo de Proyectos ya existe en BD, se omite.')
  } else {
    const markdownContent = buildProjectCatalogMarkdown(catalogData)

    const catalogReport = await prisma.report.create({
      data: {
        title: 'Catálogo de Proyectos e Iniciativas — Dreamland',
        type: 'ProjectCatalog',
        content: markdownContent,
        metadata: catalogData as any,
        authorId: null,
        projectId: null,
      }
    })
    console.log(`✅ Catálogo de proyectos creado: ${catalogReport.id}`)
    console.log(`   Título: ${catalogReport.title}`)
    console.log(`   Iniciativas: ${catalogData.length}`)
    console.log(`   Chars: ${catalogReport.content.length}\n`)
  }

  console.log('✅ Importación completada.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
