import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export type A11ySummary = {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  description: string;
  nodes: number;
};

interface A11yOpts {
  disableRules?: string[];
  include?: string;
  tags?: string[];
}

export async function runA11yScan(page: Page, opts: A11yOpts = {}): Promise<A11ySummary[]> {
  let builder = new AxeBuilder({ page });
  if (opts.include) builder = builder.include(opts.include);
  if (opts.tags?.length) builder = builder.withTags(opts.tags);
  if (opts.disableRules?.length) builder = builder.disableRules(opts.disableRules);

  const results = await builder.analyze();
  const summary: A11ySummary[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? null,
    description: v.description,
    nodes: v.nodes.length,
  }));
  if (summary.length) {
    console.log(
      'A11y violations:',
      summary.map((s) => `${s.impact ?? 'unknown'} ${s.id} (${s.nodes}x)`).join(', '),
    );
  }
  return summary;
}

export function countByImpact(violations: A11ySummary[]) {
  const counts = { minor: 0, moderate: 0, serious: 0, critical: 0 };
  for (const v of violations) {
    if (v.impact && v.impact in counts) {
      counts[v.impact as keyof typeof counts] += v.nodes;
    }
  }
  return counts;
}
