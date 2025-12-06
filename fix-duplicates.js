// Script to remove duplicate iconSlug entries
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/controls/src/integrations/dto/integration.dto.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Remove duplicate iconSlug lines - keep only the first occurrence in each metadata block
// Match pattern: one or more iconSlug lines followed by another iconSlug
content = content.replace(/(iconSlug: '[^']*',\s*\n\s*)+(iconSlug: '[^']*',)/g, '$2');

fs.writeFileSync(filePath, content);
console.log('✅ Removed duplicate iconSlug entries');
