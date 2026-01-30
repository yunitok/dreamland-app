import { PrismaClient } from './src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Prisma keys:', Object.keys(prisma));
    
    // Check if models exist
    console.log('projectRisk defined?', !!prisma.projectRisk);
    console.log('user defined?', !!prisma.user);
    
    // Check internal dmmf potentially
    // @ts-ignore
    if (prisma._dmmf) {
        // @ts-ignore
        console.log('DMMF datamodel models:', prisma._dmmf.datamodel.models.map(m => m.name));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
