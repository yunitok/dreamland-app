
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();



// Configure Prisma Client with Adapter for robustness
console.log('Initializing Prisma Client...');
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Failsafe timeout
setTimeout(() => {
    console.error('SCRIPT TIMED OUT after 60 seconds');
    process.exit(1);
}, 60000);

async function main() {
  console.log('Script started.');
  const backupPath = path.join(process.cwd(), 'backup-data-mcp.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found:', backupPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('Loaded backup data. Keys:', Object.keys(data).join(', '));

  try {
    console.log('Attempting database connection...');
    await prisma.$connect();
    console.log('Database connected successfully.');

    // 1. Clean existing data (Reverse dependency order)
    console.log('Cleaning existing data...');
    
    console.log('Deleting ChatSession...'); await prisma.chatSession.deleteMany();
    console.log('Deleting AiUsageLog...'); await prisma.aiUsageLog.deleteMany();
    console.log('Deleting ProjectRisk...'); await prisma.projectRisk.deleteMany();
    console.log('Deleting TeamMood...'); await prisma.teamMood.deleteMany();
    console.log('Deleting _TagToTask...'); await prisma.$executeRawUnsafe('DELETE FROM "_TagToTask"');
    console.log('Deleting Tag...'); await prisma.tag.deleteMany();
    console.log('Deleting TaskAttachment...'); await prisma.taskAttachment.deleteMany();
    console.log('Deleting TaskComment...'); await prisma.taskComment.deleteMany();
    console.log('Deleting TaskDependency...'); await prisma.taskDependency.deleteMany();
    console.log('Deleting Task...'); await prisma.task.deleteMany();
    console.log('Deleting TaskList...'); await prisma.taskList.deleteMany();
    console.log('Deleting TaskStatus...'); await prisma.taskStatus.deleteMany();
    console.log('Deleting Project...'); await prisma.project.deleteMany();
    console.log('Deleting User...'); await prisma.user.deleteMany();
    console.log('Deleting _PermissionToRole...'); await prisma.$executeRawUnsafe('DELETE FROM "_PermissionToRole"');
    console.log('Deleting Permission...'); await prisma.permission.deleteMany();
    console.log('Deleting Role...'); await prisma.role.deleteMany();
    
    console.log('Data cleaned.');

    // 2. Restore Data (Dependency Order)
    
    // Helper to process dates
    const processData = (items) => {
      if (!items) return []; 
      return items.map(item => {
        const newItem = { ...item };
        for (const key in newItem) {
          if (typeof newItem[key] === 'string' && 
              (key.endsWith('At') || key === 'startDate' || key === 'dueDate')) {
            const d = new Date(newItem[key]);
            if (!isNaN(d.getTime())) {
              newItem[key] = d;
            }
          }
        }
        return newItem;
      });
    };

    // Role
    if (data.Role && data.Role.length > 0) {
        console.log(`Restoring ${data.Role.length} Roles...`);
        await prisma.role.createMany({ data: processData(data.Role) });
        console.log('Roles restored.');
    }

    // Permission
    if (data.Permission && data.Permission.length > 0) {
        console.log(`Restoring ${data.Permission.length} Permissions...`);
        await prisma.permission.createMany({ data: processData(data.Permission) });
        console.log('Permissions restored.');
    }

    // _PermissionToRole
    if (data._PermissionToRole && data._PermissionToRole.length > 0) {
        console.log(`Restoring ${data._PermissionToRole.length} _PermissionToRole relations...`);
        for (const rel of data._PermissionToRole) {
            await prisma.$executeRawUnsafe(
                'INSERT INTO "_PermissionToRole" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                rel.A, rel.B
            );
        }
        console.log('_PermissionToRole restored.');
    }

    // User
    if (data.User && data.User.length > 0) {
        console.log(`Restoring ${data.User.length} Users...`);
        await prisma.user.createMany({ data: processData(data.User) });
        console.log('Users restored.');
    }

    // Project
    if (data.Project && data.Project.length > 0) {
        console.log(`Restoring ${data.Project.length} Projects...`);
        await prisma.project.createMany({ data: processData(data.Project) });
        console.log('Projects restored.');
    }

    // TaskStatus
    if (data.TaskStatus && data.TaskStatus.length > 0) {
        console.log(`Restoring ${data.TaskStatus.length} TaskStatuses...`);
        await prisma.taskStatus.createMany({ data: processData(data.TaskStatus) });
        console.log('TaskStatuses restored.');
    }

    // TaskList
    if (data.TaskList && data.TaskList.length > 0) {
        console.log(`Restoring ${data.TaskList.length} TaskLists...`);
        await prisma.taskList.createMany({ data: processData(data.TaskList) });
        console.log('TaskLists restored.');
    }

    // Task
    if (data.Task && data.Task.length > 0) {
        console.log(`Restoring ${data.Task.length} Tasks...`);
        
        const tasks = processData(data.Task);
        // Pass 1: Insert without parentId
        const tasksOutput = tasks.map(t => {
            const { parentId, ...rest } = t; 
            return { ...rest, parentId: null };
        });
        
        await prisma.task.createMany({ data: tasksOutput });
        console.log('Tasks (pass 1) inserted.');
        
        // Pass 2: Update parentId
        const tasksWithParent = tasks.filter(t => t.parentId);
        console.log(`Updating parentIds for ${tasksWithParent.length} tasks...`);
        let updatedCount = 0;
        for (const task of tasksWithParent) {
            await prisma.task.update({
                where: { id: task.id },
                data: { parentId: task.parentId }
            });
            updatedCount++;
            if (updatedCount % 10 === 0) process.stdout.write('.');
        }
        console.log('\nTasks (pass 2) updated.');
    }

    // TaskComment
    if (data.TaskComment && data.TaskComment.length > 0) {
        console.log(`Restoring ${data.TaskComment.length} TaskComments...`);
        await prisma.taskComment.createMany({ data: processData(data.TaskComment) });
        console.log('TaskComments restored.');
    }

    // TaskAttachment
    if (data.TaskAttachment && data.TaskAttachment.length > 0) {
        console.log(`Restoring ${data.TaskAttachment.length} TaskAttachments...`);
        await prisma.taskAttachment.createMany({ data: processData(data.TaskAttachment) });
        console.log('TaskAttachments restored.');
    }
    
    // TaskDependency
    if (data.TaskDependency && data.TaskDependency.length > 0) {
        console.log(`Restoring ${data.TaskDependency.length} TaskDependencies...`);
        await prisma.taskDependency.createMany({ data: processData(data.TaskDependency) });
        console.log('TaskDependencies restored.');
    }

    // Tag
    if (data.Tag && data.Tag.length > 0) {
        console.log(`Restoring ${data.Tag.length} Tags...`);
        await prisma.tag.createMany({ data: processData(data.Tag) });
        console.log('Tags restored.');
    }

    // _TagToTask
    if (data._TagToTask && data._TagToTask.length > 0) {
        console.log(`Restoring ${data._TagToTask.length} _TagToTask relations...`);
        for (const rel of data._TagToTask) {
             await prisma.$executeRawUnsafe(
                'INSERT INTO "_TagToTask" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                rel.A, rel.B
            );
        }
        console.log('_TagToTask restored.');
    }

    // TeamMood
    if (data.TeamMood && data.TeamMood.length > 0) {
        console.log(`Restoring ${data.TeamMood.length} TeamMoods...`);
        await prisma.teamMood.createMany({ data: processData(data.TeamMood) });
        console.log('TeamMoods restored.');
    }

    // ProjectRisk
    if (data.ProjectRisk && data.ProjectRisk.length > 0) {
        console.log(`Restoring ${data.ProjectRisk.length} ProjectRisks...`);
        await prisma.projectRisk.createMany({ data: processData(data.ProjectRisk) });
        console.log('ProjectRisks restored.');
    }

    // AiUsageLog
    if (data.AiUsageLog && data.AiUsageLog.length > 0) {
        console.log(`Restoring ${data.AiUsageLog.length} AiUsageLogs...`);
        await prisma.aiUsageLog.createMany({ data: processData(data.AiUsageLog) });
        console.log('AiUsageLogs restored.');
    }
    
    // ChatSession
    if (data.ChatSession && data.ChatSession.length > 0) {
         console.log(`Restoring ${data.ChatSession.length} ChatSessions...`);
         await prisma.chatSession.createMany({ data: processData(data.ChatSession) });
         console.log('ChatSessions restored.');
    }

    console.log('Restoration completed successfully.');
    // Explicit exit
    process.exit(0);

  } catch (e) {
    console.error('Error restoring data:', e);
    process.exit(1);
  } finally {
    console.log('Disconnecting...');
    await prisma.$disconnect();
    console.log('Disconnected.');
  }
}


main();
