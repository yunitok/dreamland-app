
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting user import...');

  // 1. Ensure BASIC_USER role exists
  let basicRole = await prisma.role.findFirst({
    where: { code: 'BASIC_USER' }
  });

  if (!basicRole) {
    console.log('Creating BASIC_USER role...');
    basicRole = await prisma.role.create({
      data: {
        code: 'BASIC_USER',
        name: 'Basic User',
        description: 'Default user with minimal permissions',
        isSystem: false,
        // No permissions by default as requested
      }
    });
  }

  // 2. Read users.json
  const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
  console.log(`Reading users from ${usersFilePath}...`);
  
  const rawData = await fs.readFile(usersFilePath, 'utf-8');
  const data = JSON.parse(rawData);
  const users = data.users;

  console.log(`Found ${users.length} users to process.`);

  // 3. Process users
  const defaultPassword = await hash('dreamland2026', 10);
  let createdCount = 0;
  let updatedCount = 0;

  for (const user of users) {
    const email = user['Email Address [Required]'];
    const firstName = user['First Name [Required]'];
    const lastName = user['Last Name [Required]'];
    
    if (!email) continue;

    const username = email.split('@')[0];
    const fullName = `${firstName} ${lastName}`.trim();

    const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
    const existingUserByUsername = await prisma.user.findUnique({ where: { username } });

    const existingUser = existingUserByEmail || existingUserByUsername;

    if (existingUser) {
      console.log(`User ${username} / ${email} already exists. Updating/Skipping...`);
      // Optional: Update email if it's different and we matched by username
      if (existingUser.email !== email) {
        console.log(`Updating email for ${username} from ${existingUser.email} to ${email}`);
        await prisma.user.update({
             where: { id: existingUser.id },
             data: { email }
        });
      }
      updatedCount++;
    } else {
      await prisma.user.create({
        data: {
          username,
          email,
          name: fullName,
          password: defaultPassword,
          roleId: basicRole.id,
          mustChangePassword: true,
        }
      });
      createdCount++;
      // console.log(`Created user: ${username}`);
    }
  }

  console.log(`✅ Import finished.`);
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped/Updated: ${updatedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
