import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Settings,
  ShieldCheck,
  Users,
  FileText,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Card,
  CardBody,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
} from '@/components/ui';

interface HelpArticleSummary {
  slug: string;
  title: string;
}

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  articles: HelpArticleSummary[];
}

const ICONS: Record<string, typeof BookOpen> = {
  'getting-started': BookOpen,
  controls: ShieldCheck,
  frameworks: Boxes,
  evidence: FileText,
  users: Users,
  settings: Settings,
};

function iconFor(id: string) {
  const Icon = ICONS[id] ?? HelpCircle;
  return <Icon className="h-5 w-5 text-brand-700" />;
}

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const { data, isLoading } = useQuery<HelpCategory[]>({
    queryKey: ['help-articles'],
    queryFn: async () => {
      const res = await api.get('/api/help/articles');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? (payload as HelpCategory[]) : [];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return list;
    return list
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.slug.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [data, debouncedSearch]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Help Center"
        description="Guides, references, and answers to common questions."
      />

      <Card>
        <CardBody density="comfy">
          <div className="max-w-2xl mx-auto py-4 text-center space-y-4">
            <h2 className="text-h2 text-surface-900">How can we help?</h2>
            <p className="text-small text-surface-600">
              Search across all articles or browse by category below.
            </p>
            <div className="max-w-lg mx-auto">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search help…"
                leftIcon={<Search className="h-4 w-4" />}
                inputSize="lg"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HelpCircle className="h-8 w-8" />}
            title="No articles found"
            description={
              debouncedSearch
                ? `No help articles match "${debouncedSearch}".`
                : 'Help articles will appear here once published.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((cat) => (
            <Card key={cat.id}>
              <CardBody density="comfy">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-brand-600/10 rounded-md shrink-0">{iconFor(cat.id)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-h3 text-surface-900">{cat.name}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {cat.articles.length} article{cat.articles.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-small text-surface-600 mb-3">{cat.description}</p>
                )}
                <ul className="space-y-1 pt-3 border-t border-surface-200">
                  {cat.articles.slice(0, 3).map((article) => (
                    <li key={article.slug}>
                      <Link
                        to={`/help/${cat.id}/${article.slug}`}
                        className="block text-body text-surface-800 hover:text-brand-700 hover:underline underline-offset-2"
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                  {cat.articles.length > 3 && (
                    <li>
                      <Link
                        to={`/help/${cat.id}/${cat.articles[0].slug}`}
                        className="block text-small text-brand-700 hover:text-brand-800 hover:underline underline-offset-2 mt-1"
                      >
                        See all {cat.articles.length} articles →
                      </Link>
                    </li>
                  )}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
