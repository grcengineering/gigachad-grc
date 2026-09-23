export interface HelpBlock {
  type: 'heading' | 'paragraph' | 'list' | 'code';
  text?: string;
  items?: string[];
  code?: string;
  language?: string;
}

export interface HelpArticleRecord {
  slug: string;
  title: string;
  summary: string;
  blocks: HelpBlock[];
}

export interface HelpCategoryRecord {
  id: string;
  name: string;
  description: string;
  articles: HelpArticleRecord[];
}

const markdownFiles = import.meta.glob('../../../docs/help/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  admin: 'Organization, access, API, and platform administration.',
  'ai-mcp': 'AI configuration, assistants, and Model Context Protocol.',
  audit: 'Audit planning, fieldwork, findings, remediation, and reporting.',
  bcdr: 'Business continuity and disaster recovery operations.',
  compliance: 'Controls, frameworks, evidence, policies, and calendars.',
  data: 'Assets, evidence automation, and retention.',
  deployment: 'Deployment and module configuration.',
  'employee-compliance': 'Employee compliance, awareness training, and phishing.',
  'getting-started': 'Orientation, first steps, navigation, and demo data.',
  integrations: 'Connecting and operating external integrations.',
  reporting: 'Reports, exports, and scheduled delivery.',
  'risk-management': 'Risk creation, assessment, treatment, and monitoring.',
  trust: 'Trust Center, questionnaires, and knowledge management.',
  vendors: 'Vendor inventory, assessments, contracts, and questionnaires.',
  general: 'Additional platform guidance.',
};

function cleanInline(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseHelpMarkdown(markdown: string): {
  title: string;
  summary: string;
  blocks: HelpBlock[];
} {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  const title = cleanInline(titleLine?.replace(/^#\s+/, '') || 'Untitled article');
  const blocks: HelpBlock[] = [];
  let index = titleLine ? lines.indexOf(titleLine) + 1 : 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || /^---+$/.test(line)) {
      index += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: 'code', code: code.join('\n'), language });
      index += 1;
      continue;
    }
    const heading = line.match(/^#{2,6}\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', text: cleanInline(heading[1]) });
      index += 1;
      continue;
    }
    if (/^(?:[-*+]|\d+\.)\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^(?:[-*+]|\d+\.)\s+/.test(lines[index].trim())) {
        items.push(cleanInline(lines[index].trim().replace(/^(?:[-*+]|\d+\.)\s+/, '')));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const row = lines[index]
          .trim()
          .split('|')
          .map((cell) => cleanInline(cell))
          .filter(Boolean);
        if (!row.every((cell) => /^:?-+:?$/.test(cell))) rows.push(row.join(' — '));
        index += 1;
      }
      if (rows.length) blocks.push({ type: 'list', items: rows });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (
        !candidate ||
        candidate.startsWith('```') ||
        /^#{2,6}\s+/.test(candidate) ||
        /^(?:[-*+]|\d+\.)\s+/.test(candidate) ||
        candidate.startsWith('|') ||
        /^---+$/.test(candidate)
      ) {
        break;
      }
      paragraph.push(candidate.replace(/^>\s?/, ''));
      index += 1;
    }
    const text = cleanInline(paragraph.join(' '));
    if (text) blocks.push({ type: 'paragraph', text });
  }

  const summary = blocks.find((block) => block.type === 'paragraph' && block.text)?.text || '';
  return { title, summary, blocks };
}

export function buildHelpContent(files: Record<string, string>): HelpCategoryRecord[] {
  const categories = new Map<string, HelpCategoryRecord>();

  for (const [filePath, markdown] of Object.entries(files)) {
    const relativePath = filePath.split(/docs\/help\//).pop();
    if (!relativePath || relativePath === 'README.md') continue;
    const parts = relativePath.split('/');
    const fileName = parts.pop() as string;
    const categoryId = parts[0] || 'general';
    const baseName = fileName.replace(/\.md$/i, '');
    const normalizedBaseName = baseName.toLowerCase().replace(/_/g, '-');
    const slug = normalizedBaseName === 'readme' ? 'overview' : normalizedBaseName;
    const parsed = parseHelpMarkdown(markdown);
    const category = categories.get(categoryId) || {
      id: categoryId,
      name: titleCase(categoryId),
      description: CATEGORY_DESCRIPTIONS[categoryId] || CATEGORY_DESCRIPTIONS.general,
      articles: [],
    };
    category.articles.push({ slug, ...parsed });
    categories.set(categoryId, category);
  }

  return [...categories.values()]
    .map((category) => ({
      ...category,
      articles: [...category.articles].sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const HELP_CONTENT = buildHelpContent(markdownFiles);

export function findHelpArticle(categoryId?: string, slug?: string) {
  const category = HELP_CONTENT.find((item) => item.id === categoryId);
  return {
    category,
    article: category?.articles.find((item) => item.slug === slug),
  };
}
