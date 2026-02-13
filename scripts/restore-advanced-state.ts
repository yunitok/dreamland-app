
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs/promises';
import path from 'path';
import { hash } from 'bcryptjs';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting Advanced State Restoration...');

  // 1. Restore Users
  try {
    const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
    const rawData = await fs.readFile(usersFilePath, 'utf-8');
    const json = JSON.parse(rawData);
    const users = Array.isArray(json) ? json : (json.users || []);
    
    console.log(`👥 Found ${users.length} users in data/users.json`);
    
    // Ensure TEAM_MEMBER role exists
    const basicRole = await prisma.role.findFirst({
        where: { code: 'TEAM_MEMBER' }
    });

    if (!basicRole) throw new Error("TEAM_MEMBER role not found");
    const defaultPassword = await hash('dreamland2026', 10);

    for (const user of users) {
        // Handle CSV-to-JSON specific format if keys have brackets
        const email = user['Email Address [Required]'] || user.email;
        const firstName = user['First Name [Required]'] || user.firstName || '';
        const lastName = user['Last Name [Required]'] || user.lastName || '';
        
        if (!email) continue;
        
        let username = email.split('@')[0];
        const fullName = `${firstName} ${lastName}`.trim() || username;

        // Ensure username is unique to avoid collision with different email but same handle
        const existingUsername = await prisma.user.findFirst({
            where: { 
                username,
                NOT: { email } // Ignore self if updating
            }
        });

        if (existingUsername) {
            username = `${username}_${Math.floor(Math.random() * 1000)}`;
        }

        await prisma.user.upsert({
            where: { email },
            update: {
                // Should we update name/username if they exist? Maybe not to preserve changes associated with existing account
                // But users.json might be "source of truth". Let's update name at least.
                name: fullName,
            },
            create: {
                username,
                email,
                name: fullName,
                password: defaultPassword,
                roleId: basicRole.id,
                mustChangePassword: true
            }
        });
    }
    console.log('✅ Users imported/verified.');
  } catch (error) {
    console.warn('⚠️  Could not restore users (file missing or invalid):', (error as Error).message);
  }

  // 2. High Priority & Tags for Sherlock/ATC
  console.log('📉 Resetting all projects to Low Priority...');
  await prisma.project.updateMany({
      data: { priority: 'Low' }
  });
  
  const projectsToUpdate = ['Sherlock', 'Atención al Cliente'];
  const highPriority = 'High';
  
  // Create Tags if they don't exist
  const tags = [
    { name: 'Strategic', color: '#EF4444' }, // Red
    { name: 'AI', color: '#8B5CF6' },        // Violet
    { name: 'Core', color: '#3B82F6' }       // Blue
  ];

  for (const tag of tags) {
      // Find a project to attach to? Tags are project-scoped in schema? 
      // Checking schema... usually tags are project-specific. 
      // If tags are project specific we need to create them PER project.
  }

  for (const titleKeyword of projectsToUpdate) {
      const projects = await prisma.project.findMany({
          where: { title: { contains: titleKeyword, mode: 'insensitive' } }
      });

      for (const p of projects) {
          console.log(`✨ Updating project: ${p.title}`);
          
          await prisma.project.update({
              where: { id: p.id },
              data: { 
                  priority: highPriority,
                  type: 'Initiative' // Ensure type is set
              }
          });

          // Add tags
          for (const t of tags) {
             const existingTag = await prisma.tag.findFirst({
                 where: { name: t.name, projectId: p.id }
             });
             
             if (!existingTag) {
                 await prisma.tag.create({
                     data: {
                         name: t.name,
                         color: t.color,
                         projectId: p.id
                     }
                 });
             }
          }
      }
  }
  console.log('✅ Priority and Tags updated.');

  
  // 3. Technical Analysis Task List & Custom Tags
  console.log('📝 Creating Tasks & Tags...');

  // Helper to get or create tag in project
  const getOrCreateTag = async (projectId: string, tagName: string, color: string = '#6B7280') => {
      let tag = await prisma.tag.findFirst({
          where: { projectId, name: tagName }
      });
      if (!tag) {
          tag = await prisma.tag.create({
              data: { name: tagName, projectId, color }
          });
      }
      return tag;
  };

  // Helper to create task with tags
  const createTask = async (listId: string, title: string, desc: string, tags: any[], estHours: number, projectId: string) => {
      const existingTask = await prisma.task.findFirst({
          where: { listId, title }
      });

      if (!existingTask) {
          await prisma.task.create({
              data: {
                  title,
                  description: desc,
                  estimatedHours: estHours,
                  listId,
                  statusId: (await getToDoStatus()).id,
                  tags: {
                      connect: tags.map(t => ({ id: t.id }))
                  }
              }
          });
      }
  };

  // --- SHERLOCK TASKS ---
  const sherlockProject = await prisma.project.findFirst({ where: { title: { contains: 'Sherlock', mode: 'insensitive' } } });
  if (sherlockProject) {
      console.log('  > Processing Sherlock tasks...');
      const list = await prisma.taskList.upsert({
          where: { id: 'sherlock-list-' + sherlockProject.id }, // Hacky ID check/upsert not strict here, assuming clean or findFirst
          create: { name: 'Arquitectura de Datos', projectId: sherlockProject.id, position: 0 },
          update: {},
      });
      // Correct way to get list since upsert needs unique constraint not guaranteed on name alone per project in schema (index only)
      // So let's use findFirst/create
      let sList = await prisma.taskList.findFirst({ where: { projectId: sherlockProject.id, name: 'Arquitectura de Datos' } });
      if (!sList) sList = await prisma.taskList.create({ data: { name: 'Arquitectura de Datos', projectId: sherlockProject.id } });

      const tasks = [
          { title: 'Diseñar Esquema de Base de Datos', tags: ['Datos', 'Urgente'], est: 8, desc: 'Ingredient, Recipe, RecipeItem models.' },
          { title: 'Desarrollar Script Aplanador de Excel', tags: ['Datos', 'Urgente'], est: 6, desc: 'Node.js script to normalize CSV.' },
          { title: 'Normalización de Entidades con IA', tags: ['IA', 'Datos'], est: 8, desc: 'Merge duplicates using LLM.' },
          { title: 'Diseñar Prompt del Sistema Chef GPT', tags: ['IA'], est: 6, desc: 'System constraints for recipe generation.' },
          { title: 'Implementar Pipeline RAG', tags: ['IA', 'Datos'], est: 12, desc: 'Vector store for inventory prices.' },
          { title: 'Construir Visor de Recetas (Admin UI)', tags: ['Interfaz'], est: 10, desc: 'Master-Detail form.' }
      ];

      for (const t of tasks) {
          const taskTags = [];
          for (const tagName of t.tags) {
              taskTags.push(await getOrCreateTag(sherlockProject.id, tagName, '#8B5CF6')); // Violet for IA/Tech
          }
          await createTask(sList.id, t.title, t.desc, taskTags, t.est, sherlockProject.id);
      }
  }

  // --- ATC TASKS ---
  const atcProject = await prisma.project.findFirst({ where: { title: { contains: 'Atención al Cliente', mode: 'insensitive' } } });
  if (atcProject) {
      console.log('  > Processing ATC tasks...');
      let atcList = await prisma.taskList.findFirst({ where: { projectId: atcProject.id, name: 'Automatización & Procesos' } });
      if (!atcList) atcList = await prisma.taskList.create({ data: { name: 'Automatización & Procesos', projectId: atcProject.id } });

      // Inferred tags from "Stack Tecnológico"
      const tasks = [
          { title: 'Gestión diaria de correos electrónicos', tags: ['n8n', 'Gemini', 'Supabase'], est: 8, desc: 'IMAP Trigger + Classification workflow.' },
          { title: 'Atención chat web', tags: ['React', 'Supabase', 'Gemini'], est: 12, desc: 'Realtime widget + Edge Function.' },
          { title: 'Gestión de "Late Arrivals"', tags: ['n8n', 'WhatsApp', 'Twilio'], est: 4, desc: 'Webhook trigger -15min.' },
          { title: 'Confirmación telefónica de reservas', tags: ['n8n', 'Dreamland UI'], est: 4, desc: 'Call list generator.' },
          { title: 'Alertas meteorológicas (Terrazas)', tags: ['OpenWeather', 'n8n', 'WhatsApp'], est: 6, desc: 'Rain forecast check.' },
          { title: 'Reubicación por incidencias local', tags: ['Prisma', 'n8n'], est: 8, desc: 'Mass notification workflow.' },
          { title: 'Generación manual de facturas', tags: ['n8n', 'Supabase Storage'], est: 6, desc: 'PDF generation integration.' }
      ];

      for (const t of tasks) {
          const taskTags = [];
          for (const tagName of t.tags) {
              let color = '#6B7280';
              if (['n8n', 'Supabase'].includes(tagName)) color = '#EC4899'; // Pink
              if (['Gemini', 'IA'].includes(tagName)) color = '#8B5CF6'; // Violet
              if (['React', 'Dreamland UI'].includes(tagName)) color = '#3B82F6'; // Blue
              taskTags.push(await getOrCreateTag(atcProject.id, tagName, color));
          }
          await createTask(atcList.id, t.title, t.desc, taskTags, t.est, atcProject.id);
      }
  }

  // 4. Update Project Schedules (AI Velocity)
  console.log('📅 Updating Schedules...');
  const AI_VELOCITY_FACTOR = 0.5; // 1 Story Point = 0.5 Days
  const BASE_START_DATE = new Date('2026-02-16T09:00:00'); // Start next Monday

  const allProjects = await prisma.project.findMany({
      include: { 
          lists: {
              include: { tasks: true }
          }
      }
  });

  let currentStartDate = new Date(BASE_START_DATE);

  for (const p of allProjects) {
      // Calculate total story points
      const allTasks = p.lists.flatMap(l => l.tasks);
      const totalSP = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0) || 10; // Default 10 if no tasks
      
      const durationDays = Math.ceil(totalSP * AI_VELOCITY_FACTOR);
      const endDate = new Date(currentStartDate);
      endDate.setDate(endDate.getDate() + durationDays);

      // Skip weekends for end date roughly
      if (endDate.getDay() === 0) endDate.setDate(endDate.getDate() + 1);
      if (endDate.getDay() === 6) endDate.setDate(endDate.getDate() + 2);

      await prisma.project.update({
          where: { id: p.id },
          data: {
              startDate: currentStartDate,
              dueDate: endDate
          }
      });

      // Stagger next project start
      currentStartDate = new Date(endDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1); // Start next day
  }
  console.log('✅ Schedules updated.');

  console.log('🎉 Advanced Restoration Complete!');
}

async function getToDoStatus() {
    const status = await prisma.taskStatus.findFirst({ where: { name: 'To Do' } });
    if (status) return status;
    return await prisma.taskStatus.create({
        data: { name: 'To Do', color: '#ccc', position: 0 }
    });
}

main()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
