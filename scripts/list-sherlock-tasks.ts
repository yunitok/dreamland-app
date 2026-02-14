
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const projectId = 'cmll3xc3i0000tguk3git72g7';
  
  console.log(`Fetching tasks for project ${projectId}...`);
  
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
    console.log('Project not found!');
    return;
  }

  console.log(`Project: ${project.title}`);
  
  for (const list of project.lists) {
    console.log(`\nList: ${list.name}`);
    for (const task of list.tasks) {
      console.log(`  - [${task.id}] ${task.title} (SP: ${task.storyPoints || 'null'}, Start: ${task.startDate?.toISOString().split('T')[0] || 'null'}, Due: ${task.dueDate?.toISOString().split('T')[0] || 'null'})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
