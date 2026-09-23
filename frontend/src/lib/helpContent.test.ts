import { describe, expect, it } from 'vitest';
import { buildHelpContent, parseHelpMarkdown } from './helpContent';

describe('help content generation', () => {
  it('parses headings, lists, and code without rendering raw HTML', () => {
    const parsed = parseHelpMarkdown(`# Safe Guide

Use **safe** defaults and [read more](https://example.com).

## Steps
- First
- Second

\`\`\`sh
npm test
\`\`\`

<script>alert('no')</script>
`);

    expect(parsed.title).toBe('Safe Guide');
    expect(parsed.summary).toBe('Use safe defaults and read more.');
    expect(parsed.blocks).toContainEqual({
      type: 'list',
      items: ['First', 'Second'],
    });
    expect(JSON.stringify(parsed.blocks)).not.toContain('<script>');
  });

  it('derives route slugs from docs/help paths', () => {
    const content = buildHelpContent({
      '../../../docs/help/getting-started/first-steps.md': '# First Steps\n\nStart here.',
      '../../../docs/help/getting-started/README.md': '# Getting Started\n\nOverview.',
      '../../../docs/help/README.md': '# Index\n\nNot an article.',
    });

    expect(content).toHaveLength(1);
    expect(content[0].id).toBe('getting-started');
    expect(content[0].articles.map((article) => article.slug)).toEqual(['first-steps', 'overview']);
  });
});
