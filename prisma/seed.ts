import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from 'path';
import fs from 'fs/promises';

// Use prisma/dev.db as per Prisma documentation
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database with real projects...');

  // Clear existing data
  await prisma.projectRisk.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMood.deleteMany();

  // Read real projects from file
  const projectsFilePath = path.join(process.cwd(), 'data', 'reports', 'dreamland - projects.txt');
  let rawData;
  try {
    rawData = await fs.readFile(projectsFilePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading file at ${projectsFilePath}:`, error);
    process.exit(1);
  }

  const projectsData = JSON.parse(rawData);

  // Extract unique departments
  const uniqueDepartments = Array.from(new Set(projectsData.map((p: any) => p.departamento_origen)));

  // Seed Projects
  const seededProjects = await Promise.all(
    projectsData.map((project: any, index: number) => {
      // Map priority
      const priorityMap: Record<string, string> = {
        'Alta': 'High',
        'Media': 'Medium',
        'Baja': 'Low'
      };

      // Map type
      const typeMap: Record<string, string> = {
        'Problema': 'Problem',
        'Idea': 'Idea',
        'Oportunidad': 'Idea'
      };

      // Random status for variety
      let status = 'Pending';
      if (index % 5 === 0) status = 'Active';
      if (index % 12 === 0) status = 'Done';

      return prisma.project.create({
        data: {
          title: project.titulo_proyecto,
          department: project.departamento_origen,
          type: typeMap[project.tipo] || 'Idea',
          priority: priorityMap[project.prioridad_detectada] || 'Medium',
          description: project.descripcion_corta,
          status: status,
          sourceQuote: project.fuente_cita,
        },
      });
    })
  );

  console.log(`✅ Created ${seededProjects.length} projects`);

  // Seed Team Moods based on the HR report (dreamland_feeling_projects.txt)
  const sentimentMap: Record<string, { score: number; emotion: string; concerns: string }> = {
    'RRHH': { 
      score: 22, 
      emotion: 'Frustración Crítica', 
      concerns: 'Saturación por cambios constantes de jornada ("inhumano") y carga emocional por responsabilidad legal.' 
    },
    'Operaciones': { 
      score: 28, 
      emotion: 'Saturación Digital', 
      concerns: 'Exceso de comunicaciones en Slack y trabajo manual de volcado de datos ("basura de data").' 
    },
    'Financiero': { 
      score: 48, 
      emotion: 'Estrés Resiliente', 
      concerns: 'Montaña de burocracia manual (facturas, tickets) gestionada con humor pero alta carga de trabajo.' 
    },
    'Diseño': { 
      score: 88, 
      emotion: 'Optimismo Vital', 
      concerns: 'Alta motivación por el uso de IA para eliminar tareas administrativas y acelerar el renderizado.' 
    },
    'Calidad / I+D': { 
      score: 92, 
      emotion: 'Obsesión Analítica', 
      concerns: 'Enfoque racional en resolver el puzzle de los costes ocultos ("Sherlock"). Fuerte alineación con objetivos.' 
    },
    'Ventas': { 
      score: 65, 
      emotion: 'Preocupación Humana', 
      concerns: 'Temor a perder el "toque humano" y el "mimo" al cliente por una automatización excesiva.' 
    },
    'Mantenimiento': { 
      score: 70, 
      emotion: 'Expectativa de Orden', 
      concerns: 'Deseo de mayor trazabilidad y control preventivo para reducir la carga mental.' 
    },
    'Marketing': { 
      score: 55, 
      emotion: 'Saturación de Leads', 
      concerns: 'Bandeja de entrada colapsada por CVs sin filtrar y necesidad de auditar datos manuales.' 
    },
    'Area Manager Sala': {
      score: 52,
      emotion: 'Analítico Saturado',
      concerns: 'David demuestra un dominio analítico superior pero está atrapado en tareas manuales de reporteo.'
    },
    'Area Manager Cocina': {
      score: 55,
      emotion: 'Buscando Eficiencia',
      concerns: 'Necesidad de buscador inteligente para la "Biblia" de cocina y automatización de pedidos forecast.'
    },
    'Cultura': {
      score: 72,
      emotion: 'Foco en Valores',
      concerns: 'Detección de talento y clima mediante análisis de entrevistas 1:1 y recuento de reviews.'
    },
    'Vajilla/Almacén': {
      score: 45,
      emotion: 'Descontrol de Stock',
      concerns: 'Conciliación manual agotadora entre Yurest y el físico. Pérdidas recurrentes sin trazabilidad.'
    },
    'Alvar': {
      score: 69,
      emotion: 'Humor Gen Z',
      concerns: 'Curación de un diccionario de insultos para reuniones. Proyecto de baja prioridad pero alto impacto cultural.'
    }
  };

  const moods = await Promise.all(
    uniqueDepartments.map((deptName: any) => {
      // Clean department names that might have multiple sub-depts like "Finanzas / Ops"
      const mainDept = deptName.split(' / ')[0].split(' /')[0];
      
      const data = sentimentMap[deptName] || sentimentMap[mainDept] || {
        score: 60,
        emotion: 'Neutral / Adaptación',
        concerns: `Procesos de cambio y estandarización en ${deptName}.`
      };

      return prisma.teamMood.create({
        data: {
          departmentName: deptName,
          sentimentScore: data.score,
          dominantEmotion: data.emotion,
          keyConcerns: data.concerns,
        },
      });
    })
  );

  console.log(`✅ Created ${moods.length} team mood records`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

