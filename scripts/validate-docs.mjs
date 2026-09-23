#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const operationalDocs = [
  'README.md',
  'GETTING_STARTED.md',
  'docs/QUICK_START.md',
  'docs/API.md',
  'docs/DEMO.md',
  'docs/DEPLOYMENT.md',
  'docs/PRODUCTION_DEPLOYMENT.md',
  'docs/UPGRADE.md',
  'docs/ENV_CONFIGURATION.md',
  'docs/DATABASE_SCHEMA.md',
  'docs/INTEGRATION_IMPLEMENTATION_STATUS.md',
  'docs/REMOTE_DEPLOYMENT.md',
  'docs/deployment/supabase-vercel-migration.md',
  'docs/guides/integrations-setup.md',
  'docs/help/README.md',
  'docs/help/TRUST_CENTER_CUSTOM_DOMAIN.md',
  'docs/help/admin/organization.md',
  'docs/help/audit/ai-features.md',
  'docs/help/audit/fieldguide.md',
  'docs/help/ai-mcp/mcp-servers.md',
  'docs/help/getting-started/first-steps.md',
  'docs/help/getting-started/demo-data.md',
  'docs/help/deployment/cloud-deployment.md',
  'docs/help/integrations/connecting-integrations.md',
  'docs/help/trust/ai-features.md',
  'docs/help/data/evidence-collectors.md',
  'docs/help/ai-mcp/ai-configuration.md',
  'monitoring/README.md',
  'services/shared/README.md',
];

const requiredTargets = [
  'start.sh',
  'start.bat',
  'scripts/start-demo.sh',
  'scripts/stop-demo.sh',
  'scripts/generate-dev-certs.sh',
  'deploy/backup.sh',
  'deploy/restore.sh',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'env.example.production',
  'services/shared/prisma/schema.prisma',
  'services/controls/docker-entrypoint.sh',
  'database/init/12-bcdr-module.sql',
];

const forbiddenClaims = [
  {
    pattern: /gitpod\.io\/#|open-in-gitpod/i,
    message: 'Gitpod launch claim exists without repository configuration',
  },
  {
    pattern: /create codespace|codespaces free tier/i,
    message: 'Codespaces launch claim exists without repository configuration',
  },
  {
    pattern: /supabase\s*\+\s*vercel\s*\(recommended\)/i,
    message: 'Supabase/Vercel is incorrectly marked recommended',
  },
  {
    pattern: /rustfsadmin\s*[/|:]\s*rustfsadmin|grc\s*[/|:]\s*grc_secret/i,
    message: 'A shared development password is documented',
  },
  {
    pattern: /from each service directory|schema-controls\.prisma/i,
    message: 'A per-service or nonexistent-schema migration flow is documented',
  },
];

const errors = [];

for (const relativePath of requiredTargets) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`missing command/config target: ${relativePath}`);
  }
}

for (const relativePath of operationalDocs) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`missing operational document: ${relativePath}`);
    continue;
  }

  const content = readFileSync(absolutePath, 'utf8');

  for (const { pattern, message } of forbiddenClaims) {
    if (pattern.test(content)) {
      errors.push(`${relativePath}: ${message}`);
    }
  }

  const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    let destination = match[1].trim();
    if (destination.startsWith('<') && destination.endsWith('>')) {
      destination = destination.slice(1, -1);
    } else {
      destination = destination.split(/\s+/)[0];
    }

    if (
      !destination ||
      destination.startsWith('#') ||
      destination.startsWith('/') ||
      /^(?:https?:|mailto:|tel:|data:)/i.test(destination)
    ) {
      continue;
    }

    const pathOnly = decodeURIComponent(destination.split('#')[0].split('?')[0]);
    if (!pathOnly) continue;

    const target = resolve(dirname(absolutePath), pathOnly);
    if (!existsSync(target)) {
      errors.push(`${relativePath}: broken local link ${destination}`);
      continue;
    }

    if (destination.endsWith('/') && !statSync(target).isDirectory()) {
      errors.push(`${relativePath}: expected directory link ${destination}`);
    }
  }
}

const wrapper = readFileSync(resolve(root, 'scripts/start-demo.sh'), 'utf8');
if (!wrapper.includes('exec "$PROJECT_ROOT/start.sh" "$@"')) {
  errors.push('scripts/start-demo.sh does not delegate to start.sh');
}

const stopWrapper = readFileSync(resolve(root, 'scripts/stop-demo.sh'), 'utf8');
if (!stopWrapper.includes('exec "$PROJECT_ROOT/start.sh" stop')) {
  errors.push('scripts/stop-demo.sh does not delegate to start.sh stop');
}

if (errors.length > 0) {
  console.error('Documentation validation failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Documentation validation passed (${operationalDocs.length} docs, ${requiredTargets.length} command/config targets).`
);
