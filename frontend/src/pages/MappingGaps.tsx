import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { frameworksApi, mappingsApi } from '@/lib/api';
import type { Framework, MappingGapRow, MappingGapType } from '@/lib/apiTypes';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { exportData } from '@/lib/export';

type TabKey = 'all' | MappingGapType;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All gap types' },
  { key: 'no-controls', label: 'Requirements with no controls' },
  { key: 'supporting-only', label: 'Requirements with only supporting controls' },
  { key: 'unused-controls', label: 'Controls not mapped to anything' },
];

const TYPE_LABEL: Record<MappingGapType, string> = {
  'no-controls': 'No controls',
  'supporting-only': 'Supporting only',
  'unused-controls': 'Unused control',
};

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export default function MappingGaps() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('frameworks:view');

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [frameworkId, setFrameworkId] = useState<string>('');
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const frameworkFilterDisabled = activeTab === 'unused-controls';
  const effectiveFrameworkId = frameworkFilterDisabled ? undefined : frameworkId || undefined;
  const effectiveType: MappingGapType | undefined = activeTab === 'all' ? undefined : activeTab;

  const { data: frameworks } = useQuery({
    queryKey: ['frameworks', 'list'],
    queryFn: () => frameworksApi.list().then((res) => res.data as Framework[]),
    enabled: canRead,
  });

  const gapsQuery = useQuery<MappingGapRow[]>({
    queryKey: ['mappings', 'gaps', effectiveFrameworkId ?? 'all', effectiveType ?? 'all'],
    queryFn: () =>
      mappingsApi
        .findGaps({
          frameworkId: effectiveFrameworkId,
          type: effectiveType,
        })
        .then((res) => res.data as MappingGapRow[]),
    enabled: canRead,
  });

  const rows: MappingGapRow[] = useMemo(
    () => (Array.isArray(gapsQuery.data) ? gapsQuery.data : []),
    [gapsQuery.data]
  );

  const exportColumns = useMemo(() => {
    if (activeTab === 'unused-controls') {
      return [
        {
          key: 'controlId',
          header: 'Control ID',
          transform: (_v: unknown, row: MappingGapRow) => row.control?.controlId ?? '',
        },
        {
          key: 'controlTitle',
          header: 'Title',
          transform: (_v: unknown, row: MappingGapRow) => row.control?.title ?? '',
        },
      ];
    }
    if (activeTab === 'no-controls' || activeTab === 'supporting-only') {
      return [
        {
          key: 'framework',
          header: 'Framework',
          transform: (_v: unknown, row: MappingGapRow) => row.framework?.name ?? '',
        },
        {
          key: 'reference',
          header: 'Reference',
          transform: (_v: unknown, row: MappingGapRow) => row.requirement?.reference ?? '',
        },
        {
          key: 'title',
          header: 'Title',
          transform: (_v: unknown, row: MappingGapRow) => row.requirement?.title ?? '',
        },
      ];
    }
    // 'all'
    return [
      {
        key: 'type',
        header: 'Type',
        transform: (_v: unknown, row: MappingGapRow) => TYPE_LABEL[row.type],
      },
      {
        key: 'framework',
        header: 'Framework',
        transform: (_v: unknown, row: MappingGapRow) => row.framework?.name ?? '',
      },
      {
        key: 'reference',
        header: 'Reference',
        transform: (_v: unknown, row: MappingGapRow) =>
          row.requirement?.reference ?? row.control?.controlId ?? '',
      },
      {
        key: 'name',
        header: 'Requirement/Control',
        transform: (_v: unknown, row: MappingGapRow) =>
          row.requirement
            ? `${row.requirement.reference} ${row.requirement.title}`
            : row.control
              ? `${row.control.controlId} ${row.control.title}`
              : '',
      },
      {
        key: 'title',
        header: 'Title',
        transform: (_v: unknown, row: MappingGapRow) =>
          row.requirement?.title ?? row.control?.title ?? '',
      },
    ];
  }, [activeTab]);

  const csvSlug = activeTab === 'all' ? 'all' : activeTab;
  const exportFilename = `mapping-gaps-${csvSlug}-${todayIso()}`;

  const handleExportCsv = async () => {
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    try {
      await exportData({
        filename: exportFilename,
        columns: exportColumns,
        data: rows,
        format: 'csv',
      });
      toast.success(`Exported ${rows.length} record(s) as CSV`);
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPdf = async () => {
    if (!tableRef.current) return;
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    setIsExportingPdf(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then((m) => m.default),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#1f2937',
        scale: 2,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = 210;
      const pdfHeight = 297;
      pdf.setFillColor(31, 41, 55);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Mapping Gap Analysis', 10, 15);
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 22);

      const ratio = Math.min((pdfWidth - 20) / canvas.width, (pdfHeight - 40) / canvas.height);
      const scaledWidth = canvas.width * ratio;
      const scaledHeight = canvas.height * ratio;
      const x = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 28, scaledWidth, scaledHeight);
      pdf.save(`${exportFilename}.pdf`);
      toast.success('Exported as PDF');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <EmptyState
          variant="warning"
          title="Not authorized"
          description="You do not have permission to view mapping gaps."
        />
      </div>
    );
  }

  const showFrameworkColumn = activeTab !== 'unused-controls';
  const showTypeColumn = activeTab === 'all';

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-surface-100">Mapping Gap Analysis</h1>
        <p className="text-sm text-surface-600 mt-1">
          Find requirements without coverage and controls that are not mapped to any requirement.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="gap-framework-filter" className="text-sm text-surface-700">
            Framework
          </label>
          <select
            id="gap-framework-filter"
            className="input min-w-[14rem]"
            value={frameworkId}
            onChange={(e) => setFrameworkId(e.target.value)}
            disabled={frameworkFilterDisabled}
            aria-label="Filter by framework"
          >
            <option value="">All frameworks</option>
            {(frameworks ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
          >
            Export to CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={rows.length === 0}
            isLoading={isExportingPdf}
            loadingText="Exporting..."
            leftIcon={<DocumentTextIcon className="w-4 h-4" />}
          >
            Export to PDF
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-surface-700 px-4">
          <nav className="flex flex-wrap gap-6" aria-label="Tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.key
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-surface-600 hover:text-surface-200 hover:border-surface-600'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div ref={tableRef} className="p-4">
          {gapsQuery.isLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading gaps">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-800 rounded animate-pulse" />
              ))}
            </div>
          ) : gapsQuery.isError ? (
            <EmptyState
              variant="warning"
              title="Could not load mapping gaps"
              description="An error occurred. Please try again."
              action={{ label: 'Retry', onClick: () => gapsQuery.refetch() }}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              variant="security"
              title="No mapping gaps"
              description="All requirements have controls and all controls are mapped."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-surface-600 border-b border-surface-700">
                    {showTypeColumn && <th className="py-2 px-3 font-medium">Type</th>}
                    {showFrameworkColumn && <th className="py-2 px-3 font-medium">Framework</th>}
                    <th className="py-2 px-3 font-medium">
                      {activeTab === 'unused-controls' ? 'Control ID' : 'Reference'}
                    </th>
                    {activeTab === 'all' && (
                      <th className="py-2 px-3 font-medium">Requirement/Control</th>
                    )}
                    <th className="py-2 px-3 font-medium">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const linkTo = row.requirement
                      ? `/frameworks/${row.framework?.id ?? ''}`
                      : row.control
                        ? `/controls/${row.control.id}`
                        : '#';
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-surface-800 hover:bg-surface-800/50"
                      >
                        {showTypeColumn && (
                          <td className="py-2 px-3 text-surface-700">{TYPE_LABEL[row.type]}</td>
                        )}
                        {showFrameworkColumn && (
                          <td className="py-2 px-3 text-surface-700">
                            {row.framework?.name ?? '—'}
                          </td>
                        )}
                        <td className="py-2 px-3">
                          <Link to={linkTo} className="text-brand-400 hover:text-brand-300">
                            {row.requirement?.reference ?? row.control?.controlId ?? '—'}
                          </Link>
                        </td>
                        {activeTab === 'all' && (
                          <td className="py-2 px-3 text-surface-700">
                            {row.requirement ? 'Requirement' : row.control ? 'Control' : '—'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-surface-200">
                          {row.requirement?.title ?? row.control?.title ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
