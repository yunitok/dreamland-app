import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 Searching for Sherlock Project tasks...');

  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Find the project
    const project = await prisma.project.findFirst({
      where: {
        title: {
          contains: 'Sherlock',
          mode: 'insensitive',
        },
      },
    });

    if (!project) {
        console.error('❌ Project "Sherlock" not found!');
        process.exit(1);
    }
    
    console.log(`✅ Found project: ${project.title} (${project.id})`);

    // 2. Fetch tasks
    const tasks = await prisma.task.findMany({
      where: {
        list: {
          projectId: project.id,
        },
      },
      include: {
        list: true,
      },
      orderBy: [
        { list: { position: 'asc' } },
        { position: 'asc' },
      ],
    });

    console.log(`✅ Found ${tasks.length} tasks.`);

    // 3. Output to JSON
    const outputPath = path.join(process.cwd(), 'sherlock_tasks.json');
    fs.writeFileSync(outputPath, JSON.stringify(tasks, null, 2));

    console.log(`💾 Tasks saved to ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
