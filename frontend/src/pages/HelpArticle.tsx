import { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { findHelpArticle, HelpBlock } from '@/lib/helpContent';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/ui';

function renderBlock(block: HelpBlock, index: number): ReactNode {
  switch (block.type) {
    case 'heading':
      return (
        <h3 key={index} className="text-h2 text-surface-900 mt-6 mb-2">
          {block.text}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={index} className="text-body text-surface-700 leading-relaxed">
          {block.text}
        </p>
      );
    case 'list':
      return (
        <ul key={index} className="list-disc pl-6 space-y-1.5 text-body text-surface-700">
          {block.items?.map((item, itemIndex) => (
            <li key={itemIndex}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <pre
          key={index}
          className="rounded-md border border-surface-200 bg-surface-50/40 p-3 overflow-x-auto text-xs font-mono text-surface-800"
        >
          <code>{block.code}</code>
        </pre>
      );
  }
}

export default function HelpArticle() {
  const { category: categoryId, article: articleSlug } = useParams<{
    category: string;
    article: string;
  }>();
  const { category, article } = findHelpArticle(categoryId, articleSlug);

  if (!category || !article) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/help"
          className="inline-flex items-center gap-1.5 text-small text-brand-700 hover:text-brand-800 hover:underline underline-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Link>
        <Card>
          <EmptyState
            title="Article not found"
            description="This slug does not match a published file under docs/help."
          />
        </Card>
      </div>
    );
  }

  const related = category.articles.filter((item) => item.slug !== article.slug);

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-small text-brand-700 hover:text-brand-800 hover:underline underline-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help Center
      </Link>

      <PageHeader title={article.title} description={article.summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardBody density="comfy">
              <div className="space-y-4">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                  {category.name}
                </p>
                {article.blocks.map((block, index) => renderBlock(block, index))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Related articles</CardTitle>
            </CardHeader>
            <CardBody density="compact">
              {related.length === 0 ? (
                <p className="text-small text-surface-600 px-2 py-2">
                  No other articles in this category yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={`/help/${category.id}/${item.slug}`}
                        className="block px-2 py-1.5 rounded-md text-body text-surface-800 hover:bg-surface-100 hover:text-brand-700 transition-colors"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
