import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Check Task 1: Conector API Jurest
    const taskId = 'cmll5dpgp000hegukuvfi5y0f';
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, technicalNotes: true },
    });

    if (task) {
      console.log('✅ Verification Successful:');
      console.log(`Task: ${task.title}`);
      console.log('Technical Notes:');
      console.log(task.technicalNotes);
    } else {
      console.error('❌ Verification Failed: Task not found.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error verifying task:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
