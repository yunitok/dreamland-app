import fs from 'fs';
import path from 'path';

// Files that need frontmatter with their titles and descriptions
const filesToUpdate = [
  {
    path: 'docs/capabilities/internationalization.md',
    title: 'Internationalization',
    description: 'Multi-language support with next-intl for 6 languages'
  },
  {
    path: 'docs/capabilities/ai-assistant/architecture.md',
    title: 'AI Assistant Architecture',
    description: 'Provider pattern for AI services with Groq and Gemini integration'
  },
  {
    path: 'docs/capabilities/ai-assistant/chat-agent.md',
    title: 'Chat Agent',
    description: 'Conversational AI interface for project management'
  },
  {
    path: 'docs/capabilities/ai-assistant/gemini-integration.md',
    title: 'Gemini Integration',
    description: 'Google Gemini AI provider implementation'
  },
  {
    path: 'docs/capabilities/ai-assistant/groq-integration.md',
    title: 'Groq Integration',
    description: 'Groq AI provider with Llama 3.3 70B model'
  },
  {
    path: 'docs/capabilities/ai-assistant/usage-tracking.md',
    title: 'AI Usage Tracking',
    description: 'Rate limiting and usage monitoring for AI providers'
  },
  {
    path: 'docs/database/data-model.md',
    title: 'Data Model',
    description: 'Complete database schema with entity relationships'
  },
  {
    path: 'docs/database/seeding.md',
    title: 'Database Seeding',
    description: 'Initial data setup and customization scripts'
  },
  {
    path: 'docs/guides/deployment.md',
    title: 'Deployment Guide',
    description: 'Production deployment instructions for Vercel, Railway, and AWS'
  },
  {
    path: 'docs/guides/voice-commands.md',
    title: 'Voice Commands',
    description: 'Using voice input for project management tasks'
  },
  {
    path: 'docs/modules/admin/index.md',
    title: 'Admin Module',
    description: 'User management, RBAC, and system settings'
  },
  {
    path: 'docs/modules/admin/rbac.md',
    title: 'Role-Based Access Control',
    description: 'Permission system and role management'
  },
  {
    path: 'docs/modules/projects/tasks/task-details.md',
    title: 'Task Details',
    description: 'Detailed task view with comments, attachments, and dependencies'
  },
  {
    path: 'docs/modules/projects/tasks/task-lists.md',
    title: 'Task Lists',
    description: 'Managing task lists and views (Board, Calendar, Gantt, Timeline)'
  },
  {
    path: 'docs/modules/reports/index.md',
    title: 'Reports Module',
    description: 'AI-generated status reports and project analysis'
  },
];

function addFrontmatter(filePath: string, title: string, description: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Check if frontmatter already exists
  if (content.startsWith('---')) {
    console.log(`✓ Skipping ${filePath} (already has frontmatter)`);
    return;
  }
  
  const frontmatter = `---
title: ${title}
description: ${description}
---

`;
  
  const newContent = frontmatter + content;
  fs.writeFileSync(fullPath, newContent, 'utf-8');
  console.log(`✓ Added frontmatter to ${filePath}`);
}

console.log('Adding frontmatter to documentation files...\n');

filesToUpdate.forEach(({ path, title, description }) => {
  addFrontmatter(path, title, description);
});

console.log('\n✅ Done!');
