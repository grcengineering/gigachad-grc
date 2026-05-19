import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seedApi } from '@/lib/api';
import { useBrandingConfig } from '@/contexts/BrandingContext';
import toast from 'react-hot-toast';
import {
  BeakerIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  XMarkIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

interface OnboardingBannerProps {
  onDismiss?: () => void;
}

export default function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  const queryClient = useQueryClient();
  const branding = useBrandingConfig();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('onboarding-banner-dismissed') === 'true';
  });

  const { data: status, isLoading } = useQuery({
    queryKey: ['seed-status'],
    queryFn: () => seedApi.getStatus().then((res) => res.data),
  });

  const loadDemoMutation = useMutation({
    mutationFn: () => seedApi.loadDemoData(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['seed-status'] });
      queryClient.invalidateQueries(); // Refresh all data
      toast.success(`Demo data loaded! Created ${res.data.totalRecords} records.`);
      handleDismiss();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to load demo data');
    },
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('onboarding-banner-dismissed', 'true');
    onDismiss?.();
  };

  const handleLoadDemo = () => {
    loadDemoMutation.mutate();
  };

  // Don't show if dismissed, loading, or already has data
  if (isDismissed || isLoading || status?.hasExistingData) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-brand-600/20 via-purple-600/20 to-brand-600/20 border border-brand-500/30 rounded-xl p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Left: Welcome Message */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <RocketLaunchIcon className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Welcome to {branding.platformName}!
              </h2>
              <p className="text-sm text-muted-foreground">
                Get started with your security and compliance journey
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FeatureCard
              icon={ShieldCheckIcon}
              label="Controls"
              description="50 security controls"
            />
            <FeatureCard
              icon={DocumentTextIcon}
              label="Policies"
              description="15 policy templates"
            />
            <FeatureCard icon={UserGroupIcon} label="Vendors" description="20 vendor profiles" />
            <FeatureCard icon={ChartBarIcon} label="Risks" description="25 risk items" />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-3 lg:w-64 flex-shrink-0">
          {/* Dismiss Button - inline with actions */}
          <div className="flex justify-end lg:hidden">
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-surface-700 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-start gap-2">
            <Button
              onClick={handleLoadDemo}
              disabled={loadDemoMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3"
              variant="primary"
            >
              {loadDemoMutation.isPending ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <BeakerIcon className="h-5 w-5" />
              )}
              {loadDemoMutation.isPending ? 'Loading...' : 'Try with Demo Data'}
            </Button>

            {/* Desktop dismiss button */}
            <button
              onClick={handleDismiss}
              className="hidden lg:flex p-2 hover:bg-surface-700 rounded-lg text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Dismiss"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <Link
            to="/integrations"
            className="btn btn-secondary flex items-center justify-center gap-2 py-3"
          >
            <ArrowRightIcon className="h-5 w-5" />
            Start from Scratch
          </Link>

          <p className="text-xs text-center text-muted-foreground">
            Demo data can be cleared later in Settings
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-surface-800/50 rounded-lg">
      <Icon className="h-5 w-5 text-brand-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}
