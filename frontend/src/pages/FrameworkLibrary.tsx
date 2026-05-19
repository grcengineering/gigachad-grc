import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Button } from '@/components/Button';
import { SkeletonGrid } from '@/components/Skeleton';
import api from '@/lib/api';

interface CatalogFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  source: string;
  category: string;
  requirementCount: number;
  categoryCount: number;
  isActivated?: boolean;
  activatedFrameworkId?: string;
}

interface RequirementNode {
  reference: string;
  title: string;
  description: string;
  level: number;
  isCategory: boolean;
  children?: RequirementNode[];
}

interface FrameworkDetail extends CatalogFramework {
  requirements: RequirementNode[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  security: <ShieldCheckIcon className="w-6 h-6" />,
  privacy: <LockClosedIcon className="w-6 h-6" />,
  industry: <BuildingOffice2Icon className="w-6 h-6" />,
  government: <GlobeAltIcon className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  security: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  privacy: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  industry: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  government: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
};

function RequirementTree({
  requirements,
  level = 0,
}: {
  requirements: RequirementNode[];
  level?: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (reference: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(reference)) {
        next.delete(reference);
      } else {
        next.add(reference);
      }
      return next;
    });
  };

  return (
    <div className={clsx('space-y-1', level > 0 && 'ml-4 border-l border-surface-700 pl-3')}>
      {requirements.map((req) => {
        const hasChildren = req.children && req.children.length > 0;
        const isExpanded = expanded.has(req.reference);

        return (
          <div key={req.reference}>
            <div
              className={clsx(
                'flex items-start gap-2 py-2 px-3 rounded-lg transition-colors',
                req.isCategory
                  ? 'bg-surface-800/50 hover:bg-surface-800'
                  : 'hover:bg-surface-800/30'
              )}
            >
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(req.reference)}
                  className="mt-0.5 text-surface-600 hover:text-surface-200"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="w-4" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'text-xs font-mono px-1.5 py-0.5 rounded',
                      req.isCategory
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-surface-700 text-surface-700'
                    )}
                  >
                    {req.reference}
                  </span>
                  <span
                    className={clsx(
                      'font-medium truncate',
                      req.isCategory ? 'text-surface-100' : 'text-surface-200'
                    )}
                  >
                    {req.title}
                  </span>
                </div>
                <p className="text-sm text-surface-600 mt-1 line-clamp-2">{req.description}</p>
              </div>
            </div>
            {hasChildren && isExpanded && (
              <RequirementTree requirements={req.children!} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FrameworkPreviewModal({
  framework,
  onClose,
  onActivate,
  isActivating,
}: {
  framework: FrameworkDetail;
  onClose: () => void;
  onActivate: () => void;
  isActivating: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-surface-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-surface-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-700">
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'p-3 rounded-lg border',
                categoryColors[framework.category] || categoryColors.security
              )}
            >
              {categoryIcons[framework.category] || categoryIcons.security}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-surface-100">{framework.name}</h2>
              <p className="text-sm text-surface-600">
                {framework.source} • Version {framework.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-600 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <p className="text-surface-700">{framework.description}</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="px-3 py-1.5 bg-surface-800 rounded-lg">
                <span className="text-sm text-surface-600">Requirements:</span>
                <span className="ml-2 font-semibold text-surface-100">
                  {framework.requirementCount}
                </span>
              </div>
              <div className="px-3 py-1.5 bg-surface-800 rounded-lg">
                <span className="text-sm text-surface-600">Categories:</span>
                <span className="ml-2 font-semibold text-surface-100">
                  {framework.categoryCount}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-surface-100 mb-4">Requirements Structure</h3>
            <div className="bg-surface-800/30 rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <RequirementTree requirements={framework.requirements} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onActivate}
            disabled={isActivating}
            leftIcon={<PlusCircleIcon className="w-5 h-5" />}
          >
            {isActivating ? 'Activating...' : 'Activate Framework'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FrameworkCard({
  framework,
  onPreview,
  onActivate,
  onDeactivate,
  isActivating,
}: {
  framework: CatalogFramework;
  onPreview: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  isActivating: boolean;
}) {
  return (
    <div
      className={clsx(
        'group bg-surface-800/50 border rounded-xl p-5 transition-all duration-200',
        framework.isActivated
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/70'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={clsx(
            'p-2.5 rounded-lg border',
            categoryColors[framework.category] || categoryColors.security
          )}
        >
          {categoryIcons[framework.category] || categoryIcons.security}
        </div>
        {framework.isActivated && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
            <CheckCircleIcon className="w-4 h-4" />
            Activated
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-surface-100 mb-1">{framework.name}</h3>
      <p className="text-sm text-surface-600 mb-4 line-clamp-2">{framework.description}</p>

      <div className="flex items-center gap-3 text-sm text-surface-600 mb-4">
        <span>{framework.requirementCount} requirements</span>
        <span>•</span>
        <span>{framework.categoryCount} categories</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPreview}
          leftIcon={<EyeIcon className="w-4 h-4" />}
        >
          Preview
        </Button>
        {framework.isActivated ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onDeactivate}
            leftIcon={<XCircleIcon className="w-4 h-4" />}
          >
            Deactivate
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onActivate}
            disabled={isActivating}
            leftIcon={<PlusCircleIcon className="w-4 h-4" />}
          >
            {isActivating ? 'Activating...' : 'Activate'}
          </Button>
        )}
      </div>

      {framework.isActivated && framework.activatedFrameworkId && (
        <div className="mt-4 pt-4 border-t border-surface-700">
          <Link
            to={`/frameworks/${framework.activatedFrameworkId}`}
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            View in My Frameworks →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function FrameworkLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showActivatedOnly, setShowActivatedOnly] = useState(false);
  const [previewFramework, setPreviewFramework] = useState<FrameworkDetail | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Fetch catalog status (frameworks with activation status)
  const { data: frameworks, isLoading } = useQuery({
    queryKey: ['framework-catalog-status'],
    queryFn: () =>
      api.get('/api/frameworks/catalog/status').then((res) => res.data as CatalogFramework[]),
  });

  // Fetch framework details for preview
  const { refetch: _fetchDetails } = useQuery({
    queryKey: ['framework-catalog-detail', previewFramework?.id],
    queryFn: () =>
      api.get(`/api/frameworks/catalog/${previewFramework?.id}`).then((res) => res.data),
    enabled: false,
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (catId: string) => api.post(`/api/frameworks/catalog/${catId}/activate`),
    onSuccess: (_, _catalogId) => {
      queryClient.invalidateQueries({ queryKey: ['framework-catalog-status'] });
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      setPreviewFramework(null);
      setActivatingId(null);
      toast.success('Framework activated successfully');
    },
    onError: (error: any) => {
      setActivatingId(null);
      toast.error(error.response?.data?.message || 'Failed to activate framework');
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (frameworkId: string) =>
      api.delete(`/api/frameworks/catalog/${frameworkId}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['framework-catalog-status'] });
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      toast.success('Framework deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate framework');
    },
  });

  const handlePreview = async (framework: CatalogFramework) => {
    try {
      const response = await api.get(`/api/frameworks/catalog/${framework.id}`);
      setPreviewFramework({ ...framework, requirements: response.data.requirements });
    } catch {
      toast.error('Failed to load framework details');
    }
  };

  const handleActivate = (catalogId: string) => {
    setActivatingId(catalogId);
    activateMutation.mutate(catalogId);
  };

  const handleDeactivate = (frameworkId: string) => {
    if (
      confirm(
        'Are you sure you want to deactivate this framework? Control mappings and assessments will be preserved but hidden.'
      )
    ) {
      deactivateMutation.mutate(frameworkId);
    }
  };

  // Filter frameworks
  const filteredFrameworks = frameworks?.filter((f: CatalogFramework) => {
    if (
      searchQuery &&
      !f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !f.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (categoryFilter !== 'all' && f.category !== categoryFilter) {
      return false;
    }
    if (showActivatedOnly && !f.isActivated) {
      return false;
    }
    return true;
  });

  const categories = [...new Set(frameworks?.map((f: CatalogFramework) => f.category) || [])];
  const activatedCount = frameworks?.filter((f: CatalogFramework) => f.isActivated).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Framework Library</h1>
            <p className="text-surface-600 mt-1">
              Browse and activate compliance frameworks for your organization
            </p>
          </div>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Framework Library</h1>
          <p className="text-surface-600 mt-1">
            Browse and activate compliance frameworks for your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-600">
            {activatedCount} of {frameworks?.length || 0} frameworks activated
          </span>
          <Link to="/frameworks">
            <Button variant="secondary" leftIcon={<BookOpenIcon className="w-5 h-5" />}>
              View My Frameworks
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
          <input
            type="text"
            placeholder="Search frameworks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-surface-600" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showActivatedOnly}
            onChange={(e) => setShowActivatedOnly(e.target.checked)}
            className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/50"
          />
          <span className="text-sm text-surface-700">Show activated only</span>
        </label>
      </div>

      {/* Framework Grid */}
      {filteredFrameworks && filteredFrameworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFrameworks.map((framework: CatalogFramework) => (
            <FrameworkCard
              key={framework.id}
              framework={framework}
              onPreview={() => handlePreview(framework)}
              onActivate={() => handleActivate(framework.id)}
              onDeactivate={() =>
                framework.activatedFrameworkId && handleDeactivate(framework.activatedFrameworkId)
              }
              isActivating={activatingId === framework.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface-800/30 rounded-xl border border-surface-700">
          <BookOpenIcon className="w-12 h-12 text-surface-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-200 mb-2">No frameworks found</h3>
          <p className="text-surface-600">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'No frameworks are available in the library'}
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewFramework && (
        <FrameworkPreviewModal
          framework={previewFramework}
          onClose={() => setPreviewFramework(null)}
          onActivate={() => handleActivate(previewFramework.id)}
          isActivating={activatingId === previewFramework.id}
        />
      )}
    </div>
  );
}
