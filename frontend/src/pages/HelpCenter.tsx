import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Boxes,
  FileText,
  HelpCircle,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { HELP_CONTENT } from '@/lib/helpContent';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardBody, EmptyState, Input, PageHeader } from '@/components/ui';

const ICONS: Record<string, typeof BookOpen> = {
  'getting-started': BookOpen,
  compliance: ShieldCheck,
  audit: FileText,
  admin: Settings,
  vendors: Users,
  trust: Boxes,
};

function iconFor(id: string) {
  const Icon = ICONS[id] ?? HelpCircle;
  return <Icon className="h-5 w-5 text-brand-700" />;
}

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return HELP_CONTENT;
    return HELP_CONTENT.map((category) => ({
      ...category,
      articles: category.articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.summary.toLowerCase().includes(query) ||
          article.slug.includes(query) ||
          category.name.toLowerCase().includes(query)
      ),
    })).filter((category) => category.articles.length > 0);
  }, [debouncedSearch]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Help Center"
        description="Guides generated from the repository's docs/help source."
      />

      <Card>
        <CardBody density="comfy">
          <div className="max-w-2xl mx-auto py-4 text-center space-y-4">
            <h2 className="text-h2 text-surface-900">How can we help?</h2>
            <p className="text-small text-surface-600">
              Search {HELP_CONTENT.reduce((sum, category) => sum + category.articles.length, 0)}{' '}
              published guides or browse by category.
            </p>
            <div className="max-w-lg mx-auto">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search help…"
                leftIcon={<Search className="h-4 w-4" />}
                inputSize="lg"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {HELP_CONTENT.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HelpCircle className="h-8 w-8" />}
            title="Help content unavailable"
            description="No articles were generated from docs/help. Rebuild the frontend after restoring that directory."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HelpCircle className="h-8 w-8" />}
            title="No articles found"
            description={`No help articles match "${debouncedSearch}".`}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((category) => (
            <Card key={category.id}>
              <CardBody density="comfy">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-brand-600/10 rounded-md shrink-0">
                    {iconFor(category.id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-h3 text-surface-900">{category.name}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {category.articles.length} article
                      {category.articles.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <p className="text-small text-surface-600 mb-3">{category.description}</p>
                <ul className="space-y-1 pt-3 border-t border-surface-200">
                  {category.articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        to={`/help/${category.id}/${article.slug}`}
                        className="block text-body text-surface-800 hover:text-brand-700 hover:underline underline-offset-2"
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
