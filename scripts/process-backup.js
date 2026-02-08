
const fs = require('fs');
const path = require('path');

const inputPath = String.raw`C:\Users\miguel\.gemini\antigravity\brain\6c4ecb30-6c4a-4f30-9207-120420c4b67b\.system_generated\steps\1937\output.txt`;
const outputPath = path.join(process.cwd(), 'backup-data-mcp.json');

try {
  let content = fs.readFileSync(inputPath, 'utf8');

  // API output might be a JSON string (wrapped in quotes), try to unwrap it first
  if (content.trim().startsWith('"')) {
    try {
        content = JSON.parse(content);
        console.log('Successfully unwrapped JSON string from file.');
    } catch (e) {
        console.log('File starts with quote but is not valid JSON string, using raw content.');
    }
  }
  
  // Extract JSON between untrusted-data tags
  const match = content.match(/<untrusted-data-[^>]+>\s*(\[[\s\S]*?\])\s*<\/untrusted-data-[^>]+>/);
  
  if (match && match[1]) {
    console.log('Found data match, length:', match[1].length);
    const rawData = JSON.parse(match[1]);
    // The data is wrapped in [{ json_build_object: { ... } }]
    const backupData = rawData[0].json_build_object;
    
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));
    console.log('Backup processed and saved to:', outputPath);
    console.log('Keys:', Object.keys(backupData).join(', '));
  } else {
    console.error('Could not find JSON data in output file');
    // Fallback: try to find start of JSON array
    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        console.log('Attempting fallback extraction...');
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const rawData = JSON.parse(jsonStr);
        const backupData = rawData[0].json_build_object;
        fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));
        console.log('Backup processed (fallback) and saved to:', outputPath);
    }
  }
} catch (error) {
  console.error('Error processing backup:', error);
  process.exit(1);
}
