
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Configuración: 1 SP = 0.5 Días
const DAYS_PER_SP = 0.5;

// Mapeo de Puntos de Historia por ID de Tarea
const storyPointsMap: Record<string, number> = {
  // ARQUITECTURA DE DATOS
  'cmll5doq5000cegukxwba2xxq': 3,  // Definición de Campos de "Protocolo de Sala"
  'cmll5dnqv0004eguke9m8tzq0': 8,  // Diseño del Esquema Relacional "Funnel de Altas"
  'cmll5do7v0008eguk57aosaia': 5,  // Normalización de Taxonomías
  
  // INTEGRACIONES
  'cmll5dpgp000hegukuvfi5y0f': 5,  // Conector API Yurest
  'cmllgf92o0000kwuk4ogafxui': 5,  // Conector API GStock
  'cmll5dpxg000kegukebcmakzj': 5,  // Conector API Web/WordPress
  
  // SEGURIDAD ALIMENTARIA Y SALA
  'cmll5dtu3001aegukf4b7zviz': 5,  // Lógica de Alérgenos Cruzada
  'cmll5duaw001degukedocsr4r': 3,  // Chatbot "Allergen Helper"
  
  // LÓGICA Y AUTOMATIZACIÓN
  'cmll5dsog0012egukbb1grgfk': 3,  // Gestión de "Externalizables"
  'cmll5dt470015eguk9x91wtkz': 5,  // Notificaciones Inteligentes Centralizadas
  'cmll5ds8w000zegukyqete8jy': 5,  // Bot de "Checklist Web"
  
  // FRONTEND Y HERRAMIENTAS
  'cmll5dqn8000pegukxpuxp7qk': 5,  // Formulario de Solicitud
  'cmll5dr5c000teguk9njzghhh': 8,  // Visor "Drill-Down"
  'cmll5drjt000veguk62utun4t': 2,  // Generador de QRs Dinámicos
  
  // FORMACIÓN Y ESTANDARIZACIÓN
  'cmll5dw52001pegukklfie4ml': 2,  // Flujo de Vídeo-Formación
  'cmll5dwhx001qeguk3xmesfy7': 3,  // Digitalización del "Manual del Buen Camarero"
  
  // FEEDBACK LOOP E INTELIGENCIA
  'cmll5dv24001iegukaj5jzot2': 5,  // Integración Feedback
  'cmll5dvj4001legukfs4qxczt': 3,  // Disparador de Reformulación
};

async function main() {
  console.log('🚀 Iniciando Actualización de Estimaciones (Secuencial Global) para Sherlock...');

  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const projectId = 'cmll3xc3i0000tguk3git72g7';
    
    // 1. Obtener Listas y Tareas
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        lists: {
          include: {
            tasks: {
              orderBy: { position: 'asc' }
            }
          },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!project) {
        throw new Error('Proyecto no encontrado');
    }

    console.log(`📂 Proyecto: ${project.title}`);

    // Fecha base del proyecto
    // 2026-02-17 es Martes.
    let globalCursorDate = new Date('2026-02-17T09:00:00.000Z'); 

    // Ajustar cursor inicial si cae en fin de semana
    while (globalCursorDate.getDay() === 0 || globalCursorDate.getDay() === 6) {
        globalCursorDate.setDate(globalCursorDate.getDate() + 1);
    }

    // 2. Iterar listas y tareas (Secuencial Global)
    for (const list of project.lists) {
        console.log(`\n📋 Lista: ${list.name}`);
        
        for (const task of list.tasks) {
            const sp = storyPointsMap[task.id] || 0;
            
            if (sp === 0) {
                console.warn(`⚠️ Tarea sin estimación: ${task.title} (${task.id})`);
                continue;
            }

            // Calcular duración 
            const daysDuration = sp * DAYS_PER_SP;
            
            // Fecha Inicio = Cursor Global Actual
            const startDate = new Date(globalCursorDate);
            
            // Fecha Fin
            const endDate = new Date(startDate);
            
            // Lógica simple de días hábiles para Fecha Fin
            let daysToAdd = Math.ceil(daysDuration);
            if (daysDuration <= 0.5) daysToAdd = 0; 
            else daysToAdd = Math.ceil(daysDuration) - 1; 

            let daysAdded = 0;
            while (daysAdded < daysToAdd) {
                endDate.setDate(endDate.getDate() + 1);
                if (endDate.getDay() !== 0 && endDate.getDay() !== 6) {
                    daysAdded++;
                }
            }
            
            // Actualizar Tarea
            await prisma.task.update({
                where: { id: task.id },
                data: {
                    storyPoints: sp,
                    startDate: startDate,
                    dueDate: endDate,
                    estimatedHours: sp * 4 
                }
            });

            console.log(`   ✅ [${sp} SP] ${task.title.substring(0, 40)}... -> ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`);

            // Avanzar Cursor Global para la siguiente tarea
            // La siguiente tarea empieza el día siguiente hábil a la fecha fin de la actual
            globalCursorDate = new Date(endDate);
            globalCursorDate.setDate(globalCursorDate.getDate() + 1);
             while (globalCursorDate.getDay() === 0 || globalCursorDate.getDay() === 6) {
                globalCursorDate.setDate(globalCursorDate.getDate() + 1);
            }
        }
    }

    console.log('\n🎉 Actualización completada con éxito.');

  } catch (error) {
    console.error('❌ Error crítico:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
