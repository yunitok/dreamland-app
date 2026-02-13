import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'docs');

const REPLACEMENTS = [
  { from: 'features/admin-panel.md', to: 'modules/admin/index.md' },
  { from: 'features/rbac/overview.md', to: 'modules/admin/rbac.md' },
  { from: 'features/projects/', to: 'modules/projects/' },
  { from: 'features/tasks/', to: 'modules/projects/tasks/' },
  { from: 'features/reports.md', to: 'modules/reports/index.md' },
  { from: 'features/sherlock.md', to: 'modules/sherlock/index.md' },
  { from: 'features/ai-chat-agent.md', to: 'capabilities/ai-assistant/chat-agent.md' },
  { from: 'features/voice-assistant/', to: 'capabilities/ai-assistant/' },
  { from: 'features/authentication.md', to: 'capabilities/authentication.md' },
  { from: 'features/internationalization.md', to: 'capabilities/internationalization.md' },
  // Fix relative links like ../features/foo -> ../modules/foo
  { from: '../features/', to: '../modules/' },
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      if (file.endsWith('.md')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

function updateLinks() {
  const files = getAllFiles(DOCS_DIR);
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // specialized fixes for specific files
    if (file.includes('system-overview.md')) {
         content = content.replace(/features\/voice-assistant\/architecture\.md/g, 'capabilities/ai-assistant/voice-architecture.md');
         content = content.replace(/features\/rbac\/overview\.md/g, 'modules/admin/rbac.md');
    }

    // General replacements
    REPLACEMENTS.forEach(({ from, to }) => {
        // Simple string replacement for now, could be improved with regex
        content = content.split(from).join(to);
    });

    if (content !== originalContent) {
        console.log(`Updating links in ${path.relative(process.cwd(), file)}`);
        fs.writeFileSync(file, content);
    }
  });
}

updateLinks();
