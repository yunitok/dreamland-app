
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECT_ID = 'cml3oth0l00390suk0p5rfcl6'; // Proyecto Atención al Cliente

async function main() {
  console.log(`🚀 Iniciando carga de datos piloto para Proyecto ATC (${PROJECT_ID})...`);

  // 1. Verify Project Exists
  const project = await prisma.project.findUnique({
    where: { id: PROJECT_ID },
    include: { lists: true }
  });

  if (!project) {
    console.error('❌ Error: Proyecto no encontrado.');
    process.exit(1);
  }

  // 2. Identify Target List (Backlog)
  // If "Backlog" exists, use it. Otherwise, use the first list.
  let targetListId = project.lists.find(l => l.name === 'Backlog' || l.position === 0)?.id;
  
  if (!targetListId) {
    console.log('⚠️ No se encontró lista "Backlog". Creando...');
    const newList = await prisma.taskList.create({
      data: {
        name: 'Backlog',
        projectId: PROJECT_ID,
        position: 0, 
        color: '#6B7280'
      }
    });
    targetListId = newList.id;
  }

  // 3. Create Tags from User Categories
  const tagsData = [
    { name: 'Comunicación', color: '#3B82F6' }, // Blue
    { name: 'Reservas', color: '#10B981' },     // Green
    { name: 'Incidencias', color: '#EF4444' },  // Red
    { name: 'Info/FAQ', color: '#F59E0B' },     // Amber
    { name: 'Admin', color: '#8B5CF6' },        // Purple
    { name: 'Bonos', color: '#EC4899' },        // Pink
    { name: 'Coordinación', color: '#6366F1' }, // Indigo
  ];

  const tagsMap: Record<string, string> = {};

  for (const tag of tagsData) {
    const existingTag = await prisma.tag.findFirst({
      where: { projectId: PROJECT_ID, name: tag.name }
    });

    if (existingTag) {
      tagsMap[tag.name] = existingTag.id;
    } else {
      const newTag = await prisma.tag.create({
        data: { ...tag, projectId: PROJECT_ID }
      });
      tagsMap[tag.name] = newTag.id;
    }
  }

  // 4. Create Tasks
  let statusTodo = await prisma.taskStatus.findFirst({
    where: { projectId: PROJECT_ID, isDefault: true }
  }) || await prisma.taskStatus.findFirst({
    where: { projectId: PROJECT_ID, position: 0 }
  });

  if (!statusTodo) {
      console.log('⚠️ No se encontró status "To Do". Creando defaults...');
      statusTodo = await prisma.taskStatus.create({
        data: {
          name: 'To Do',
          color: '#6B7280',
          position: 0,
          isDefault: true,
          projectId: PROJECT_ID
        }
      });

      await prisma.taskStatus.createMany({
        data: [
          { name: 'In Progress', color: '#3B82F6', position: 1, projectId: PROJECT_ID },
          { name: 'Done', color: '#10B981', position: 2, isClosed: true, projectId: PROJECT_ID }
        ]
      });
  }

  const tasks = [
    // 1. Comunicación
    {
      title: 'Gestión diaria de correos electrónicos',
      description: 'Atención del 99.9% de peticiones via email. Alto volumen.',
      storyPoints: 5,
      tagName: 'Comunicación'
    },
    {
      title: 'Atención chat web',
      description: 'Consultas similares a correo pero canal chat.',
      storyPoints: 3,
      tagName: 'Comunicación'
    },
    {
      title: 'Confirmación telefónica de reservas',
      description: 'Llamadas proactivas salientes.',
      storyPoints: 2,
      tagName: 'Comunicación'
    },
    // 2. Reservas e Incidencias
    {
      title: 'Gestión de "Late Arrivals"',
      description: 'Verificar disponibilidad, modificar hora o avisar de política de 15 min.',
      storyPoints: 3,
      tagName: 'Reservas'
    },
    {
      title: 'Alertas meteorológicas (Terrazas)',
      description: 'Contactar clientes de terraza en caso de lluvia/viento (Previsión del tiempo humana).',
      storyPoints: 5,
      tagName: 'Incidencias'
    },
    {
      title: 'Reubicación por incidencias local',
      description: 'Gestión crítica: goteras o mesas inutilizadas. Contactar y reubicar.',
      storyPoints: 8,
      tagName: 'Incidencias'
    },
    {
      title: 'Reclamación de "Simpas"',
      description: 'Intentos de contacto post-impago. Baja efectividad.',
      storyPoints: 2,
      tagName: 'Incidencias'
    },
    // 3. Consultas
    {
      title: 'Consultas alérgenos/ingredientes complejos',
      description: 'Requiere contacto con I+D y espera de respuesta.',
      storyPoints: 8,
      tagName: 'Info/FAQ'
    },
    {
      title: 'Gestión eventos especiales (pedidas, cumples)',
      description: 'Explicar política de "traer cosas de fuera".',
      storyPoints: 3,
      tagName: 'Info/FAQ'
    },
    // 4. Admin
    {
      title: 'Generación manual de facturas',
      description: 'Rellenar datos en programa para facturas solicitadas.',
      storyPoints: 2,
      tagName: 'Admin'
    },
    {
      title: 'Corrección errores facturas (NIF, etc)',
      description: 'Coordinación con administración para regenerar facturas.',
      storyPoints: 3,
      tagName: 'Admin'
    },
    // 5. Bonos
    {
      title: 'Tramitación Manual Bonos Regalo',
      description: 'Proceso muy manual: Explicar -> Pedir datos -> Link pago -> Enviar bono.',
      storyPoints: 13,
      tagName: 'Bonos'
    },
    {
      title: 'Registro Excel Bonos',
      description: 'Apunte manual y control de validez/tachaduras.',
      storyPoints: 5,
      tagName: 'Bonos'
    }
  ];

  console.log(`📋 Creando ${tasks.length} tareas piloto...`);

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        storyPoints: t.storyPoints,
        // Default Assignee? Leave unassigned for now
        listId: targetListId,
        statusId: statusTodo.id,
        tags: { connect: [{ id: tagsMap[t.tagName] }] }
      }
    });
  }

  console.log('✅ Carga de datos completada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
