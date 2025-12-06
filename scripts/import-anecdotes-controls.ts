#!/usr/bin/env ts-node
/**
 * Import controls from Anecdotes SOC 2 CSV export
 * Run with: npx ts-node import-anecdotes-controls.ts <path-to-csv>
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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

// Map Anecdotes categories to our category enum
function normalizeCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    '1.1 organizational controls': 'compliance',
    '1.2 human resources': 'human_resources',
    '1.3 risk assessment': 'risk_management',
    '1.4 vendor management': 'vendor_management',
    '1.5 monitoring': 'compliance',
    '1.6 access control': 'access_control',
    '1.7 physical security': 'physical_security',
    '1.8 system operations': 'network_security',
    '1.9 incident response': 'incident_response',
    '1.10 change management': 'change_management',
    '2. availability': 'business_continuity',
    '3. confidentiality': 'data_protection',
    '4. processing integrity': 'data_protection',
    '5. privacy': 'data_protection',
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || 'other';
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

// Generate a control ID from the category and name
function generateControlId(category: string, name: string, index: number): string {
  const prefixMap: Record<string, string> = {
    'compliance': 'COMP',
    'human_resources': 'HR',
    'risk_management': 'RM',
    'vendor_management': 'VM',
    'access_control': 'AC',
    'physical_security': 'PHY',
    'network_security': 'NS',
    'incident_response': 'IR',
    'change_management': 'CM',
    'business_continuity': 'BC',
    'data_protection': 'DP',
    'other': 'OTH',
  };

  const prefix = prefixMap[category] || 'CTL';
  return `${prefix}-${String(index).padStart(3, '0')}`;
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
    if (values.length < 9) continue; // Skip incomplete rows

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Parse requirements (columns after FW reference)
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

async function ensureOrganization(): Promise<string> {
  let org = await prisma.organization.findUnique({
    where: { slug: 'default' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: 'default',
        description: 'Default organization for GigaChad GRC',
        status: 'active',
        settings: {},
      },
    });
    console.log('  ✓ Created default organization');
  }

  return org.id;
}

async function ensureSOC2Framework(): Promise<string> {
  let framework = await prisma.framework.findFirst({
    where: {
      type: 'soc2',
      organizationId: null,
    },
  });

  if (!framework) {
    framework = await prisma.framework.create({
      data: {
        type: 'soc2',
        name: 'SOC 2 Type II',
        version: '2017',
        description: 'Service Organization Control 2 - Trust Services Criteria',
        isActive: true,
        isCustom: false,
        organizationId: null,
      },
    });
    console.log('  ✓ Created SOC 2 framework');
  }

  return framework.id;
}

async function ensureSOC2Requirements(frameworkId: string): Promise<Map<string, string>> {
  // SOC 2 Trust Services Criteria structure
  const criteria = [
    // Common Criteria (Security)
    { ref: 'CC1', title: 'Control Environment', level: 0, isCategory: true },
    { ref: 'CC1.1', title: 'COSO Principle 1 - Integrity and Ethical Values', level: 1, parent: 'CC1' },
    { ref: 'CC1.2', title: 'COSO Principle 2 - Board Independence', level: 1, parent: 'CC1' },
    { ref: 'CC1.3', title: 'COSO Principle 3 - Management Structure', level: 1, parent: 'CC1' },
    { ref: 'CC1.4', title: 'COSO Principle 4 - Competent Personnel', level: 1, parent: 'CC1' },
    { ref: 'CC1.5', title: 'COSO Principle 5 - Accountability', level: 1, parent: 'CC1' },
    
    { ref: 'CC2', title: 'Communication and Information', level: 0, isCategory: true },
    { ref: 'CC2.1', title: 'COSO Principle 13 - Quality Information', level: 1, parent: 'CC2' },
    { ref: 'CC2.2', title: 'COSO Principle 14 - Internal Communication', level: 1, parent: 'CC2' },
    { ref: 'CC2.3', title: 'COSO Principle 15 - External Communication', level: 1, parent: 'CC2' },
    
    { ref: 'CC3', title: 'Risk Assessment', level: 0, isCategory: true },
    { ref: 'CC3.1', title: 'COSO Principle 6 - Specified Objectives', level: 1, parent: 'CC3' },
    { ref: 'CC3.2', title: 'COSO Principle 7 - Risk Identification', level: 1, parent: 'CC3' },
    { ref: 'CC3.3', title: 'COSO Principle 8 - Fraud Risk', level: 1, parent: 'CC3' },
    { ref: 'CC3.4', title: 'COSO Principle 9 - Change Assessment', level: 1, parent: 'CC3' },
    
    { ref: 'CC4', title: 'Monitoring Activities', level: 0, isCategory: true },
    { ref: 'CC4.1', title: 'COSO Principle 16 - Ongoing Evaluations', level: 1, parent: 'CC4' },
    { ref: 'CC4.2', title: 'COSO Principle 17 - Deficiency Communication', level: 1, parent: 'CC4' },
    
    { ref: 'CC5', title: 'Control Activities', level: 0, isCategory: true },
    { ref: 'CC5.1', title: 'COSO Principle 10 - Risk Mitigation', level: 1, parent: 'CC5' },
    { ref: 'CC5.2', title: 'COSO Principle 11 - Technology Controls', level: 1, parent: 'CC5' },
    { ref: 'CC5.3', title: 'COSO Principle 12 - Policies and Procedures', level: 1, parent: 'CC5' },
    
    { ref: 'CC6', title: 'Logical and Physical Access', level: 0, isCategory: true },
    { ref: 'CC6.1', title: 'Security Software and Infrastructure', level: 1, parent: 'CC6' },
    { ref: 'CC6.2', title: 'User Registration and Authorization', level: 1, parent: 'CC6' },
    { ref: 'CC6.3', title: 'Credential Management', level: 1, parent: 'CC6' },
    { ref: 'CC6.4', title: 'Physical Access Restriction', level: 1, parent: 'CC6' },
    { ref: 'CC6.5', title: 'Asset Disposal', level: 1, parent: 'CC6' },
    { ref: 'CC6.6', title: 'Boundary Protection', level: 1, parent: 'CC6' },
    { ref: 'CC6.7', title: 'Data Transmission Protection', level: 1, parent: 'CC6' },
    { ref: 'CC6.8', title: 'Malware Protection', level: 1, parent: 'CC6' },
    
    { ref: 'CC7', title: 'System Operations', level: 0, isCategory: true },
    { ref: 'CC7.1', title: 'Vulnerability Management', level: 1, parent: 'CC7' },
    { ref: 'CC7.2', title: 'Security Incident Monitoring', level: 1, parent: 'CC7' },
    { ref: 'CC7.3', title: 'Security Incident Response', level: 1, parent: 'CC7' },
    { ref: 'CC7.4', title: 'Security Incident Recovery', level: 1, parent: 'CC7' },
    { ref: 'CC7.5', title: 'Incident Recovery Activities', level: 1, parent: 'CC7' },
    
    { ref: 'CC8', title: 'Change Management', level: 0, isCategory: true },
    { ref: 'CC8.1', title: 'Change Authorization and Implementation', level: 1, parent: 'CC8' },
    
    { ref: 'CC9', title: 'Risk Mitigation', level: 0, isCategory: true },
    { ref: 'CC9.1', title: 'Business Disruption Risk', level: 1, parent: 'CC9' },
    { ref: 'CC9.2', title: 'Vendor Risk Management', level: 1, parent: 'CC9' },
    
    // Availability
    { ref: 'A1', title: 'Availability', level: 0, isCategory: true },
    { ref: 'A1.1', title: 'Capacity Management', level: 1, parent: 'A1' },
    { ref: 'A1.2', title: 'Recovery and Continuity', level: 1, parent: 'A1' },
    { ref: 'A1.3', title: 'Recovery Testing', level: 1, parent: 'A1' },
    
    // Confidentiality
    { ref: 'C1', title: 'Confidentiality', level: 0, isCategory: true },
    { ref: 'C1.1', title: 'Confidential Information Identification', level: 1, parent: 'C1' },
    { ref: 'C1.2', title: 'Confidential Information Disposal', level: 1, parent: 'C1' },
    
    // Processing Integrity
    { ref: 'PI1', title: 'Processing Integrity', level: 0, isCategory: true },
    { ref: 'PI1.1', title: 'Processing Accuracy', level: 1, parent: 'PI1' },
    { ref: 'PI1.2', title: 'Input Validation', level: 1, parent: 'PI1' },
    { ref: 'PI1.3', title: 'Processing Monitoring', level: 1, parent: 'PI1' },
    { ref: 'PI1.4', title: 'Output Validation', level: 1, parent: 'PI1' },
    { ref: 'PI1.5', title: 'Data Retention', level: 1, parent: 'PI1' },
    
    // Privacy
    { ref: 'P1', title: 'Privacy Notice', level: 0, isCategory: true },
    { ref: 'P1.1', title: 'Privacy Notice Provided', level: 1, parent: 'P1' },
    { ref: 'P2', title: 'Choice and Consent', level: 0, isCategory: true },
    { ref: 'P2.1', title: 'Choice Communication', level: 1, parent: 'P2' },
    { ref: 'P3', title: 'Collection', level: 0, isCategory: true },
    { ref: 'P3.1', title: 'Collection Purpose', level: 1, parent: 'P3' },
    { ref: 'P4', title: 'Use and Retention', level: 0, isCategory: true },
    { ref: 'P4.1', title: 'Data Minimization', level: 1, parent: 'P4' },
    { ref: 'P5', title: 'Retention and Disposal', level: 0, isCategory: true },
    { ref: 'P5.1', title: 'Data Retention and Disposal', level: 1, parent: 'P5' },
    { ref: 'P6', title: 'Access', level: 0, isCategory: true },
    { ref: 'P6.1', title: 'Data Subject Access', level: 1, parent: 'P6' },
    { ref: 'P6.6', title: 'Data Breach Notification', level: 1, parent: 'P6' },
    { ref: 'P7', title: 'Disclosure', level: 0, isCategory: true },
    { ref: 'P7.1', title: 'Third Party Disclosure', level: 1, parent: 'P7' },
    { ref: 'P8', title: 'Quality', level: 0, isCategory: true },
    { ref: 'P8.1', title: 'Data Quality', level: 1, parent: 'P8' },
  ];

  const refToId = new Map<string, string>();
  let order = 0;

  // First pass: create categories
  for (const crit of criteria.filter(c => c.isCategory)) {
    const existing = await prisma.frameworkRequirement.findFirst({
      where: { frameworkId, reference: crit.ref },
    });

    if (existing) {
      refToId.set(crit.ref, existing.id);
    } else {
      const req = await prisma.frameworkRequirement.create({
        data: {
          frameworkId,
          reference: crit.ref,
          title: crit.title,
          description: `SOC 2 ${crit.title}`,
          level: crit.level,
          order: order++,
          isCategory: true,
        },
      });
      refToId.set(crit.ref, req.id);
    }
  }

  // Second pass: create requirements under categories
  for (const crit of criteria.filter(c => !c.isCategory)) {
    const existing = await prisma.frameworkRequirement.findFirst({
      where: { frameworkId, reference: crit.ref },
    });

    if (existing) {
      refToId.set(crit.ref, existing.id);
    } else {
      const parentId = crit.parent ? refToId.get(crit.parent) : null;
      const req = await prisma.frameworkRequirement.create({
        data: {
          frameworkId,
          parentId,
          reference: crit.ref,
          title: crit.title,
          description: `SOC 2 Trust Services Criteria ${crit.ref}`,
          level: crit.level,
          order: order++,
          isCategory: false,
        },
      });
      refToId.set(crit.ref, req.id);
    }
  }

  return refToId;
}

async function importControls(controls: AnecdotesControl[], organizationId: string, frameworkId: string, requirementMap: Map<string, string>) {
  let created = 0;
  let updated = 0;
  let mappingsCreated = 0;
  const controlIdCounters: Record<string, number> = {};

  for (const ctrl of controls) {
    if (!ctrl.controlName) continue;

    const category = normalizeCategory(ctrl.category);
    
    // Generate unique control ID
    controlIdCounters[category] = (controlIdCounters[category] || 0) + 1;
    const controlId = generateControlId(category, ctrl.controlName, controlIdCounters[category]);

    // Build guidance from requirements
    const guidance = ctrl.requirements
      .filter(r => r.name)
      .map(r => `• ${r.name}`)
      .join('\n');

    // Check if control exists
    let control = await prisma.control.findFirst({
      where: {
        title: ctrl.controlName,
        organizationId,
      },
    });

    if (control) {
      // Update existing
      control = await prisma.control.update({
        where: { id: control.id },
        data: {
          description: ctrl.controlDescription || ctrl.controlName,
          category,
          guidance: guidance || ctrl.controlImplementation || null,
          tags: ctrl.tags ? ctrl.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        },
      });
      updated++;
    } else {
      // Create new control
      control = await prisma.control.create({
        data: {
          controlId,
          title: ctrl.controlName,
          description: ctrl.controlDescription || ctrl.controlName,
          category,
          guidance: guidance || ctrl.controlImplementation || null,
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

    // Create framework mappings from FW reference
    if (ctrl.fwReference) {
      const refs = ctrl.fwReference.split(',').map(r => r.trim()).filter(Boolean);
      
      for (const ref of refs) {
        const requirementId = requirementMap.get(ref);
        if (requirementId) {
          // Check if mapping exists
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
  }

  return { created, updated, mappingsCreated };
}

async function main() {
  const csvPath = process.argv[2] || '/Users/chad.fryer/Downloads/SOC 2_controls_list_by_anecdotes.csv';

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     GigaChad GRC - Anecdotes SOC 2 Controls Importer           ║');
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

    // Ensure organization exists
    console.log('Setting up organization...');
    const organizationId = await ensureOrganization();

    // Ensure SOC 2 framework exists
    console.log('Setting up SOC 2 framework...');
    const frameworkId = await ensureSOC2Framework();

    // Ensure SOC 2 requirements exist
    console.log('Setting up SOC 2 requirements...');
    const requirementMap = await ensureSOC2Requirements(frameworkId);
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



