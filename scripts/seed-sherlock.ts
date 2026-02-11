
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🔍 Iniciando Sembrado de Sherlock (ES) Detallado...')

  // 1. Obtener Estado por Defecto
  const defaultStatus = await prisma.taskStatus.findFirst({
    where: { isDefault: true }
  })

  if (!defaultStatus) {
    throw new Error('No se encontró estado por defecto. Por favor ejecuta el seed principal primero.')
  }

  // 2. Crear/Reiniciar Proyecto
  const projectTitle = "Sherlock: Desviación de Costes"
  
  // Buscar proyecto existente
  const existingProject = await prisma.project.findFirst({
    where: { title: projectTitle }
  })

  if (existingProject) {
    console.log(`⚠️ El proyecto "${projectTitle}" ya existe. Eliminándolo para regenerar con planificación detallada...`)
    await prisma.project.delete({
      where: { id: existingProject.id }
    })
    console.log('🗑️ Proyecto eliminado.')
  }

  console.log(`🆕 Creando Proyecto: ${projectTitle}`)
  const project = await prisma.project.create({
    data: {
      title: projectTitle,
      department: "Operaciones",
      type: "Initiative",
      priority: "High",
      status: "Active",
      description: "Proyecto enfocado en el análisis de desviación de costes, gestión de inventario y control de calidad impulsado por IA.",
      color: "#8B5CF6", // Violeta
      startDate: new Date('2026-02-16T09:00:00'),
      dueDate: new Date('2026-04-30T18:00:00') // Estimado
    }
  })

  // 4. Crear Tags (Español - Áreas Funcionales)
  const tags = [
    { name: "Datos", color: "#3B82F6" },      // Blue (Backend/Data)
    { name: "Interfaz", color: "#EC4899" },   // Pink (Frontend)
    { name: "IA", color: "#8B5CF6" },         // Violet (AI)
    { name: "Operaciones", color: "#F97316" },// Orange (Ops)
    { name: "Urgente", color: "#EF4444" }     // Red (Critical)
  ]

  const projectTags: Record<string, string> = {}

  for (const tag of tags) {
    const createdTag = await prisma.tag.upsert({
      where: { projectId_name: { name: tag.name, projectId: project.id } },
      update: {},
      create: {
        name: tag.name,
        color: tag.color,
        projectId: project.id
      }
    })
    projectTags[tag.name] = createdTag.id
  }

  // Define interfaces for type safety within the script
  interface TaskDefinition {
    title: string;
    priority: "High" | "Medium" | "Low";
    technicalNotes: string;
    position: number;
    tags: string[];
    storyPoints: number;
  }

  interface ListDefinition {
    name: string;
    position: number;
    color: string;
    tasks: TaskDefinition[];
  }

  // Algoritmo de fechas: Inicio Lunes 16 Feb 2026. Saltando fines de semana.
  let globalStartDate = new Date('2026-02-16T09:00:00')

  const addWorkingDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    let added = 0
    while (added < days) {
      result.setDate(result.getDate() + 1)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        added++
      }
    }
    return result
  }

  // 5. Definir Listas y Tareas (En Español) con Tags, Puntos de Historia y Notas Detalladas
  const lists: ListDefinition[] = [
    {
      name: "Arquitectura de Datos (El Núcleo)",
      position: 0,
      color: "#3B82F6", // Azul
      tasks: [
        {
          title: "Diseñar Esquema de Base de Datos (Ingredientes y Recetas)",
          priority: "High",
          technicalNotes: "1. Crear modelos `Ingredient` (id, name, unitType [kg, l, unit], cost, yield), `Recipe` (id, name, prepTime, category), `RecipeItem` (relation). 2. Añadir índices en `Ingredient(name)` para búsquedas. 3. Usar Decimal para campos monetarios.",
          position: 0,
          tags: ["Datos", "Urgente"],
          storyPoints: 5 // 1 semana aprox
        },
        {
          title: "Desarrollar Script \"Aplanador de Excel\"",
          priority: "High",
          technicalNotes: "Crear `scripts/import-excel.ts`. Usar librería `csv-parse`. Lógica: Leer CSV plano, detectar columnas dinámicas `Ingrediente_X`, `Cantidad_X`, y transformar en objeto anidado `Recipe { ingredients: [] }`. Manejar errores de formato.",
          position: 1,
          tags: ["Datos", "Urgente"],
          storyPoints: 8 // Complejo
        },
        {
          title: "Normalización de Entidades con IA",
          priority: "High",
          technicalNotes: "Crear servicio `NormalizerService`. Pipeline: 1. Extraer nombres únicos de CSV. 2. Enviar a LLM con prompt 'Agrupa variantes sinonímicas'. 3. Guardar mapa de conversión JSON. 4. Aplicar mapa durante importación.",
          position: 2,
          tags: ["IA", "Datos"],
          storyPoints: 8
        },
        {
          title: "Crear Script de Sembrado (Seed) de BBDD",
          priority: "Medium",
          technicalNotes: "Script idempotente `prisma/seed.ts`. Orden: 1. Ingredientes limpios. 2. Recetas (vinculando IDs de ingredientes). Validar integridad referencial y alertar faltantes.",
          position: 3,
          tags: ["Datos"],
          storyPoints: 3
        },
        {
          title: "Análisis de Integración API Gstock",
          priority: "Low",
          technicalNotes: "POC rápido con librería `axios`. Autenticar contra API Gstock. Obtener lista de artículos y precios. Comparar formato con nuestro modelo `Ingredient`.",
          position: 4,
          tags: ["Datos", "Operaciones"],
          storyPoints: 2
        }
      ]
    },
    {
      name: "Desarrollo IA (El Cerebro)",
      position: 1,
      color: "#10B981", // Esmeralda
      tasks: [
        {
          title: "Diseñar Prompt del Sistema \"Chef GPT\"",
          priority: "High",
          technicalNotes: "Definir System Prompt en `src/lib/ai/prompts.ts`. Incluir: Contexto de chef profesional, Restricciones estrictas (NO inventar precios), Output JSON schema. Testear con 5 casos de uso.",
          position: 0,
          tags: ["IA"],
          storyPoints: 3
        },
        {
          title: "Implementar Pipeline RAG (Inyección de Contexto)",
          priority: "High",
          technicalNotes: "Configurar `pgvector` en Supabase/Prisma. Crear embeddings para `Ingredient`. Al consultar receta, recuperar top-20 ingredientes relevantes por similitud semántica e inyectarlos en contexto.",
          position: 1,
          tags: ["IA", "Datos"],
          storyPoints: 13
        },
        {
          title: "Construir Transcriptor de Audio (Whisper)",
          priority: "High",
          technicalNotes: "Endpoint Next.js `POST /api/transcribe`. Recibir FormData (blob audio). Enviar a OpenAI Whisper API. Retornar texto plano. Manejar límites de tamaño (25MB).",
          position: 2,
          tags: ["IA", "Datos"],
          storyPoints: 5
        },
        {
          title: "Desarrollar Cadena de \"Lógica de Auditoría\"",
          priority: "Medium",
          technicalNotes: "Chain of Thought: Input (Texto Transcrito) -> Detección de Intención ('Hice paella') -> Búsqueda Receta BBDD -> Comparación Ingredientes (Texto vs BBDD) -> Output Reporte JSON.",
          position: 3,
          tags: ["IA", "Datos"],
          storyPoints: 8
        }
      ]
    },
    {
      name: "Aplicación Web (La Herramienta)",
      position: 2,
      color: "#F59E0B", // Ámbar
      tasks: [
        {
          title: "Construir Gestor de Recetas (Admin UI)",
          priority: "High",
          technicalNotes: "Ruta `/admin/recipes/[id]`. Componentes: `RecipeHeader` (Editable), `IngredientList` (DND Kit para reordenar). Hook `useCostCalculator` para actualizar total al cambiar cantidades.",
          position: 0,
          tags: ["Interfaz"],
          storyPoints: 8
        },
        {
          title: "Diseñar Interfaz \"Modo Cocina\" (Tablet)",
          priority: "Medium",
          technicalNotes: "Vista `/kitchen/mode/[id]`. CSS: Fuentes grandes (24px+), Alto contraste. Navegación por pasos (Carousel/Tabs). Ocultar precios. Botón flotante 'Grabar Audio'.",
          position: 1,
          tags: ["Interfaz"],
          storyPoints: 5
        },
        {
          title: "Módulo de Registro de Mermas",
          priority: "Medium",
          technicalNotes: "Formulario `/waste/new`. Campos: Producto (Select Searchable), Motivo (Enum), Peso/Unidad. Guardar en tabla `WasteLog`. Soporte Offline (Service Worker básico).",
          position: 2,
          tags: ["Interfaz"],
          storyPoints: 5
        },
        {
          title: "Dashboard y Analítica",
          priority: "Low",
          technicalNotes: "Librería `recharts`. Gráfico Barras: Desperdicio por Categoría. Gráfico Línea: Tendencia Coste vs Ventas. Cards Resumen: 'Top Desperdicio Semanal'.",
          position: 3,
          tags: ["Interfaz"],
          storyPoints: 5
        }
      ]
    },
    {
      name: "Operaciones y Procesos (El Campo)",
      position: 3,
      color: "#EF4444", // Rojo
      tasks: [
        {
          title: "Definir Lógica de Negocio (Enums)",
          priority: "High",
          technicalNotes: "Reunión con Jefes de Cocina. Output: Lista definitiva de 'WasteReason' (Caducado, Elaboración, Servicio) y 'UnitTypes' estandarizados.",
          position: 0,
          tags: ["Operaciones", "Datos"],
          storyPoints: 2
        },
        {
          title: "Seleccionar Recetas \"Gold Standard\"",
          priority: "Medium",
          technicalNotes: "Auditoría manual de 10 fichas técnicas actuales. Limpieza total de datos en Excel para usarlas como 'Ground Truth' en tests de IA.",
          position: 1,
          tags: ["Operaciones"],
          storyPoints: 3
        },
        {
          title: "Crear Documentación de Formación",
          priority: "Low",
          technicalNotes: "Redactar PDF/Wiki interna. Capítulos: 'Uso de Tablet en Cocina', 'Protocolo de Mermas', 'Comandos de Voz Validos'.",
          position: 2,
          tags: ["Operaciones"],
          storyPoints: 3
        }
      ]
    }
  ]

  // 6. Insertar Listas y Tareas
  for (const listData of lists) {
    console.log(`📂 Creando Lista: ${listData.name}`)
    const list = await prisma.taskList.create({
      data: {
        name: listData.name,
        position: listData.position,
        color: listData.color,
        projectId: project.id
      }
    })

    for (const taskData of listData.tasks) {
      console.log(`  - Tarea: ${taskData.title} [SP: ${taskData.storyPoints}]`)
      
      // Calculate Dates based on Story Points (1 SP = 1 Day roughly for planning)
      const durationDays = taskData.storyPoints || 1
      const taskEndDate = addWorkingDays(globalStartDate, durationDays)
      
      await prisma.task.create({
        data: {
          title: taskData.title,
          technicalNotes: taskData.technicalNotes,
          position: taskData.position,
          listId: list.id,
          statusId: defaultStatus.id,
          storyPoints: taskData.storyPoints,
          estimatedHours: taskData.storyPoints * 8, // Estimate hours too
          startDate: globalStartDate,
          dueDate: taskEndDate,
          tags: {
            connect: taskData.tags.map(tagName => ({ 
              projectId_name: { name: tagName, projectId: project.id } 
            }))
          }
        }
      })
      
      // Next task starts when this one ends (Waterfall)
      globalStartDate = taskEndDate
    }
  }

  console.log('✅ Sembrado de Sherlock (ES) con Tags Detallados y Fechas Completado!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
