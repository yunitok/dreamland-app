
const { PrismaClient } = require('@prisma/client');

console.log('Loading environment...');
try {
    const prisma = new PrismaClient({}); // Try empty object
    console.log('Prisma Client initialized successfully with {}!');
    prisma.$disconnect();
} catch (e) {
    console.error('Initialization failed with {}:', e.message);
    try {
        const prisma2 = new PrismaClient({ log: ['info'] });
        console.log('Prisma Client initialized successfully with log options!');
        prisma2.$disconnect();
    } catch (e2) {
        console.error('Initialization failed with log options:', e2.message);
    }
}
