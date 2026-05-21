import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, LinkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { frameworksApi } from '@/lib/api/frameworks.api';

export interface MappingCoverageWidgetProps {
  frameworkId?: string;
  className?: string;
}

interface ControlCoverage {
  totalControls: number;
  mappedControls: number;
  unmappedControls: number;
  coveragePercent: number;
}

interface RequirementCoverage {
  totalRequirements: number;
  mappedRequirements: number;
  unmappedRequirements: number;
  coveragePercent: number;
}

type CoverageData = ControlCoverage | RequirementCoverage;

export function MappingCoverageWidget({ frameworkId, className }: MappingCoverageWidgetProps) {
  const perFramework = Boolean(frameworkId);

  const { data, isLoading, error } = useQuery<CoverageData>({
    queryKey: ['mappings', 'coverage', frameworkId ?? 'all'],
    queryFn: () =>
      perFramework
        ? frameworksApi.mappings.getRequirementCoverage(frameworkId as string)
        : frameworksApi.mappings.getControlCoverage(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const regionLabel = perFramework ? 'Framework mapping coverage' : 'Organization mapping coverage';

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading mapping coverage"
        className={clsx('card p-6', className)}
      >
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-surface-900">Mapping Coverage</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="w-6 h-6 text-surface-500 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="region" aria-label={regionLabel} className={clsx('card p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-surface-900">Mapping Coverage</h2>
        </div>
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-700"
        >
          Failed to load mapping coverage
        </div>
      </div>
    );
  }

  const total = data
    ? perFramework
      ? (data as RequirementCoverage).totalRequirements
      : (data as ControlCoverage).totalControls
    : 0;
  const mapped = data
    ? perFramework
      ? (data as RequirementCoverage).mappedRequirements
      : (data as ControlCoverage).mappedControls
    : 0;
  const unmapped = data
    ? perFramework
      ? (data as RequirementCoverage).unmappedRequirements
      : (data as ControlCoverage).unmappedControls
    : 0;
  const rawPercent = data?.coveragePercent;
  const percent = Number.isFinite(rawPercent) ? (rawPercent as number) : 0;

  const isZeroState = total === 0;

  const percentColor =
    percent >= 80 ? 'text-green-600' : percent >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div role="region" aria-label={regionLabel} className={clsx('card p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="w-5 h-5 text-brand-400" />
        <h2 className="text-lg font-semibold text-surface-900">Mapping Coverage</h2>
      </div>

      {isZeroState ? (
        <div className="py-6 text-center">
          <p className="text-surface-600 text-sm">No data yet</p>
          <p className="text-surface-500 text-xs mt-1">
            {perFramework
              ? 'This framework has no requirements to map'
              : 'No controls have been created yet'}
          </p>
        </div>
      ) : (
        <>
          <p className={clsx('text-5xl font-bold', percentColor)} aria-label={`${percent} percent`}>
            {percent}%
          </p>
          <p className="text-sm text-surface-600 mt-2">
            {perFramework
              ? `${mapped} of ${total} mapped, ${unmapped} with no controls`
              : `${mapped} of ${total} mapped — ${unmapped} unmapped`}
          </p>
          <div className="progress-bar mt-4">
            <div
              className={clsx(
                'progress-fill',
                percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default MappingCoverageWidget;
