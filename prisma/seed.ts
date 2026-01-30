import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from 'path';
import fs from 'fs/promises';
import { hash } from 'bcryptjs';

// Use prisma/dev.db as per Prisma documentation
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('🗑️  Clearing ProjectRisk...');
  await prisma.projectRisk.deleteMany();
  console.log('🗑️  Clearing Project...');
  await prisma.project.deleteMany();
  console.log('🗑️  Clearing TeamMood...');
  await prisma.teamMood.deleteMany();
  console.log('🗑️  Clearing User...');
  await prisma.user.deleteMany();
  console.log('🗑️  Clearing Permission...');
  await prisma.permission.deleteMany();
  console.log('🗑️  Clearing Role...');
  await prisma.role.deleteMany();
  console.log('✨ Data cleared.');

  // --- RBAC SEEDING ---
  console.log('🔒 Seeding RBAC system...');
  
  // 1. Create Permissions
  // Define all Resources and Actions
  const resources = ['projects', 'users', 'roles', 'departments', 'sentiment', 'admin'];
  const actions = ['view', 'create', 'edit', 'delete', 'manage'];

  const permissionsList: any[] = [];
  
  // Create all cartesian product permissions
  for (const resource of resources) {
    for (const action of actions) {
        const p = await prisma.permission.upsert({
            where: { action_resource: { action, resource } },
            update: {}, // No update needed if exists
            create: {
                action,
                resource,
                description: `Can ${action} ${resource}`
            }
        });
        permissionsList.push(p);
    }
  }

  // Helper to get permission IDs by filters
  const getPerms = (res: string, acts: string[] = []) => {
      return permissionsList
        .filter(p => p.resource === res && (acts.length === 0 || acts.includes(p.action)))
        .map(p => ({ id: p.id }));
  };

  // 2. Create Roles

  // SUPER ADMIN (System)
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        connect: permissionsList.map(p => ({ id: p.id }))
      }
    }
  });

  // STRATEGIC PM (Project Manager)
  await prisma.role.upsert({
      where: { name: 'Strategic PM' },
      update: {},
      create: {
        name: 'Strategic PM',
        description: 'Manages roadmap and projects',
        isSystem: false,
        permissions: {
            connect: [
                ...getPerms('projects'), // Full project access
                ...getPerms('departments', ['view']),
                ...getPerms('sentiment', ['view']),
                ...getPerms('admin', ['view']) // Needs admin access to view dashboard
            ]
        }
      }
  });

  // HR / PEOPLE LEAD
  await prisma.role.upsert({
      where: { name: 'People & Culture Lead' },
      update: {},
      create: {
        name: 'People & Culture Lead',
        description: 'Manages team sentiment and departments',
        isSystem: false,
        permissions: {
            connect: [
                ...getPerms('sentiment'), // Full sentiment access
                ...getPerms('departments'), // Full department access
                ...getPerms('projects', ['view']),
                ...getPerms('admin', ['view'])
            ]
        }
      }
  });

  // STAKEHOLDER (Viewer)
  await prisma.role.upsert({
      where: { name: 'Stakeholder' },
      update: {},
      create: {
        name: 'Stakeholder',
        description: 'Read-only access to insights',
        isSystem: false,
        permissions: {
            connect: [
                ...getPerms('projects', ['view']),
                ...getPerms('sentiment', ['view']),
                ...getPerms('departments', ['view']),
                ...getPerms('admin', ['view'])
            ]
        }
      }
  });

  // 3. Create Users
  const hashedPassword = await hash('admin', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { roleId: superAdminRole.id }, // Ensure admin always has super admin role
    create: {
      name: 'Super Administrator',
      username: 'admin',
      email: 'admin@dreamland.app',
      password: hashedPassword,
      roleId: superAdminRole.id,
    }
  });

  console.log('✅ RBAC seeded: Standard roles created');

  // --- PROJECTS & MOODS SEEDING ---
  
  // Read real projects from file
  const projectsFilePath = path.join(process.cwd(), 'data', 'reports', 'dreamland - projects.txt');
  let rawData;
  try {
    rawData = await fs.readFile(projectsFilePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading file at ${projectsFilePath}:`, error);
    // Don't exit, just skip projects if file missing
  }

  if (rawData) {
    const projectsData = JSON.parse(rawData);

    // Seed Projects
    const seededProjects = await Promise.all(
      projectsData.map((project: any, index: number) => {
        // Map priority
        const priorityMap: Record<string, string> = {
          'Alta': 'High',
          'Media': 'Medium',
          'Baja': 'Low'
        };

        // Map type
        const typeMap: Record<string, string> = {
          'Problema': 'Problem',
          'Idea': 'Idea',
          'Oportunidad': 'Idea'
        };

        const status = 'Pending';

        return prisma.project.create({
          data: {
            title: project.titulo_proyecto,
            department: project.departamento_origen,
            type: typeMap[project.tipo] || 'Idea',
            priority: priorityMap[project.prioridad_detectada] || 'Medium',
            description: project.descripcion_corta,
            status: status,
            sourceQuote: project.fuente_cita,
          },
        });
      })
    );
    console.log(`✅ Created ${seededProjects.length} projects`);
  }

  // Seed Team Moods
  const uniqueDepartments = [
    'Finanzas', 'RRHH', 'Cultura', 'Operaciones', 'Operaciones - Sala', 
    'Operaciones - Cocina', 'Operaciones - ATC', 'I+D', 'I+D - Interiorismo', 
    'I+D - Diseño', 'Comercial - Ventas', 'Comercial - Marketing', 
    'Mantenimiento', 'Tech & Innovación'
  ];

  const sentimentMap: Record<string, { score: number; emotion: string; concerns: string }> = {
    'Finanzas': { score: 48, emotion: 'Estrés Resiliente', concerns: 'Montaña de burocracia manual...' },
    'RRHH': { score: 22, emotion: 'Frustración Crítica', concerns: 'Saturación por cambios constantes...' },
    'Cultura': { score: 72, emotion: 'Foco en Valores', concerns: 'Detección de talento y clima...' },
    'Operaciones': { score: 28, emotion: 'Saturación Digital', concerns: 'Exceso de comunicaciones...' },
    'Operaciones - Sala': { score: 52, emotion: 'Analítico Saturado', concerns: 'Dominio analítico superior...' },
    'Operaciones - Cocina': { score: 55, emotion: 'Buscando Eficiencia', concerns: 'Necesidad de buscador inteligente...' },
    'Operaciones - ATC': { score: 60, emotion: 'Pendiente de Automatización', concerns: 'Gestión manual de reservas...' },
    'I+D': { score: 92, emotion: 'Obsesión Analítica', concerns: 'Enfoque racional en resolver el puzzle...' },
    'I+D - Interiorismo': { score: 45, emotion: 'Descontrol de Stock', concerns: 'Conciliación manual agotadora...' },
    'I+D - Diseño': { score: 88, emotion: 'Optimismo Vital', concerns: 'Alta motivación por el uso de IA...' },
    'Comercial - Ventas': { score: 65, emotion: 'Preocupación Humana', concerns: 'Temor a perder el "toque humano"...' },
    'Comercial - Marketing': { score: 55, emotion: 'Saturación de Leads', concerns: 'Bandeja de entrada colapsada...' },
    'Mantenimiento': { score: 70, emotion: 'Expectativa de Orden', concerns: 'Deseo de mayor trazabilidad...' },
    'Tech & Innovación': { score: 75, emotion: 'Pioneros Digitales', concerns: 'Proyectos transversales...' },
  };

  const moods = await Promise.all(
    uniqueDepartments.map((deptName) => {
      const data = sentimentMap[deptName] || {
        score: 60,
        emotion: 'Neutral / Adaptación',
        concerns: `Procesos de cambio y estandarización en ${deptName}.`
      };

      return prisma.teamMood.create({
        data: {
          departmentName: deptName,
          sentimentScore: data.score,
          dominantEmotion: data.emotion,
          keyConcerns: data.concerns,
        },
      });
    })
  );

  console.log(`✅ Created ${moods.length} team mood records`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
