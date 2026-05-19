import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface ProductionReadinessData {
  ready: boolean;
  score: number;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * ProductionReadiness component displays a comprehensive readiness score
 * and actionable recommendations for production deployment.
 */
export function ProductionReadiness() {
  const [data, setData] = useState<ProductionReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ProductionReadinessData>('/api/system/production-readiness');
      // Ensure response has expected structure
      const responseData = response.data;
      if (responseData && typeof responseData.score === 'number') {
        setData({
          ready: responseData.ready ?? false,
          score: responseData.score ?? 0,
          blockers: responseData.blockers ?? [],
          warnings: responseData.warnings ?? [],
          recommendations: responseData.recommendations ?? [],
        });
      } else {
        // API returned but without expected data
        setError('System health API not available');
      }
    } catch (err) {
      console.error('Failed to fetch production readiness:', err);
      // Don't show error, just show "not available" state
      setError('System health check unavailable (backend may need restart)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-foreground/60">Analyzing system...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface-800 rounded-xl p-6">
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
          <p className="text-foreground/60">{error || 'Unable to load data'}</p>
          <button
            onClick={fetchReadiness}
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const scoreColor =
    data.score >= 80 ? 'text-green-600' : data.score >= 60 ? 'text-yellow-600' : 'text-red-600';

  const scoreBackground =
    data.score >= 80 ? 'bg-green-500/20' : data.score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20';

  return (
    <div className="bg-surface-800 rounded-xl overflow-hidden">
      {/* Header with score */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-primary" />
              Production Readiness
            </h3>
            <p className="text-sm text-foreground/60 mt-1">
              System configuration analysis for production deployment
            </p>
          </div>
          <button
            onClick={fetchReadiness}
            className="p-2 hover:bg-white/10 rounded-lg text-foreground/60 hover:text-foreground"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Score circle */}
        <div className="mt-6 flex items-center gap-6">
          <div
            className={`relative w-24 h-24 rounded-full ${scoreBackground} flex items-center justify-center`}
          >
            <span className={`text-3xl font-bold ${scoreColor}`}>{data.score}</span>
            <span className="absolute bottom-2 text-xs text-foreground/40">/ 100</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {data.ready ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">Production Ready</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-600">Not Production Ready</span>
                </>
              )}
            </div>
            <p className="text-sm text-foreground/60">
              {data.ready
                ? 'All critical requirements have been met. Your instance is ready for production use.'
                : `${data.blockers.length} critical issue${data.blockers.length !== 1 ? 's' : ''} must be resolved before production deployment.`}
            </p>
          </div>
        </div>
      </div>

      {/* Blockers */}
      {data.blockers.length > 0 && (
        <div className="p-6 border-b border-white/10 bg-red-500/5">
          <h4 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
            <XCircleIcon className="h-4 w-4" />
            Critical Blockers ({data.blockers.length})
          </h4>
          <ul className="space-y-2">
            {data.blockers.map((blocker, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRightIcon className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="p-6 border-b border-white/10 bg-yellow-500/5">
          <h4 className="text-sm font-medium text-yellow-600 mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Warnings ({data.warnings.length})
          </h4>
          <ul className="space-y-2">
            {data.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRightIcon className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-primary" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {data.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground/70">
                <ChevronRightIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All good message */}
      {data.ready && data.warnings.length === 0 && (
        <div className="p-6 bg-green-500/5">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-600">Excellent Configuration!</p>
              <p className="text-sm text-foreground/60">
                Your GigaChad GRC instance is properly configured for production use.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductionReadiness;
