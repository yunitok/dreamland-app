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
  console.log('🧹 Starting cleanup of task data...');

  // Delete in order to respect foreign key constraints
  
  // 1. Task Dependencies (depend on Task)
  const deletedDependencies = await prisma.taskDependency.deleteMany();
  console.log(`- Deleted ${deletedDependencies.count} task dependencies`);

  // 2. Task Attachments (depend on Task)
  const deletedAttachments = await prisma.taskAttachment.deleteMany();
  console.log(`- Deleted ${deletedAttachments.count} task attachments`);

  // 3. Task Comments (depend on Task)
  const deletedComments = await prisma.taskComment.deleteMany();
  console.log(`- Deleted ${deletedComments.count} task comments`);

  // 4. Tasks (depend on TaskList, TaskStatus, User)
  // Note: We need to handle self-referencing subtasks? 
  // onDelete: Cascade on 'subtasks' and 'parent' usually handles it, 
  // but simpler to deleteMany if no cycles. Warning: Cyclic dependencies might block raw delete.
  // Using deleteMany is usually safe for self-relations if cascade is set or if we delete children first?
  // Prisma's deleteMany doesn't always trigger hooks, but cascade on DB level helps.
  // To be safe, let's delete tasks.
  
  const deletedTasks = await prisma.task.deleteMany();
  console.log(`- Deleted ${deletedTasks.count} tasks`);

  // 5. Task Lists (depend on Project)
  const deletedLists = await prisma.taskList.deleteMany();
  console.log(`- Deleted ${deletedLists.count} task lists`);

  // 6. Task Statuses (depend on Project)
  const deletedStatuses = await prisma.taskStatus.deleteMany();
  console.log(`- Deleted ${deletedStatuses.count} task statuses`);

  console.log('✅ Cleanup completed.');
  
  // Verify Project count
  const projectCount = await prisma.project.count();
  console.log(`ℹ️ Remaining Projects: ${projectCount}`);
  
  // Optional: Check if "Plataforma de E-commerce" exists and warn?
  const sampleProject = await prisma.project.findFirst({
      where: { title: 'Plataforma de E-commerce' }
  });
  
  if (sampleProject) {
      console.log('⚠️ Note: "Plataforma de E-commerce" (sample project) still exists. You may want to delete it manually if it is not needed.');
  }

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
