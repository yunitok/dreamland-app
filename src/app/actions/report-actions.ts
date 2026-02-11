'use server'

import { prisma } from '@/lib/prisma'
import { genAI } from '@/lib/gemini'
import { requireAuth } from '@/lib/actions/rbac'
import { getAIProvider } from '@/lib/ai/factory'

export async function generateProjectReport(projectId: string) {
  // 1. Auth Check
  // 1. Auth Check
  const auth = await requireAuth()
  if (!auth.authenticated) throw new Error('Unauthorized')

  // 2. Fetch Project Data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      lists: {
        include: {
          tasks: {
            where: {
              OR: [
                { status: { isClosed: false } }, // Open tasks
                { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Closed recently
              ]
            },
            include: {
              status: true,
              assignee: true,
              tags: true
            }
          }
        }
      },
      risks: true
    }
  })

  if (!project) throw new Error('Project not found')

  // 3. Fetch Team Sentiment (Global for now, or filtered by Department if Project has one)
  const sentiment = await prisma.teamMood.findMany({
    where: {
      detectedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } // Last 2 weeks
    },
    orderBy: { detectedAt: 'desc' },
    take: 5
  })

  // 4. Prepare Context for AI
  const today = new Date().toLocaleDateString('es-ES')
  const openTasks = project.lists.flatMap(l => l.tasks.filter(t => !t.status.isClosed))
  const completedRecent = project.lists.flatMap(l => l.tasks.filter(t => t.status.isClosed))
  
  const highPriority = openTasks.filter(t => t.tags.some(tag => tag.name.toLowerCase().includes('urgent') || tag.name.toLowerCase().includes('high')))
  const risks = project.risks.map(r => `${r.riskLevel}: ${r.reason}`)

  const prompt = `
    ACT AS: Senior Project Manager.
    TASK: Write a Weekly Status Report for Project "${project.title}".
    DATE: ${today}
    LANGUAGE: Spanish (Professional, Executive Tone).

    DATA:
    - Description: ${project.description}
    - Status: ${project.status}
    - Progress: ${project.progress}%
    
    - Tasks Completed (Last 7 days): ${completedRecent.length}
      ${completedRecent.map(t => `- ${t.title} (${t.assignee?.name || 'Unassigned'})`).join('\n')}
    
    - Open Tasks (Next Actions): ${openTasks.length}
    - High Priority / Blockers:
      ${highPriority.map(t => `- [URGENT] ${t.title}`).join('\n')}
      ${risks.join('\n')}
    
    - Team Sentiment (Reference):
      ${sentiment.map(s => `- ${s.departmentName}: ${s.sentimentScore}/100 (${s.dominantEmotion})`).join('\n')}

    OUTPUT FORMAT (Markdown - Estilo Premium):
    # Reporte de Estado: ${project.title}
    
    > **Resumen Ejecutivo:** 
    > [Escribe aquí un párrafo conciso sobre el estado general del proyecto, destacando si está en camino, en riesgo o bloqueado.]
    
    ---
    
    ## 📊 Datos Clave del Proyecto
    | Métrica | Detalle |
    | :--- | :--- |
    | **Fecha de Informe** | ${today} |
    | **Progreso Global** | ${project.progress}% |
    | **Estado Actual** | ${project.status} |
    | **Tareas Completadas (7d)** | ${completedRecent.length} |
    
    ---
    
    ## 🚀 Logros y Avances (Semanal)
    [Lista con viñetas de los hitos alcanzados. Si no hay tareas completadas, menciona el avance en las tareas en curso.]
    
    ---
    
    ## ⚠️ Riesgos y Próximos Pasos
    ### Próximas Acciones Prioritarias
    ${highPriority.length > 0 ? highPriority.map(t => `- **[ALTA PRIORIDAD]** ${t.title}`).join('\n') : '- No se han detectado tareas bloqueantes críticas.'}
    
    ### Análisis de Riesgos
    ${risks.length > 0 ? risks.map(r => `- ${r}`).join('\n') : '- El proyecto no presenta riesgos declarados actualmente.'}
    
    ---
    
    ## 🧠 Salud y Sentimiento del Equipo
    | Departamento | Puntuación | Emoción Predominante |
    | :--- | :---: | :--- |
    ${sentiment.map(s => `| ${s.departmentName} | **${s.sentimentScore}/100** | ${s.dominantEmotion} |`).join('\n')}
    
    ### Análisis de Sentimiento
    [Proporciona un breve análisis de cómo el ánimo del equipo puede afectar la productividad del proyecto.]
    
    ---
    _Este informe ha sido generado automáticamente por Dreamland AI Hub_
    `

  // 5. Call LLM (using the lightweight generateText to avoid redundant context)
  const provider = getAIProvider()
  const aiResponse = await provider.generateText(projectId, prompt)
  
  if (!aiResponse.success || !aiResponse.message) {
      throw new Error('AI Content generation failed: ' + aiResponse.error)
  }

  const text = aiResponse.message
  const title = `Reporte - ${project.title} - ${today}`

  // 6. Save Report to DB
  const report = await prisma.report.create({
    data: {
      title,
      content: text,
      type: 'Weekly', // Default for now
      projectId: project.id,
      authorId: auth.userId
    }
  })

  return {
    id: report.id,
    title: report.title,
    content: report.content,
    redirectUrl: `/reports/${report.id}`
  }
}
