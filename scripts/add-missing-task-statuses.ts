import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function addMissingStatuses() {
  console.log('🔄 Adding missing task statuses...');

  try {
    // Get current max position
    const statuses = await prisma.taskStatus.findMany({
      orderBy: { position: 'desc' },
      take: 1,
    });
    
    const maxPosition = statuses.length > 0 ? statuses[0].position : 3;
    
    // Check if statuses already exist
    const existingBacklog = await prisma.taskStatus.findUnique({
      where: { name: 'Backlog' }
    });
    
    const existingOnHold = await prisma.taskStatus.findUnique({
      where: { name: 'On Hold' }
    });
    
    const existingBlocked = await prisma.taskStatus.findUnique({
      where: { name: 'Blocked' }
    });

    let addedCount = 0;

    // Add Backlog if it doesn't exist
    if (!existingBacklog) {
      await prisma.taskStatus.create({
        data: {
          name: 'Backlog',
          color: '#9CA3AF', // gray-400
          position: maxPosition + 1,
          isDefault: false,
          isClosed: false,
        }
      });
      console.log('✅ Added "Backlog" status');
      addedCount++;
    } else {
      console.log('⏭️  "Backlog" status already exists');
    }

    // Add On Hold if it doesn't exist
    if (!existingOnHold) {
      await prisma.taskStatus.create({
        data: {
          name: 'On Hold',
          color: '#F59E0B', // amber-500
          position: maxPosition + 2,
          isDefault: false,
          isClosed: false,
        }
      });
      console.log('✅ Added "On Hold" status');
      addedCount++;
    } else {
      console.log('⏭️  "On Hold" status already exists');
    }

    // Add Blocked if it doesn't exist
    if (!existingBlocked) {
      await prisma.taskStatus.create({
        data: {
          name: 'Blocked',
          color: '#EF4444', // red-500
          position: maxPosition + 3,
          isDefault: false,
          isClosed: false,
        }
      });
      console.log('✅ Added "Blocked" status');
      addedCount++;
    } else {
      console.log('⏭️  "Blocked" status already exists');
    }

    console.log(`\n🎉 Migration completed! Added ${addedCount} new statuses.`);

    // Show all statuses
    const allStatuses = await prisma.taskStatus.findMany({
      orderBy: { position: 'asc' },
      select: { name: true, color: true, position: true, isDefault: true }
    });

    console.log('\n📋 Current task statuses:');
    allStatuses.forEach(status => {
      console.log(`  - ${status.name} ${status.isDefault ? '(default)' : ''} [Position: ${status.position}, Color: ${status.color}]`);
    });

  } catch (error) {
    console.error('❌ Error adding statuses:', error);
    throw error;
  }
}

addMissingStatuses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
