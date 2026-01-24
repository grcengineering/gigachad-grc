/**
 * Framework Catalog Index
 * Pre-loaded compliance framework data for user selection
 */

import soc2Type2 from './soc2-type2.json';
import iso27001_2022 from './iso27001-2022.json';
import nistCsf2 from './nist-csf-2.json';
import hipaa from './hipaa.json';
import hitrustCsf from './hitrust-csf.json';
import gdpr from './gdpr.json';
import pciDss401 from './pci-dss-4-0-1.json';
import cisControlsV8 from './cis-controls-v8.json';
import nist80053r5 from './nist-800-53-r5.json';
import nist800171r2 from './nist-800-171-r2.json';
import cmmc2 from './cmmc-2.json';
import iso27701 from './iso27701.json';
import ccpaCpra from './ccpa-cpra.json';
import csaCcmV4 from './csa-ccm-v4.json';

export interface CatalogRequirement {
  reference: string;
  title: string;
  description: string;
  guidance?: string;
  level: number;
  isCategory: boolean;
  children?: CatalogRequirement[];
}

export interface CatalogFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  source: string;
  category: 'security' | 'privacy' | 'industry' | 'government';
  requirements: CatalogRequirement[];
}

// Count total requirements including nested children
function countRequirements(requirements: CatalogRequirement[]): number {
  let count = 0;
  for (const req of requirements) {
    if (!req.isCategory) {
      count++;
    }
    if (req.children) {
      count += countRequirements(req.children);
    }
  }
  return count;
}

// Flatten requirements for database insertion
export function flattenRequirements(
  requirements: CatalogRequirement[],
  parentId?: string
): Array<Omit<CatalogRequirement, 'children'> & { parentReference?: string }> {
  const result: Array<Omit<CatalogRequirement, 'children'> & { parentReference?: string }> = [];

  for (const req of requirements) {
    const { children, ...reqWithoutChildren } = req;
    result.push({
      ...reqWithoutChildren,
      parentReference: parentId,
    });

    if (children) {
      result.push(...flattenRequirements(children, req.reference));
    }
  }

  return result;
}

// All available catalog frameworks
export const CATALOG_FRAMEWORKS: CatalogFramework[] = [
  soc2Type2 as CatalogFramework,
  iso27001_2022 as CatalogFramework,
  nistCsf2 as CatalogFramework,
  hipaa as CatalogFramework,
  hitrustCsf as CatalogFramework,
  gdpr as CatalogFramework,
  pciDss401 as CatalogFramework,
  cisControlsV8 as CatalogFramework,
  nist80053r5 as CatalogFramework,
  nist800171r2 as CatalogFramework,
  cmmc2 as CatalogFramework,
  iso27701 as CatalogFramework,
  ccpaCpra as CatalogFramework,
  csaCcmV4 as CatalogFramework,
];

// Framework metadata for listing (without full requirements)
export interface CatalogFrameworkMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  source: string;
  category: string;
  requirementCount: number;
  categoryCount: number;
}

export function getFrameworkMeta(framework: CatalogFramework): CatalogFrameworkMeta {
  const flatReqs = flattenRequirements(framework.requirements);
  return {
    id: framework.id,
    name: framework.name,
    version: framework.version,
    description: framework.description,
    source: framework.source,
    category: framework.category,
    requirementCount: flatReqs.filter(r => !r.isCategory).length,
    categoryCount: flatReqs.filter(r => r.isCategory).length,
  };
}

export function listCatalogFrameworks(): CatalogFrameworkMeta[] {
  return CATALOG_FRAMEWORKS.map(getFrameworkMeta);
}

export function getCatalogFramework(id: string): CatalogFramework | undefined {
  return CATALOG_FRAMEWORKS.find(f => f.id === id);
}

export {
  soc2Type2,
  iso27001_2022,
  nistCsf2,
  hipaa,
  hitrustCsf,
  gdpr,
  pciDss401 as pciDss4,
  cisControlsV8,
  nist80053r5,
  nist800171r2,
  cmmc2,
  iso27701,
  ccpaCpra,
  csaCcmV4,
};
