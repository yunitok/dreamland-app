import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in order (respect foreign keys)
  console.log('🗑️  Clearing data...');
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskStatus.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.taskList.deleteMany();
  await prisma.projectRisk.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMood.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  console.log('✨ Data cleared.');

  // --- RBAC SEEDING ---
  console.log('🔒 Seeding RBAC system...');
  
  // 1. Create Permissions - Extended for task management
  const resources = [
    'projects', 'users', 'roles', 'departments', 'sentiment', 'admin',
    'tasks', 'lists', 'comments', 'attachments', 'tags'
  ];
  const actions = ['view', 'create', 'edit', 'delete', 'manage'];

  const permissionsList: any[] = [];
  
  for (const resource of resources) {
    for (const action of actions) {
      const p = await prisma.permission.upsert({
        where: { action_resource: { action, resource } },
        update: {},
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

  // SUPER ADMIN (System) - Full access to everything
  const superAdminRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        connect: permissionsList.map(p => ({ id: p.id }))
      }
    }
  });

  // STRATEGIC PM - High level project management
  const strategicPmRole = await prisma.role.upsert({
    where: { code: 'STRATEGIC_PM' },
    update: {},
    create: {
      code: 'STRATEGIC_PM',
      name: 'Strategic PM',
      description: 'Manages roadmap and projects at strategic level',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects'),
          ...getPerms('tasks'),
          ...getPerms('lists'),
          ...getPerms('comments'),
          ...getPerms('attachments'),
          ...getPerms('tags'),
          ...getPerms('departments', ['view']),
          ...getPerms('sentiment', ['view']),
          ...getPerms('admin', ['view'])
        ]
      }
    }
  });

  // TEAM LEAD - Manages team tasks
  const teamLeadRole = await prisma.role.upsert({
    where: { code: 'TEAM_LEAD' },
    update: {},
    create: {
      code: 'TEAM_LEAD',
      name: 'Team Lead',
      description: 'Manages team tasks and assignments',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects', ['view']),
          ...getPerms('tasks'),
          ...getPerms('lists', ['view', 'create', 'edit']),
          ...getPerms('comments'),
          ...getPerms('attachments'),
          ...getPerms('tags', ['view', 'create']),
          ...getPerms('departments', ['view']),
          ...getPerms('sentiment', ['view']),
          ...getPerms('admin', ['view'])
        ]
      }
    }
  });

  // TEAM MEMBER - Works on assigned tasks
  const teamMemberRole = await prisma.role.upsert({
    where: { code: 'TEAM_MEMBER' },
    update: {},
    create: {
      code: 'TEAM_MEMBER',
      name: 'Team Member',
      description: 'Works on assigned tasks',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects', ['view']),
          ...getPerms('tasks', ['view', 'edit']),
          ...getPerms('lists', ['view']),
          ...getPerms('comments', ['view', 'create', 'edit']),
          ...getPerms('attachments', ['view', 'create']),
          ...getPerms('tags', ['view']),
          ...getPerms('admin', ['view'])
        ]
      }
    }
  });

  // HR / PEOPLE LEAD
  await prisma.role.upsert({
    where: { code: 'PEOPLE_LEAD' },
    update: {},
    create: {
      code: 'PEOPLE_LEAD',
      name: 'People & Culture Lead',
      description: 'Manages team sentiment and departments',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('sentiment'),
          ...getPerms('departments'),
          ...getPerms('projects', ['view']),
          ...getPerms('tasks', ['view']),
          ...getPerms('admin', ['view'])
        ]
      }
    }
  });

  // STAKEHOLDER (Viewer)
  await prisma.role.upsert({
    where: { code: 'STAKEHOLDER' },
    update: {},
    create: {
      code: 'STAKEHOLDER',
      name: 'Stakeholder',
      description: 'Read-only access to insights',
      isSystem: false,
      permissions: {
        connect: [
          ...getPerms('projects', ['view']),
          ...getPerms('tasks', ['view']),
          ...getPerms('lists', ['view']),
          ...getPerms('sentiment', ['view']),
          ...getPerms('departments', ['view']),
          ...getPerms('admin', ['view'])
        ]
      }
    }
  });

  // 3. Create Users
  const hashedPassword = await hash('admin', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { roleId: superAdminRole.id },
    create: {
      name: 'Super Administrator',
      username: 'admin',
      email: 'admin@dreamland.app',
      password: hashedPassword,
      roleId: superAdminRole.id,
    }
  });

  // Create additional sample users
  const pmUser = await prisma.user.upsert({
    where: { username: 'pm' },
    update: {},
    create: {
      name: 'Project Manager',
      username: 'pm',
      email: 'pm@dreamland.app',
      password: hashedPassword,
      roleId: strategicPmRole.id,
    }
  });

  const leadUser = await prisma.user.upsert({
    where: { username: 'lead' },
    update: {},
    create: {
      name: 'Tech Lead',
      username: 'lead',
      email: 'lead@dreamland.app',
      password: hashedPassword,
      roleId: teamLeadRole.id,
    }
  });

  const devUser = await prisma.user.upsert({
    where: { username: 'dev' },
    update: {},
    create: {
      name: 'Developer',
      username: 'dev',
      email: 'dev@dreamland.app',
      password: hashedPassword,
      roleId: teamMemberRole.id,
    }
  });

  console.log('✅ RBAC seeded: Roles and users created');

  // --- PROJECTS SEEDING ---
  
  // Read real projects from file if available
  const projectsFilePath = path.join(process.cwd(), 'data', 'reports', 'dreamland - projects.txt');
  let projectsFromFile: any[] = [];
  
  try {
    const rawData = await fs.readFile(projectsFilePath, 'utf-8');
    projectsFromFile = JSON.parse(rawData);
  } catch (error) {
    console.log('📄 No external projects file found, using sample data');
  }

  // Priority and type mappings
  const priorityMap: Record<string, string> = {
    'Alta': 'High',
    'Media': 'Medium',
    'Baja': 'Low'
  };
  const typeMap: Record<string, string> = {
    'Problema': 'Problem',
    'Idea': 'Idea',
    'Oportunidad': 'Idea'
  };

  // Create a sample project with full task management setup
  const sampleProject = await prisma.project.create({
    data: {
      title: 'Plataforma de E-commerce',
      department: 'Tech & Innovación',
      type: 'Initiative',
      priority: 'High',
      description: 'Desarrollo de una nueva plataforma de comercio electrónico con funcionalidades avanzadas de gestión de inventario y pagos.',
      startDate: new Date('2026-02-01'),
      dueDate: new Date('2026-06-30'),
      progress: 15,
      color: '#3B82F6', // blue
    }
  });

  // Create task statuses for the sample project
  const statusTodo = await prisma.taskStatus.create({
    data: {
      name: 'To Do',
      color: '#6B7280', // gray
      position: 0,
      isDefault: true,
      isClosed: false,
      projectId: sampleProject.id,
    }
  });

  const statusInProgress = await prisma.taskStatus.create({
    data: {
      name: 'In Progress',
      color: '#3B82F6', // blue
      position: 1,
      isDefault: false,
      isClosed: false,
      projectId: sampleProject.id,
    }
  });

  const statusReview = await prisma.taskStatus.create({
    data: {
      name: 'Review',
      color: '#F59E0B', // amber
      position: 2,
      isDefault: false,
      isClosed: false,
      projectId: sampleProject.id,
    }
  });

  const statusDone = await prisma.taskStatus.create({
    data: {
      name: 'Done',
      color: '#10B981', // green
      position: 3,
      isDefault: false,
      isClosed: true,
      projectId: sampleProject.id,
    }
  });

  // Create tags for the project
  const tagFrontend = await prisma.tag.create({
    data: { name: 'Frontend', color: '#8B5CF6', projectId: sampleProject.id }
  });
  const tagBackend = await prisma.tag.create({
    data: { name: 'Backend', color: '#EF4444', projectId: sampleProject.id }
  });
  const tagDesign = await prisma.tag.create({
    data: { name: 'Design', color: '#EC4899', projectId: sampleProject.id }
  });
  const tagUrgent = await prisma.tag.create({
    data: { name: 'Urgent', color: '#F97316', projectId: sampleProject.id }
  });

  // Create task lists (phases)
  const listPlanning = await prisma.taskList.create({
    data: {
      name: 'Planning',
      description: 'Initial project planning and requirements',
      position: 0,
      color: '#6366F1', // indigo
      projectId: sampleProject.id,
    }
  });

  const listDevelopment = await prisma.taskList.create({
    data: {
      name: 'Development',
      description: 'Active development phase',
      position: 1,
      color: '#3B82F6', // blue
      projectId: sampleProject.id,
    }
  });

  const listTesting = await prisma.taskList.create({
    data: {
      name: 'Testing & QA',
      description: 'Quality assurance and testing',
      position: 2,
      color: '#10B981', // green
      projectId: sampleProject.id,
    }
  });

  // Create sample tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Definir requisitos del sistema',
      description: 'Documentar todos los requisitos funcionales y no funcionales del sistema de e-commerce.',
      position: 0,
      startDate: new Date('2026-02-01'),
      dueDate: new Date('2026-02-07'),
      estimatedHours: 16,
      storyPoints: 5,
      progress: 100,
      listId: listPlanning.id,
      statusId: statusDone.id,
      assigneeId: pmUser.id,
    }
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Diseño de arquitectura',
      description: 'Diseñar la arquitectura técnica del sistema incluyendo base de datos, APIs y microservicios.',
      position: 1,
      startDate: new Date('2026-02-08'),
      dueDate: new Date('2026-02-14'),
      estimatedHours: 24,
      storyPoints: 8,
      progress: 100,
      listId: listPlanning.id,
      statusId: statusDone.id,
      assigneeId: leadUser.id,
      tags: { connect: [{ id: tagBackend.id }] }
    }
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Diseño de UI/UX',
      description: 'Crear los mockups y prototipos de la interfaz de usuario.',
      position: 2,
      startDate: new Date('2026-02-08'),
      dueDate: new Date('2026-02-21'),
      estimatedHours: 40,
      storyPoints: 13,
      progress: 75,
      listId: listPlanning.id,
      statusId: statusInProgress.id,
      tags: { connect: [{ id: tagDesign.id }, { id: tagFrontend.id }] }
    }
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Implementar autenticación',
      description: 'Sistema de login, registro y gestión de sesiones con JWT.',
      position: 0,
      startDate: new Date('2026-02-15'),
      dueDate: new Date('2026-02-28'),
      estimatedHours: 32,
      storyPoints: 8,
      progress: 50,
      listId: listDevelopment.id,
      statusId: statusInProgress.id,
      assigneeId: devUser.id,
      tags: { connect: [{ id: tagBackend.id }, { id: tagUrgent.id }] }
    }
  });

  // Create subtasks for task4
  await prisma.task.create({
    data: {
      title: 'Configurar JWT provider',
      position: 0,
      estimatedHours: 4,
      progress: 100,
      listId: listDevelopment.id,
      statusId: statusDone.id,
      parentId: task4.id,
      assigneeId: devUser.id,
    }
  });

  await prisma.task.create({
    data: {
      title: 'Implementar formulario de login',
      position: 1,
      estimatedHours: 8,
      progress: 75,
      listId: listDevelopment.id,
      statusId: statusInProgress.id,
      parentId: task4.id,
      assigneeId: devUser.id,
    }
  });

  await prisma.task.create({
    data: {
      title: 'Implementar registro de usuarios',
      position: 2,
      estimatedHours: 8,
      progress: 0,
      listId: listDevelopment.id,
      statusId: statusTodo.id,
      parentId: task4.id,
    }
  });

  const task5 = await prisma.task.create({
    data: {
      title: 'Desarrollar catálogo de productos',
      description: 'CRUD de productos con imágenes, categorías y variantes.',
      position: 1,
      startDate: new Date('2026-03-01'),
      dueDate: new Date('2026-03-15'),
      estimatedHours: 48,
      storyPoints: 13,
      progress: 0,
      listId: listDevelopment.id,
      statusId: statusTodo.id,
      tags: { connect: [{ id: tagFrontend.id }, { id: tagBackend.id }] }
    }
  });

  const task6 = await prisma.task.create({
    data: {
      title: 'Implementar carrito de compras',
      description: 'Sistema de carrito con persistencia y cálculo de totales.',
      position: 2,
      startDate: new Date('2026-03-10'),
      dueDate: new Date('2026-03-25'),
      estimatedHours: 32,
      storyPoints: 8,
      progress: 0,
      listId: listDevelopment.id,
      statusId: statusTodo.id,
      tags: { connect: [{ id: tagFrontend.id }] }
    }
  });

  const task7 = await prisma.task.create({
    data: {
      title: 'Tests unitarios',
      position: 0,
      startDate: new Date('2026-03-20'),
      dueDate: new Date('2026-04-01'),
      estimatedHours: 24,
      storyPoints: 5,
      progress: 0,
      listId: listTesting.id,
      statusId: statusTodo.id,
    }
  });

  const task8 = await prisma.task.create({
    data: {
      title: 'Tests de integración',
      position: 1,
      startDate: new Date('2026-04-01'),
      dueDate: new Date('2026-04-10'),
      estimatedHours: 16,
      storyPoints: 5,
      progress: 0,
      listId: listTesting.id,
      statusId: statusTodo.id,
    }
  });

  // Create dependencies
  // Task 2 depends on Task 1 (can't design architecture without requirements)
  await prisma.taskDependency.create({
    data: {
      predecessorId: task1.id,
      successorId: task2.id,
      type: 'FS',
      lagDays: 0,
    }
  });

  // Task 4 depends on Task 2 (can't implement auth without architecture)
  await prisma.taskDependency.create({
    data: {
      predecessorId: task2.id,
      successorId: task4.id,
      type: 'FS',
      lagDays: 0,
    }
  });

  // Task 5 depends on Task 4 (catalog needs auth system)
  await prisma.taskDependency.create({
    data: {
      predecessorId: task4.id,
      successorId: task5.id,
      type: 'FS',
      lagDays: 0,
    }
  });

  // Task 6 depends on Task 5 (cart needs catalog)
  await prisma.taskDependency.create({
    data: {
      predecessorId: task5.id,
      successorId: task6.id,
      type: 'SS', // Start-to-Start, can start when catalog starts
      lagDays: 5,
    }
  });

  // Task 7 depends on Task 4 (can test auth when done)
  await prisma.taskDependency.create({
    data: {
      predecessorId: task4.id,
      successorId: task7.id,
      type: 'FS',
      lagDays: 0,
    }
  });

  // Task 8 depends on Task 7
  await prisma.taskDependency.create({
    data: {
      predecessorId: task7.id,
      successorId: task8.id,
      type: 'FS',
      lagDays: 0,
    }
  });

  // Add some comments to demonstrate collaboration
  await prisma.taskComment.create({
    data: {
      content: 'He completado el documento de requisitos. Por favor revisa la sección de pagos.',
      taskId: task1.id,
      authorId: pmUser.id,
    }
  });

  await prisma.taskComment.create({
    data: {
      content: 'Revisado. Todo correcto, podemos proceder con la arquitectura.',
      taskId: task1.id,
      authorId: leadUser.id,
    }
  });

  await prisma.taskComment.create({
    data: {
      content: 'El JWT está configurado. Ahora trabajando en el formulario de login.',
      taskId: task4.id,
      authorId: devUser.id,
    }
  });

  console.log(`✅ Created sample project with ${8} tasks and dependencies`);

  // Create additional projects from file if available
  if (projectsFromFile.length > 0) {
    for (const project of projectsFromFile) {
      const newProject = await prisma.project.create({
        data: {
          title: project.titulo_proyecto,
          department: project.departamento_origen,
          type: typeMap[project.tipo] || 'Idea',
          priority: priorityMap[project.prioridad_detectada] || 'Medium',
          description: project.descripcion_corta,
          sourceQuote: project.fuente_cita,
          progress: 0,
        },
      });

      // Create default statuses for each project
      await prisma.taskStatus.createMany({
        data: [
          { name: 'To Do', color: '#6B7280', position: 0, isDefault: true, projectId: newProject.id },
          { name: 'In Progress', color: '#3B82F6', position: 1, projectId: newProject.id },
          { name: 'Review', color: '#F59E0B', position: 2, projectId: newProject.id },
          { name: 'Done', color: '#10B981', position: 3, isClosed: true, projectId: newProject.id },
        ]
      });
    }
    console.log(`✅ Created ${projectsFromFile.length} additional projects from file`);
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
