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
  const projectsFilePath = path.join(process.cwd(), 'dreamland - projects.txt');
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

  // Seed Team Moods for all unique departments
  const moods = await Promise.all(
    uniqueDepartments.map((deptName: any) => {
      // Deterministic but varied scores
      const hash = deptName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const score = 30 + (hash % 65); // 30-95
      
      const emotions = ['Entusiasmado', 'Optimista', 'Neutral', 'Preocupado', 'Sobrecargado', 'Frustrado', 'Agotado'];
      const emotion = emotions[hash % emotions.length];

      return prisma.teamMood.create({
        data: {
          departmentName: deptName,
          sentimentScore: score,
          dominantEmotion: emotion,
          keyConcerns: `Retos específicos en la gestión de ${deptName.toLowerCase()}`,
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

