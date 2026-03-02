import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, frameworksApi, controlsApi } from '@/lib/api';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  action: () => void;
  actionLabel: string;
}

interface OnboardingWizardProps {
  onDismiss?: () => void;
}

export function OnboardingWizard({ onDismiss }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Check if already dismissed in localStorage
  useEffect(() => {
    const isDismissed = localStorage.getItem('grc-onboarding-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  // Fetch current state - use staleTime to prevent refetching on every render
  const { data: frameworks } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: controls } = useQuery({
    queryKey: ['controls-count'],
    queryFn: () => controlsApi.list({ limit: 1 }).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Use the consolidated dashboard-full endpoint to avoid duplicate API calls
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-full'],
    queryFn: () => dashboardApi.getFull().then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
  const summary = dashboardData?.summary;

  // Calculate completion status
  const hasFramework = (frameworks?.length || 0) > 0;
  const hasControls = (controls?.meta?.total || 0) > 0;
  // Handle both old (controlStats) and new (controls) property paths

  const summaryAny = summary as any;
  const hasImplementations =
    (summary?.controls?.byStatus?.implemented || summaryAny?.controlStats?.implemented || 0) > 0;
  const hasEvidence = (summary?.evidence?.total || summaryAny?.evidenceStats?.total || 0) > 0;

  const steps: OnboardingStep[] = [
    {
      id: 'framework',
      title: 'Select a Compliance Framework',
      description: 'Choose the frameworks you need to comply with (e.g., SOC 2, ISO 27001)',
      icon: ShieldCheckIcon,
      isComplete: hasFramework,
      action: () => navigate('/frameworks'),
      actionLabel: 'Browse Frameworks',
    },
    {
      id: 'controls',
      title: 'Review Your Controls',
      description: 'See the controls mapped to your framework and start implementing them',
      icon: DocumentTextIcon,
      isComplete: hasControls,
      action: () => navigate('/controls'),
      actionLabel: 'View Controls',
    },
    {
      id: 'implement',
      title: 'Implement Controls',
      description: 'Mark controls as implemented and assign owners',
      icon: BuildingOfficeIcon,
      isComplete: hasImplementations,
      action: () => navigate('/controls?status=not_started'),
      actionLabel: 'Start Implementing',
    },
    {
      id: 'evidence',
      title: 'Collect Evidence',
      description: 'Upload evidence to demonstrate your control implementations',
      icon: DocumentTextIcon,
      isComplete: hasEvidence,
      action: () => navigate('/evidence'),
      actionLabel: 'Upload Evidence',
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  const handleDismiss = () => {
    localStorage.setItem('grc-onboarding-dismissed', 'true');
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) {
    return null;
  }

  // If all steps complete, show success message briefly then dismiss
  if (completedSteps === steps.length) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <CheckCircleIcon className="h-12 w-12 text-green-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-400">Setup Complete! 🎉</h3>
            <p className="text-green-300 text-sm mt-1">
              Your GRC program is up and running. Keep monitoring your compliance dashboard for
              ongoing progress.
            </p>
          </div>
          <button onClick={handleDismiss} className="text-green-400 hover:text-green-300">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-surface-100">Welcome to GigaChad GRC! 🚀</h2>
          <p className="text-surface-400 mt-1">
            Complete these steps to set up your compliance program
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-surface-400 hover:text-surface-300 p-1"
          aria-label="Dismiss onboarding"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-surface-400">Setup Progress</span>
          <span className="text-surface-300 font-medium">
            {completedSteps}/{steps.length} complete
          </span>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = !step.isComplete && steps.slice(0, index).every((s) => s.isComplete);

          return (
            <div
              key={step.id}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-colors
                ${
                  step.isComplete
                    ? 'bg-green-900/20 border-green-800'
                    : isNext
                      ? 'bg-blue-900/20 border-blue-700'
                      : 'bg-surface-900 border-surface-700'
                }
              `}
            >
              <div
                className={`
                p-2 rounded-lg
                ${step.isComplete ? 'bg-green-800' : isNext ? 'bg-blue-800' : 'bg-surface-700'}
              `}
              >
                {step.isComplete ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                ) : (
                  <Icon className={`h-6 w-6 ${isNext ? 'text-blue-400' : 'text-surface-400'}`} />
                )}
              </div>

              <div className="flex-1">
                <h4
                  className={`font-medium ${step.isComplete ? 'text-green-400' : 'text-surface-100'}`}
                >
                  {step.title}
                </h4>
                <p className="text-sm text-surface-400 mt-0.5">{step.description}</p>
              </div>

              {!step.isComplete && (
                <button
                  onClick={step.action}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                    transition-colors
                    ${
                      isNext
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                    }
                  `}
                >
                  {step.actionLabel}
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              )}

              {step.isComplete && (
                <span className="text-green-400 text-sm font-medium">Complete ✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-6 pt-4 border-t border-surface-700">
        <p className="text-surface-400 text-sm">
          Need help getting started?{' '}
          <button onClick={() => navigate('/help')} className="text-blue-400 hover:text-blue-300">
            Visit our Help Center
          </button>
        </p>
      </div>
    </div>
  );
}

export default OnboardingWizard;
