
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'; // Ensure dotenv is used

dotenv.config();


import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Force Direct URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  const backupPath = path.join(process.cwd(), 'backup-data-mcp.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found!');
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  console.log('\n--- DATA VERIFICATION: PRODUCTION VS BACKUP ---\n');
  console.log('| Model | Live DB Count | Backup Count | Status |');
  console.log('|---|---|---|---|');

  // Order matters for display but not logic here
  // Only check main models first
  const models = [
    'User', 'Role', 'Permission', 'Project', 'Task', 'TaskList', 
    'TaskStatus', 'TaskComment', 'TaskAttachment', 'Tag', 
    'TeamMood', 'ProjectRisk', 'AiUsageLog', 'ChatSession'
  ];

  for (const model of models) {
    try {
      // mapping ModelName to prisma client property (usually camelCase)
      const modelProperty = model.charAt(0).toLowerCase() + model.slice(1);
      
      // @ts-ignore
      if (!prisma[modelProperty]) {
          console.log(`| ${model} | N/A | ${backupData[model]?.length || 0} | ⚠️ Model not in client |`);
          continue;
      }

      // @ts-ignore
      const count = await prisma[modelProperty].count();
      const backupCount = backupData[model]?.length || 0;
      
      let status = '✅ Match';
      if (count !== backupCount) {
          status = count > backupCount 
            ? `⚠️ LOSS WARNING (-${count - backupCount})` 
            : `➕ GAIN (+${backupCount - count})`;
      }
      
      console.log(`| ${model.padEnd(15)} | ${String(count).padEnd(5)} | ${String(backupCount).padEnd(5)} | ${status} |`);
    } catch (e) {
      console.log(`| ${model.padEnd(15)} | ERR   | ${backupData[model]?.length || 0} | ❌ Error fetching count |`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
