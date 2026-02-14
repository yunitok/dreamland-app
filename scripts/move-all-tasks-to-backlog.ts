import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function moveAllTasksToBacklog() {
  console.log('🔄 Moving all tasks to Backlog status...');

  try {
    // Get Backlog status
    const backlogStatus = await prisma.taskStatus.findUnique({
      where: { name: 'Backlog' }
    });

    if (!backlogStatus) {
      console.error('❌ Backlog status not found!');
      process.exit(1);
    }

    console.log(`✅ Found Backlog status (ID: ${backlogStatus.id})`);

    // Count tasks before update
    const totalTasks = await prisma.task.count();
    console.log(`📊 Total tasks in database: ${totalTasks}`);

    // Update all tasks to Backlog status
    const result = await prisma.task.updateMany({
      data: {
        statusId: backlogStatus.id
      }
    });

    console.log(`✅ Updated ${result.count} tasks to Backlog status`);

    // Show summary by project
    const tasksByProject = await prisma.task.groupBy({
      by: ['listId'],
      _count: {
        id: true
      }
    });

    if (tasksByProject.length > 0) {
      console.log('\n📋 Tasks by list:');
      for (const group of tasksByProject) {
        if (group.listId) {
          const list = await prisma.taskList.findUnique({
            where: { id: group.listId },
            select: { name: true, project: { select: { title: true } } }
          });
          console.log(`  - ${list?.project.title} / ${list?.name}: ${group._count.id} tasks`);
        } else {
          console.log(`  - (No list): ${group._count.id} tasks`);
        }
      }
    }

    console.log('\n🎉 All tasks are now in Backlog!');

  } catch (error) {
    console.error('❌ Error moving tasks:', error);
    throw error;
  }
}

moveAllTasksToBacklog()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
