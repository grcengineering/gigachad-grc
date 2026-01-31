#!/usr/bin/env ts-node
/**
 * Standalone database seeding script
 * Run with: npx ts-node scripts/seed-database.ts
 * Or: npm run seed (if added to package.json)
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://grc:grc_secret@localhost:5433/gigachad_grc',
    },
  },
});

// Load seed data
const soc2Data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../database/seeds/soc2.json'), 'utf-8')
);
const iso27001Data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../database/seeds/iso27001.json'), 'utf-8')
);

interface SeedFramework {
  framework: {
    type: string;
    name: string;
    version: string;
    description: string;
  };
  categories: Array<{
    reference: string;
    title: string;
    description?: string;
    requirements?: Array<{
      reference: string;
      title: string;
      description?: string;
      guidance?: string;
      isCategory?: boolean;
      children?: Array<{
        reference: string;
        title: string;
        description?: string;
        guidance?: string;
      }>;
    }>;
  }>;
  controls?: Array<{
    controlId: string;
    title: string;
    description: string;
    category: string;
    guidance?: string;
    automationSupported?: boolean;
    tags?: string[];
    mappings?: string[];
  }>;
}

async function seedOrganization() {
  console.log('Creating default organization...');

  const org = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      description: 'Default organization for GigaChad GRC',
      status: 'active',
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        defaultFrameworks: ['soc2', 'iso27001'],
      },
    },
  });

  console.log(`  ✓ Created organization: ${org.id}`);
  return org;
}

async function seedFramework(data: SeedFramework) {
  console.log(`\nSeeding framework: ${data.framework.name}`);

  // Find or create framework (can't use upsert with null in unique constraint)
  let framework = await prisma.framework.findFirst({
    where: {
      type: data.framework.type,
      version: data.framework.version,
      organizationId: null,
    },
  });

  if (framework) {
    // Update existing framework
    framework = await prisma.framework.update({
      where: { id: framework.id },
      data: {
        name: data.framework.name,
        description: data.framework.description,
      },
    });
  } else {
    // Create new framework
    framework = await prisma.framework.create({
      data: {
        type: data.framework.type,
        name: data.framework.name,
        version: data.framework.version,
        description: data.framework.description,
        isActive: true,
        isCustom: false,
        organizationId: null,
      },
    });
  }

  console.log(`  ✓ Created framework: ${framework.id}`);

  // Create requirements
  let order = 0;
  let requirementCount = 0;

  for (const category of data.categories) {
    const categoryReq = await prisma.frameworkRequirement.upsert({
      where: {
        frameworkId_reference: {
          frameworkId: framework.id,
          reference: category.reference,
        },
      },
      update: {
        title: category.title,
        description: category.description || '',
      },
      create: {
        frameworkId: framework.id,
        reference: category.reference,
        title: category.title,
        description: category.description || '',
        level: 0,
        order: order++,
        isCategory: true,
      },
    });
    requirementCount++;

    for (const req of category.requirements || []) {
      if (req.isCategory && req.children) {
        const subCategoryReq = await prisma.frameworkRequirement.upsert({
          where: {
            frameworkId_reference: {
              frameworkId: framework.id,
              reference: req.reference,
            },
          },
          update: {
            title: req.title,
            description: req.description || '',
          },
          create: {
            frameworkId: framework.id,
            parentId: categoryReq.id,
            reference: req.reference,
            title: req.title,
            description: req.description || '',
            level: 1,
            order: order++,
            isCategory: true,
          },
        });
        requirementCount++;

        for (const child of req.children) {
          await prisma.frameworkRequirement.upsert({
            where: {
              frameworkId_reference: {
                frameworkId: framework.id,
                reference: child.reference,
              },
            },
            update: {
              title: child.title,
              description: child.description || '',
              guidance: child.guidance,
            },
            create: {
              frameworkId: framework.id,
              parentId: subCategoryReq.id,
              reference: child.reference,
              title: child.title,
              description: child.description || '',
              guidance: child.guidance,
              level: 2,
              order: order++,
              isCategory: false,
            },
          });
          requirementCount++;
        }
      } else {
        await prisma.frameworkRequirement.upsert({
          where: {
            frameworkId_reference: {
              frameworkId: framework.id,
              reference: req.reference,
            },
          },
          update: {
            title: req.title,
            description: req.description || '',
            guidance: req.guidance,
          },
          create: {
            frameworkId: framework.id,
            parentId: categoryReq.id,
            reference: req.reference,
            title: req.title,
            description: req.description || '',
            guidance: req.guidance,
            level: 1,
            order: order++,
            isCategory: false,
          },
        });
        requirementCount++;
      }
    }
  }

  console.log(`  ✓ Created ${requirementCount} requirements`);

  // Create controls and mappings
  let controlCount = 0;
  let mappingCount = 0;

  for (const controlData of data.controls || []) {
    // Use findFirst + create/update pattern since upsert doesn't support null in composite keys
    let control = await prisma.control.findFirst({
      where: {
        controlId: controlData.controlId,
        organizationId: null,
      },
    });

    if (control) {
      control = await prisma.control.update({
        where: { id: control.id },
        data: {
          title: controlData.title,
          description: controlData.description,
          category: controlData.category,
          guidance: controlData.guidance,
        },
      });
    } else {
      control = await prisma.control.create({
        data: {
          controlId: controlData.controlId,
          title: controlData.title,
          description: controlData.description,
          category: controlData.category,
          guidance: controlData.guidance,
          isCustom: false,
          automationSupported: controlData.automationSupported || false,
          tags: controlData.tags || [],
        },
      });
    }
    controlCount++;

    for (const reqRef of controlData.mappings || []) {
      const requirement = await prisma.frameworkRequirement.findFirst({
        where: {
          frameworkId: framework.id,
          reference: reqRef,
        },
      });

      if (requirement) {
        await prisma.controlMapping.upsert({
          where: {
            frameworkId_requirementId_controlId: {
              frameworkId: framework.id,
              requirementId: requirement.id,
              controlId: control.id,
            },
          },
          update: {},
          create: {
            frameworkId: framework.id,
            requirementId: requirement.id,
            controlId: control.id,
            mappingType: 'primary',
            createdBy: 'system',
          },
        });
        mappingCount++;
      }
    }
  }

  console.log(`  ✓ Created ${controlCount} controls`);
  console.log(`  ✓ Created ${mappingCount} control-to-requirement mappings`);

  return framework;
}

// Default permission groups with permissions
const DEFAULT_PERMISSION_GROUPS = {
  administrator: {
    name: 'Administrator',
    description: 'Full access to all resources and actions',
    permissions: [
      { resource: 'controls', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'evidence', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'policies', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'frameworks', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'integrations', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'audit_logs', actions: ['read', 'export'], scope: { ownership: 'all' } },
      { resource: 'users', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'permissions', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'settings', actions: ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'], scope: { ownership: 'all' } },
      { resource: 'dashboard', actions: ['read'], scope: { ownership: 'all' } },
    ],
  },
  compliance_manager: {
    name: 'Compliance Manager',
    description: 'Manage controls, evidence, and policies',
    permissions: [
      { resource: 'controls', actions: ['read', 'create', 'update', 'assign'], scope: { ownership: 'all' } },
      { resource: 'evidence', actions: ['read', 'create', 'update', 'approve'], scope: { ownership: 'all' } },
      { resource: 'policies', actions: ['read', 'create', 'update', 'approve'], scope: { ownership: 'all' } },
      { resource: 'frameworks', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'integrations', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'audit_logs', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'dashboard', actions: ['read'], scope: { ownership: 'all' } },
    ],
  },
  auditor: {
    name: 'Auditor',
    description: 'Read-only access with ability to approve/reject evidence',
    permissions: [
      { resource: 'controls', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'evidence', actions: ['read', 'approve'], scope: { ownership: 'all' } },
      { resource: 'policies', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'frameworks', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'audit_logs', actions: ['read', 'export'], scope: { ownership: 'all' } },
      { resource: 'dashboard', actions: ['read'], scope: { ownership: 'all' } },
    ],
  },
  control_owner: {
    name: 'Control Owner',
    description: 'Edit assigned controls and link evidence',
    permissions: [
      { resource: 'controls', actions: ['read', 'update'], scope: { ownership: 'assigned' } },
      { resource: 'evidence', actions: ['read', 'create', 'update'], scope: { ownership: 'owned' } },
      { resource: 'policies', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'frameworks', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'dashboard', actions: ['read'], scope: { ownership: 'all' } },
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to non-sensitive data',
    permissions: [
      { resource: 'controls', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'evidence', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'policies', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'frameworks', actions: ['read'], scope: { ownership: 'all' } },
      { resource: 'dashboard', actions: ['read'], scope: { ownership: 'all' } },
    ],
  },
};

async function seedPermissionGroups(organizationId: string) {
  console.log('\nSeeding permission groups...');

  let count = 0;
  for (const [_key, group] of Object.entries(DEFAULT_PERMISSION_GROUPS)) {
    const existing = await prisma.permissionGroup.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: group.name,
        },
      },
    });

    if (!existing) {
      await prisma.permissionGroup.create({
        data: {
          organizationId,
          name: group.name,
          description: group.description,
          permissions: group.permissions,
          isSystem: true,
        },
      });
      count++;
    }
  }

  console.log(`  ✓ Created ${count} permission groups`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       GigaChad GRC - Database Seeding Script           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('  ✓ Connected to database\n');

    // Seed organization
    const org = await seedOrganization();

    // Seed permission groups
    await seedPermissionGroups(org.id);

    // Seed frameworks
    await seedFramework(soc2Data);
    await seedFramework(iso27001Data);

    // Summary
    const frameworks = await prisma.framework.count();
    const requirements = await prisma.frameworkRequirement.count();
    const controls = await prisma.control.count();
    const mappings = await prisma.controlMapping.count();
    const permGroups = await prisma.permissionGroup.count();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    Seeding Complete!                   ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  Frameworks:        ${frameworks.toString().padStart(4)}                             ║`);
    console.log(`║  Requirements:      ${requirements.toString().padStart(4)}                             ║`);
    console.log(`║  Controls:          ${controls.toString().padStart(4)}                             ║`);
    console.log(`║  Mappings:          ${mappings.toString().padStart(4)}                             ║`);
    console.log(`║  Permission Groups: ${permGroups.toString().padStart(4)}                             ║`);
    console.log('╚════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

