#!/usr/bin/env ts-node
/**
 * Import ISO 27001:2022 controls from Anecdotes CSV export
 * Run with: npx ts-node import-anecdotes-iso27001.ts <path-to-csv>
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

// Map ISO 27001 categories to our category enum
function normalizeCategory(category: string): string {
  const cat = category.toLowerCase().trim();
  
  if (cat.includes('context')) return 'compliance';
  if (cat.includes('leadership')) return 'compliance';
  if (cat.includes('planning')) return 'risk_management';
  if (cat.includes('support')) return 'human_resources';
  if (cat.includes('operation')) return 'compliance';
  if (cat.includes('performance')) return 'compliance';
  if (cat.includes('improvement')) return 'compliance';
  if (cat.includes('organizational')) return 'compliance';
  if (cat.includes('people')) return 'human_resources';
  if (cat.includes('physical')) return 'physical_security';
  if (cat.includes('technological')) return 'network_security';
  
  return 'other';
}

// Map Anecdotes status to our status enum
function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'monitoring': 'implemented',
    'in progress': 'in_progress',
    'not started': 'not_started',
    'gap': 'not_started',
  };

  return statusMap[status.toLowerCase().trim()] || 'not_started';
}

// Generate a control ID from the control name (which contains the ISO reference)
function generateControlId(controlName: string, index: number): string {
  // Extract the ISO reference from the control name (e.g., "5.1 Policies..." -> "ISO-5.1")
  const match = controlName.match(/^(\d+\.[\d.]+|\d+)/);
  if (match) {
    return `ISO-${match[1]}`;
  }
  return `ISO-${String(index).padStart(3, '0')}`;
}

// Parse CSV line handling quoted fields
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

// Parse the Anecdotes CSV format
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
      if (reqName) {
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
    throw new Error('Default organization not found. Please run the SOC 2 import first.');
  }

  return org.id;
}

async function ensureISO27001Framework(): Promise<string> {
  let framework = await prisma.framework.findFirst({
    where: {
      type: 'iso27001',
      organizationId: null,
    },
  });

  if (!framework) {
    framework = await prisma.framework.create({
      data: {
        type: 'iso27001',
        name: 'ISO/IEC 27001:2022',
        version: '2022',
        description: 'Information Security Management System - Requirements and Annex A Controls',
        isActive: true,
        isCustom: false,
        organizationId: null,
      },
    });
    console.log('  ✓ Created ISO 27001:2022 framework');
  }

  return framework.id;
}

async function createISO27001Requirements(frameworkId: string, controls: AnecdotesControl[]): Promise<Map<string, string>> {
  const refToId = new Map<string, string>();
  let order = 0;

  // Group controls by category to create requirement hierarchy
  const categories = new Map<string, AnecdotesControl[]>();
  
  for (const ctrl of controls) {
    const cat = ctrl.category;
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(ctrl);
  }

  // Create categories and requirements
  for (const [categoryName, categoryControls] of categories) {
    // Create category requirement
    const catRef = categoryName.split(' ')[0].replace('.', ''); // "4. Context..." -> "4"
    
    let categoryReq = await prisma.frameworkRequirement.findFirst({
      where: { frameworkId, reference: catRef },
    });

    if (!categoryReq) {
      categoryReq = await prisma.frameworkRequirement.create({
        data: {
          frameworkId,
          reference: catRef,
          title: categoryName,
          description: `ISO 27001:2022 ${categoryName}`,
          level: 0,
          order: order++,
          isCategory: true,
        },
      });
    }
    refToId.set(catRef, categoryReq.id);

    // Create requirements for each control in category
    for (const ctrl of categoryControls) {
      // Extract reference from control name (e.g., "5.1 Policies..." -> "5.1")
      const match = ctrl.controlName.match(/^(\d+\.[\d.]+|\d+)/);
      const ref = match ? match[1] : ctrl.controlName.substring(0, 10);

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
            description: ctrl.controlDescription,
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

    // Build guidance from requirements
    const guidance = ctrl.requirements
      .filter(r => r.name && !r.name.toLowerCase().includes('delete'))
      .map(r => `• ${r.name}`)
      .join('\n');

    // Check if control exists
    let control = await prisma.control.findFirst({
      where: {
        controlId,
        organizationId,
      },
    });

    if (control) {
      control = await prisma.control.update({
        where: { id: control.id },
        data: {
          title: ctrl.controlName,
          description: ctrl.controlDescription || ctrl.controlName,
          category,
          guidance: guidance || null,
          tags: ctrl.tags ? ctrl.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        },
      });
      updated++;
    } else {
      control = await prisma.control.create({
        data: {
          controlId,
          title: ctrl.controlName,
          description: ctrl.controlDescription || ctrl.controlName,
          category,
          guidance: guidance || null,
          isCustom: true,
          organizationId,
          tags: ctrl.tags ? ctrl.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          automationSupported: false,
        },
      });
      created++;

      // Create implementation record
      const status = normalizeStatus(ctrl.controlStatus);
      await prisma.controlImplementation.create({
        data: {
          controlId: control.id,
          organizationId,
          status,
          testingFrequency: 'quarterly',
          createdBy: 'import',
          updatedBy: 'import',
        },
      });
    }

    // Create framework mapping
    const ref = ctrl.controlName.match(/^(\d+\.[\d.]+|\d+)/)?.[1];
    if (ref) {
      const requirementId = requirementMap.get(ref);
      if (requirementId) {
        const existingMapping = await prisma.controlMapping.findFirst({
          where: {
            frameworkId,
            requirementId,
            controlId: control.id,
          },
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
  const csvPath = process.argv[2] || '/Users/chad.fryer/Downloads/ISO-IEC 27001 2022_controls_list_by_anecdotes.csv';

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   GigaChad GRC - Anecdotes ISO 27001:2022 Controls Importer    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Read CSV file
    console.log(`Reading CSV: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const controls = parseAnecdotesCSV(csvContent);
    console.log(`  ✓ Parsed ${controls.length} controls\n`);

    // Connect to database
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('  ✓ Connected\n');

    // Get organization
    console.log('Getting organization...');
    const organizationId = await getOrganizationId();
    console.log('  ✓ Found organization\n');

    // Ensure ISO 27001 framework exists
    console.log('Setting up ISO 27001:2022 framework...');
    const frameworkId = await ensureISO27001Framework();

    // Create ISO 27001 requirements from the CSV data
    console.log('Creating ISO 27001:2022 requirements...');
    const requirementMap = await createISO27001Requirements(frameworkId, controls);
    console.log(`  ✓ Created/verified ${requirementMap.size} requirements\n`);

    // Import controls
    console.log('Importing controls...');
    const result = await importControls(controls, organizationId, frameworkId, requirementMap);

    // Summary
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



