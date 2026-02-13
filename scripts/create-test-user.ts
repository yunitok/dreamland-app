import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

async function main() {
  console.log('🔒 Creating Test User with No Permissions...');

  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Create/Get a "NO_ACCESS" role
    const noAccessRole = await prisma.role.upsert({
      where: { code: 'NO_ACCESS' },
      update: {},
      create: {
        code: 'NO_ACCESS',
        name: 'No Access User',
        description: 'User with no permissions for testing purposes',
        isSystem: false,
        permissions: {
          connect: [] // Explicitly connect no permissions
        }
      }
    });
    
    console.log('✅ Role "No Access User" ready');

    // 2. Create/Update the test user
    const hashedPassword = await hash('test', 10);
    
    const testUser = await prisma.user.upsert({
      where: { username: 'test' },
      update: { 
        password: hashedPassword,
        roleId: noAccessRole.id,
      },
      create: {
        name: 'Test User',
        username: 'test',
        email: 'test@dreamland.app',
        password: hashedPassword,
        roleId: noAccessRole.id,
      }
    });

    console.log(`✅ User "${testUser.username}" created/updated with password "test"`);
    console.log('🎉 Test user setup complete!');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
