// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Query projects that have at least one list with at least one task
  const projects = await prisma.project.findMany({
    where: {
      lists: {
        some: {
          tasks: {
            some: {} 
          }
        }
      }
    },
    select: {
      id: true,
      title: true,
      lists: {
        select: {
          _count: {
            select: { tasks: true }
          }
        }
      }
    }
  });

  console.log(`Found ${projects.length} projects with tasks:`);
  projects.forEach(p => {
    // Sum tasks from all lists in the project
    const totalTasks = p.lists.reduce((acc, list) => acc + list._count.tasks, 0);
    console.log(`- ${p.title} (${totalTasks} tasks)`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
