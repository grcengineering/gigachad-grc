#!/usr/bin/env ts-node
/**
 * Import ISO/IEC 27701 controls from Anecdotes CSV export
 * Run with: npx ts-node import-anecdotes-iso27701.ts <path-to-csv>
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://grc:grc_secret@localhost:5433/gigachad_grc',
    },
  },
});

interface AnecdotesControl {
  category: string;
  controlName: string;
  controlDescription: string;
  controlImplementation: string;
  controlStatus: string;
  owners: string;
  tags: string;
  maturityLevel: string;
  fwReference: string;
  requirements: Array<{ name: string; tags: string }>;
}

function normalizeCategory(category: string): string {
  const cat = category.toLowerCase().trim();
  
  if (cat.includes('pims specific')) return 'compliance';
  if (cat.includes('information security policies')) return 'compliance';
  if (cat.includes('organization of information security')) return 'compliance';
  if (cat.includes('human resource')) return 'human_resources';
  if (cat.includes('asset management')) return 'data_protection';
  if (cat.includes('access control')) return 'access_control';
  if (cat.includes('cryptography')) return 'data_protection';
  if (cat.includes('physical')) return 'physical_security';
  if (cat.includes('operations security')) return 'network_security';
  if (cat.includes('communications security')) return 'network_security';
  if (cat.includes('system acquisition')) return 'change_management';
  if (cat.includes('supplier')) return 'vendor_management';
  if (cat.includes('incident')) return 'incident_response';
  if (cat.includes('compliance')) return 'compliance';
  if (cat.includes('controller')) return 'data_protection';
  if (cat.includes('processor')) return 'data_protection';
  
  return 'other';
}

function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'monitoring': 'implemented',
    'in progress': 'in_progress',
    'not started': 'not_started',
    'gap': 'not_started',
  };
  return statusMap[status.toLowerCase().trim()] || 'not_started';
}

function generateControlId(controlName: string, index: number): string {
  // Extract reference from control name (e.g., "5.2.1 (4.1) Understanding..." -> "27701-5.2.1")
  const match = controlName.match(/^(\d+\.[\d.]+)/);
  if (match) {
    return `27701-${match[1]}`;
  }
  return `27701-${String(index).padStart(3, '0')}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAnecdotesCSV(csvContent: string): AnecdotesControl[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const controls: AnecdotesControl[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 9) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const requirements: Array<{ name: string; tags: string }> = [];
    for (let r = 1; r <= 9; r++) {
      const reqName = row[`requirement ${r}`] || '';
      const reqTags = row[`requirement ${r} tags`] || '';
      if (reqName && !reqName.toLowerCase().includes('delete')) {
        requirements.push({ name: reqName, tags: reqTags });
      }
    }

    controls.push({
      category: row['category'] || '',
      controlName: row['control name'] || '',
      controlDescription: row['control description'] || '',
      controlImplementation: row['control implementation'] || '',
      controlStatus: row['control status'] || '',
      owners: row['owners'] || '',
      tags: row['tags'] || '',
      maturityLevel: row['maturity level'] || '',
      fwReference: row['fw reference'] || '',
      requirements,
    });
  }

  return controls;
}

async function getOrganizationId(): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { slug: 'default' },
  });
  if (!org) {
    throw new Error('Default organization not found.');
  }
  return org.id;
}

async function ensureISO27701Framework(): Promise<string> {
  let framework = await prisma.framework.findFirst({
    where: {
      type: 'iso27701',
      organizationId: null,
    },
  });

  if (!framework) {
    framework = await prisma.framework.create({
      data: {
        type: 'iso27701',
        name: 'ISO/IEC 27701:2019',
        version: '2019',
        description: 'Privacy Information Management System (PIMS) - Extension to ISO/IEC 27001 and ISO/IEC 27002 for privacy management',
        isActive: true,
        isCustom: false,
        organizationId: null,
      },
    });
    console.log('  ✓ Created ISO/IEC 27701:2019 framework');
  }

  return framework.id;
}

async function createRequirements(frameworkId: string, controls: AnecdotesControl[]): Promise<Map<string, string>> {
  const refToId = new Map<string, string>();
  let order = 0;

  // Group by category
  const categories = new Map<string, AnecdotesControl[]>();
  for (const ctrl of controls) {
    const cat = ctrl.category;
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(ctrl);
  }

  for (const [categoryName, categoryControls] of categories) {
    // Create category
    const catRef = categoryName.replace(/[^a-zA-Z0-9.]/g, '_').substring(0, 20);
    
    let categoryReq = await prisma.frameworkRequirement.findFirst({
      where: { frameworkId, reference: catRef },
    });

    if (!categoryReq) {
      categoryReq = await prisma.frameworkRequirement.create({
        data: {
          frameworkId,
          reference: catRef,
          title: categoryName,
          description: `ISO 27701 ${categoryName}`,
          level: 0,
          order: order++,
          isCategory: true,
        },
      });
    }
    refToId.set(catRef, categoryReq.id);

    // Create requirements
    for (const ctrl of categoryControls) {
      const match = ctrl.controlName.match(/^(\d+\.[\d.]+)/);
      const ref = match ? match[1] : ctrl.controlName.substring(0, 15);

      let requirement = await prisma.frameworkRequirement.findFirst({
        where: { frameworkId, reference: ref },
      });

      if (!requirement) {
        requirement = await prisma.frameworkRequirement.create({
          data: {
            frameworkId,
            parentId: categoryReq.id,
            reference: ref,
            title: ctrl.controlName,
            description: ctrl.controlDescription.substring(0, 5000), // Truncate long descriptions
            level: 1,
            order: order++,
            isCategory: false,
          },
        });
      }
      refToId.set(ref, requirement.id);
    }
  }

  return refToId;
}

async function importControls(
  controls: AnecdotesControl[], 
  organizationId: string, 
  frameworkId: string,
  requirementMap: Map<string, string>
) {
  let created = 0;
  let updated = 0;
  let mappingsCreated = 0;

  for (let i = 0; i < controls.length; i++) {
    const ctrl = controls[i];
    if (!ctrl.controlName) continue;

    const category = normalizeCategory(ctrl.category);
    const controlId = generateControlId(ctrl.controlName, i + 1);

    const guidance = ctrl.requirements
      .filter(r => r.name)
      .map(r => `• ${r.name}`)
      .join('\n');

    let control = await prisma.control.findFirst({
      where: { controlId, organizationId },
    });

    if (control) {
      control = await prisma.control.update({
        where: { id: control.id },
        data: {
          title: ctrl.controlName,
          description: ctrl.controlDescription.substring(0, 5000) || ctrl.controlName,
          category,
          guidance: guidance || null,
        },
      });
      updated++;
    } else {
      control = await prisma.control.create({
        data: {
          controlId,
          title: ctrl.controlName,
          description: ctrl.controlDescription.substring(0, 5000) || ctrl.controlName,
          category,
          guidance: guidance || null,
          isCustom: true,
          organizationId,
          tags: [],
          automationSupported: false,
        },
      });
      created++;

      await prisma.controlImplementation.create({
        data: {
          controlId: control.id,
          organizationId,
          status: normalizeStatus(ctrl.controlStatus),
          testingFrequency: 'quarterly',
          createdBy: 'import',
          updatedBy: 'import',
        },
      });
    }

    // Create mapping
    const match = ctrl.controlName.match(/^(\d+\.[\d.]+)/);
    const ref = match ? match[1] : null;
    if (ref) {
      const requirementId = requirementMap.get(ref);
      if (requirementId) {
        const existingMapping = await prisma.controlMapping.findFirst({
          where: { frameworkId, requirementId, controlId: control.id },
        });

        if (!existingMapping) {
          await prisma.controlMapping.create({
            data: {
              frameworkId,
              requirementId,
              controlId: control.id,
              mappingType: 'primary',
              createdBy: 'import',
            },
          });
          mappingsCreated++;
        }
      }
    }
  }

  return { created, updated, mappingsCreated };
}

async function main() {
  const csvPath = process.argv[2] || '/Users/chad.fryer/Downloads/ISO-IEC 27701_controls_list_by_anecdotes.csv';

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   GigaChad GRC - Anecdotes ISO/IEC 27701 Controls Importer     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    console.log(`Reading CSV: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const controls = parseAnecdotesCSV(csvContent);
    console.log(`  ✓ Parsed ${controls.length} controls\n`);

    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('  ✓ Connected\n');

    console.log('Getting organization...');
    const organizationId = await getOrganizationId();
    console.log('  ✓ Found organization\n');

    console.log('Setting up ISO/IEC 27701:2019 framework...');
    const frameworkId = await ensureISO27701Framework();

    console.log('Creating requirements...');
    const requirementMap = await createRequirements(frameworkId, controls);
    console.log(`  ✓ Created/verified ${requirementMap.size} requirements\n`);

    console.log('Importing controls...');
    const result = await importControls(controls, organizationId, frameworkId, requirementMap);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      Import Complete!                          ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Controls Created:    ${result.created.toString().padStart(4)}                                   ║`);
    console.log(`║  Controls Updated:    ${result.updated.toString().padStart(4)}                                   ║`);
    console.log(`║  Mappings Created:    ${result.mappingsCreated.toString().padStart(4)}                                   ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
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



