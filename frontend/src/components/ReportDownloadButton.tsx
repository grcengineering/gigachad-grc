import { useState } from 'react';
import { DocumentArrowDownIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ReportOption {
  id: string;
  name: string;
  description: string;
  requiresFramework: boolean;
}

interface ReportDownloadButtonProps {
  frameworkId?: string;
  variant?: 'button' | 'menu';
  className?: string;
}

const REPORT_TYPES: ReportOption[] = [
  {
    id: 'compliance_summary',
    name: 'Compliance Summary',
    description: 'Executive overview of compliance posture',
    requiresFramework: false,
  },
  {
    id: 'control_status',
    name: 'Control Status',
    description: 'Implementation status of all controls',
    requiresFramework: false,
  },
  {
    id: 'risk_register',
    name: 'Risk Register',
    description: 'Complete list of identified risks',
    requiresFramework: false,
  },
  {
    id: 'framework_assessment',
    name: 'Framework Assessment',
    description: 'Assessment against a specific framework',
    requiresFramework: true,
  },
];

export function ReportDownloadButton({
  frameworkId,
  variant = 'menu',
  className = '',
}: ReportDownloadButtonProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (reportType: string) => {
    setDownloading(reportType);

    try {
      let url = `/api/reports/generate/${reportType.replace('_', '-')}`;
      if (reportType === 'framework_assessment' && frameworkId) {
        url += `?frameworkId=${frameworkId}`;
      }

      const response = await api.get(url, {
        responseType: 'blob',
      });

      // Get filename from content-disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  if (variant === 'button') {
    // Single download button for framework assessment
    return (
      <button
        onClick={() => downloadReport('framework_assessment')}
        disabled={!!downloading || !frameworkId}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          bg-blue-600 text-white hover:bg-blue-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors ${className}
        `}
      >
        {downloading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download Report
          </>
        )}
      </button>
    );
  }

  // Menu variant with all report types
  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      <Menu.Button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-surface-200 text-surface-900 hover:bg-surface-600 transition-colors">
        <DocumentChartBarIcon className="h-5 w-5" />
        Generate Report
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-72 origin-top-right rounded-lg bg-white border border-surface-200 shadow-lg focus:outline-none z-50">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-surface-600 uppercase tracking-wider">
              Download Reports
            </p>

            {REPORT_TYPES.map((report) => {
              const isDisabled = report.requiresFramework && !frameworkId;
              const isDownloading = downloading === report.id;

              return (
                <Menu.Item key={report.id}>
                  {({ active }) => (
                    <button
                      onClick={() => downloadReport(report.id)}
                      disabled={isDisabled || isDownloading}
                      className={`
                        w-full text-left px-3 py-2 rounded-md flex items-start gap-3
                        ${active && !isDisabled ? 'bg-surface-200' : ''}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isDownloading ? (
                          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <DocumentArrowDownIcon className="h-5 w-5 text-surface-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">{report.name}</p>
                        <p className="text-xs text-surface-600">
                          {report.description}
                          {report.requiresFramework && !frameworkId && (
                            <span className="block text-yellow-500 mt-1">
                              Requires framework selection
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export default ReportDownloadButton;
