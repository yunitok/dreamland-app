import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reorderStatuses() {
  console.log('🔄 Reordering task statuses...');

  try {
    // Define the desired order
    const desiredOrder = [
      { name: 'Backlog', position: 0, color: '#9CA3AF' },      // gray
      { name: 'To Do', position: 1, color: '#6B7280' },        // gray-600
      { name: 'In Progress', position: 2, color: '#3B82F6' },  // blue
      { name: 'Review', position: 3, color: '#F59E0B' },       // amber
      { name: 'Blocked', position: 4, color: '#EF4444' },      // red
      { name: 'On Hold', position: 5, color: '#F97316' },      // orange
      { name: 'Done', position: 6, color: '#10B981' },         // green
    ];

    console.log('\n📋 Desired order:');
    desiredOrder.forEach(status => {
      console.log(`  ${status.position}. ${status.name} [${status.color}]`);
    });

    // Update each status
    for (const status of desiredOrder) {
      await prisma.taskStatus.update({
        where: { name: status.name },
        data: { 
          position: status.position,
          color: status.color 
        }
      });
    }

    console.log('\n✅ Statuses reordered successfully!');

    // Show current order
    const allStatuses = await prisma.taskStatus.findMany({
      orderBy: { position: 'asc' },
      select: { name: true, color: true, position: true, isDefault: true, isClosed: true }
    });

    console.log('\n📊 Current task statuses (ordered):');
    allStatuses.forEach(status => {
      const badges = [];
      if (status.isDefault) badges.push('default');
      if (status.isClosed) badges.push('closed');
      const badgeStr = badges.length > 0 ? ` (${badges.join(', ')})` : '';
      console.log(`  ${status.position}. ${status.name}${badgeStr} [${status.color}]`);
    });

  } catch (error) {
    console.error('❌ Error reordering statuses:', error);
    throw error;
  }
}

reorderStatuses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
