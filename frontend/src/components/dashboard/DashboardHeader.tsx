/**
 * Dashboard Header Component
 * 
 * Displays the dashboard title, customization controls, and report download button.
 */

import { memo } from 'react';
import { Cog6ToothIcon, XMarkIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { ReportDownloadButton } from '@/components/ReportDownloadButton';

interface DashboardHeaderProps {
  isCustomizing: boolean;
  onToggleCustomize: () => void;
  onOpenCustomDashboards?: () => void;
  showCustomDashboards?: boolean;
}

export const DashboardHeader = memo(function DashboardHeader({
  isCustomizing,
  onToggleCustomize,
  onOpenCustomDashboards,
  showCustomDashboards = true,
}: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your GRC program status
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ReportDownloadButton />
        
        {showCustomDashboards && onOpenCustomDashboards && (
          <button
            onClick={onOpenCustomDashboards}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Squares2X2Icon className="w-5 h-5" />
            Custom Dashboards
          </button>
        )}
        
        <button
          onClick={onToggleCustomize}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isCustomizing
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isCustomizing ? (
            <>
              <XMarkIcon className="w-5 h-5" />
              Done
            </>
          ) : (
            <>
              <Cog6ToothIcon className="w-5 h-5" />
              Customize
            </>
          )}
        </button>
      </div>
    </div>
  );
});
