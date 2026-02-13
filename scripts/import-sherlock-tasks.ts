
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs/promises';
import path from 'path';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🕵️‍♂️ Importing Detailed Sherlock Tasks...');

  const filePath = path.join(process.cwd(), 'data', 'sherlock_taks.md');
  const fileContent = await fs.readFile(filePath, 'utf-8');

  // Find Sherlock Project
  const project = await prisma.project.findFirst({
    where: { title: { contains: 'Sherlock', mode: 'insensitive' } }
  });

  if (!project) {
    console.error('❌ Sherlock project not found!');
    process.exit(1);
  }

  // Basic Todo Status
  let todoStatus = await prisma.taskStatus.findFirst({ where: { name: 'To Do' } });
  if (!todoStatus) {
      todoStatus = await prisma.taskStatus.create({ data: { name: 'To Do', color: '#ccc' } });
  }

  // Regex to parse blocks and tasks
  // Blocks: 🧱 BLOQUE 1: title
  // Tasks: Tarea X.Y: Title
  // Desc: • Descripción: text
  // Tags: • Etiquetas: tag1, tag2
  
  const lines = fileContent.split('\n');
  let currentListId: string | null = null;
  let currentTaskData: any = {};
  let currentTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Detect Block (List)
    const blockMatch = line.match(/(?:📂|🔗|💻|🤖|🛡️|📊|🎓|🧱)\s*BLOQUE\s*\d+:\s*(.+)/i);
    if (blockMatch) {
      // Save previous task if pending
      if (currentTaskData.title) await saveTask(currentTaskData, currentTags, project.id, currentListId, todoStatus.id);
      currentTaskData = {};
      currentTags = [];

      const listName = blockMatch[1].trim();
      console.log(`📂 Processing List: ${listName}`);
      
      const list = await prisma.taskList.upsert({
        where: { id: `sherlock-block-${listName.substring(0, 10)}-${project.id}` }, // Generate a consistent ID based on name? No, upsert needs unique.
        // Better: findFirst then create.
        update: {},
        create: { name: listName, projectId: project.id }
      });
      // The reliable way since we don't have unique name per project constraint enforced by upsert easily without composite ID
      let dbList = await prisma.taskList.findFirst({ where: { projectId: project.id, name: listName } });
      if (!dbList) {
          dbList = await prisma.taskList.create({ data: { name: listName, projectId: project.id } });
      }
      currentListId = dbList.id;
      continue;
    }

    // 2. Detect Task
    const taskMatch = line.match(/^Tarea\s*\d+\.\d+:\s*(.+)/);
    if (taskMatch) {
       // Save previous task
       if (currentTaskData.title) await saveTask(currentTaskData, currentTags, project.id, currentListId, todoStatus.id);
       currentTaskData = { title: taskMatch[1].trim(), description: '' };
       currentTags = [];
       console.log(`  > Found Task: ${currentTaskData.title}`);
       continue;
    }

    // 3. Detect Properties
    if (line.startsWith('• Descripción:')) {
        currentTaskData.description += line.replace('• Descripción:', '').trim() + '\n';
    }
    else if (line.startsWith('• Problema Actual:')) {
        currentTaskData.description += '\n\n**Problema Actual:** ' + line.replace('• Problema Actual:', '').trim();
    }
    else if (line.startsWith('• Solución:')) {
        currentTaskData.description += '\n\n**Solución:** ' + line.replace('• Solución:', '').trim();
    }
    else if (line.startsWith('• Etiquetas:')) {
        const tags = line.replace('• Etiquetas:', '').split(',').map(t => t.trim());
        currentTags.push(...tags);
    }
    else if (line.startsWith('• Prioridad:')) {
        // Maybe map priority to something? For now append to desc or just log
        // currentTaskData.description += '\n**Prioridad:** ' + line.replace('• Prioridad:', '').trim();
        // Or if we had a priority field on task... we don't, only on Project.
        // We can add a tag for priority?
        const prio = line.replace('• Prioridad:', '').trim();
        if (prio.includes('Must Have')) currentTags.push('Must Have');
        if (prio.includes('Should Have')) currentTags.push('Should Have');
        if (prio.includes('Could Have')) currentTags.push('Could Have');
    }
  }

  // Save last task
  if (currentTaskData.title) await saveTask(currentTaskData, currentTags, project.id, currentListId, todoStatus.id);

  console.log('✅ Import Complete');
}


function getTagColor(tagName: string): string {
    const lower = tagName.toLowerCase();
    
    // Priorities
    if (lower.includes('must have') || lower.includes('urgente')) return '#EF4444'; // Red
    if (lower.includes('should have')) return '#F97316'; // Orange
    if (lower.includes('could have')) return '#EAB308'; // Yellow
    if (lower.includes('won\'t have')) return '#9CA3AF'; // Gray

    // Tech Domains
    if (['backend', 'database', 'core', 'data structure', 'sql', 'api'].some(k => lower.includes(k))) return '#3B82F6'; // Blue
    if (['frontend', 'ux/ui', 'mobile', 'interfaz', 'input'].some(k => lower.includes(k))) return '#EC4899'; // Pink
    if (['ai', 'bot', 'chatbot', 'rag', 'llm', 'intelligence'].some(k => lower.includes(k))) return '#8B5CF6'; // Violet
    if (['integration', 'web', 'jurest', 'connect'].some(k => lower.includes(k))) return '#10B981'; // Emerald

    // Functional / Biz
    if (['operations', 'purchasing', 'stock', 'workflow', 'paperless'].some(k => lower.includes(k))) return '#F59E0B'; // Amber
    if (['data governance', 'mapping', 'bi', 'analytics', 'reviews'].some(k => lower.includes(k))) return '#06B6D4'; // Cyan
    if (['safety', 'health', 'quality', 'control'].some(k => lower.includes(k))) return '#14B8A6'; // Teal
    if (['training', 'media', 'communication', 'slack', 'sala'].some(k => lower.includes(k))) return '#84CC16'; // Lime

    return '#6B7280'; // Default Gray
}

async function saveTask(taskData: any, tagNames: string[], projectId: string, listId: string | null, statusId: string) {
    if (!listId) return;

    // 1. Create/Get Tags
    const tagConnect = [];
    for (const tagName of tagNames) {
        if (!tagName) continue;
        const color = getTagColor(tagName);
        
        let tag = await prisma.tag.findFirst({ where: { projectId, name: tagName } });
        
        if (!tag) {
            tag = await prisma.tag.create({ 
                data: { name: tagName, projectId, color } 
            });
        } else {
             // Update color if existing to match new scheme
             await prisma.tag.update({
                 where: { id: tag.id },
                 data: { color }
             });
        }
        tagConnect.push({ id: tag.id });
    }

    // 2. Create Task
    // Check if exists to avoid duplicates?
    const existing = await prisma.task.findFirst({
        where: { listId, title: taskData.title }
    });

    if (existing) {
        // Update tags or desc?
        await prisma.task.update({
            where: { id: existing.id },
            data: {
                description: taskData.description,
                tags: { connect: tagConnect }
            }
        });
    } else {
        await prisma.task.create({
            data: {
                title: taskData.title,
                description: taskData.description,
                listId,
                statusId,
                tags: { connect: tagConnect }
            }
        });
    }
}

main()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
