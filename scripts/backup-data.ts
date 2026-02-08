import { prisma } from '../src/lib/prisma';
import "dotenv/config";
import fs from 'fs';
import path from 'path';

// const prisma = new PrismaClient(); // Removed local instantiation

async function main() {
  console.log('Starting backup...');
  
  const data: Record<string, any[]> = {};

  // Define models to backup in order of dependency (parent first)
  // Note: We use dynamic access to prisma[model]
  const models = [
    'role',
    'user',
    'project',
    'taskStatus', 
    'taskList',
    'task',
    'taskComment',
    'taskAttachment',
    'tag',
    'teamMood',
    'projectRisk',
    'aiUsageLog',
    'chatSession',
    'chatMessage'
  ];

  for (const modelKey of models) {
    try {
      // @ts-ignore
      if (prisma[modelKey]) {
        console.log(`Backing up ${modelKey}...`);
        // @ts-ignore
        const records = await prisma[modelKey].findMany();
        data[modelKey] = records;
        console.log(`  Saved ${records.length} records.`);
      } else {
        console.warn(`  Model ${modelKey} not found in Prisma Client.`);
      }
    } catch (error) {
       console.error(`  Error backing up ${modelKey}:`, error);
    }
  }

  const outputPath = path.join(process.cwd(), 'backup-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Backup completed. Data saved to ${outputPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect(); // Don't disconnect singleton
  });
