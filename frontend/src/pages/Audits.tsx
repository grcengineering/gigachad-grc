import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { ExportDropdown } from '@/components/ExportDropdown';
import { exportConfigs } from '@/lib/export';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

interface Audit {
  id: string;
  auditId: string;
  name: string;
  auditType: string;
  framework?: string;
  status: string;
  isExternal: boolean;
  plannedStartDate?: string;
  plannedEndDate?: string;
  findingsCount: number;
  criticalFindings: number;
  highFindings: number;
  _count: {
    requests: number;
    findings: number;
    evidence: number;
    testResults: number;
  };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  fieldwork: 'bg-yellow-100 text-yellow-800',
  testing: 'bg-orange-100 text-orange-800',
  reporting: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-surface-800 dark:text-surface-100',
};

const auditTypeLabels: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  surveillance: 'Surveillance',
  certification: 'Certification',
};

export default function Audits() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits', statusFilter, typeFilter],
    queryFn: () =>
      auditsApi
        .list({
          status: (statusFilter || undefined) as any,
          auditType: (typeFilter || undefined) as any,
        })
        .then((res) => res.data),
  });

  const filteredAudits = (audits as unknown as Audit[]).filter(
    (audit: Audit) =>
      audit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.auditId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.framework?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">Audits</h1>
          <p className="text-surface-600 mt-1">Manage internal and external compliance audits</p>
        </div>
        <div className="flex gap-3">
          <ExportDropdown
            data={filteredAudits}
            columns={exportConfigs.audits}
            filename="audits"
            sheetName="Audits"
            disabled={isLoading || filteredAudits.length === 0}
          />
          <Button
            onClick={() => navigate('/audits/new')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            New Audit
          </Button>
        </div>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <Input
            type="text"
            placeholder="Search audits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-900"
          />
        </div>

        <SelectNative
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-900"
        >
          <option value="">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="fieldwork">Fieldwork</option>
          <option value="testing">Testing</option>
          <option value="reporting">Reporting</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </SelectNative>

        <SelectNative
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-900"
        >
          <option value="">All Types</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="surveillance">Surveillance</option>
          <option value="certification">Certification</option>
        </SelectNative>
      </div>
      {/* Audits List */}
      {isLoading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : filteredAudits.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-700 mb-2">No audits found</h3>
          <p className="text-surface-500 mb-4">Get started by creating your first audit</p>
          <Button
            onClick={() => navigate('/audits/new')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            New Audit
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAudits.map((audit) => (
            <Link
              key={audit.id}
              to={`/audits/${audit.id}`}
              className="block bg-white border border-surface-200 rounded-lg p-6 hover:border-brand-500 transition-colors dark:bg-surface-900"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-surface-900">{audit.name}</h3>
                    <span className="text-sm text-surface-500">#{audit.auditId}</span>
                    {audit.isExternal && (
                      <span className="px-2 py-1 bg-purple-600/20 text-purple-600 rounded text-xs font-medium">
                        External
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-surface-600">
                    <span>{auditTypeLabels[audit.auditType] || audit.auditType}</span>
                    {audit.framework && <span>• {audit.framework}</span>}
                    {audit.plannedStartDate && (
                      <span>• {new Date(audit.plannedStartDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[audit.status]}`}
                >
                  {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-surface-200">
                <div>
                  <div className="text-sm text-surface-500 mb-1">Requests</div>
                  <div className="text-lg font-semibold text-surface-900">
                    {audit._count.requests}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-surface-500 mb-1">Evidence</div>
                  <div className="text-lg font-semibold text-surface-900">
                    {audit._count.evidence}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-surface-500 mb-1">Tests</div>
                  <div className="text-lg font-semibold text-surface-900">
                    {audit._count.testResults}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-surface-500 mb-1">Findings</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-lg font-semibold text-surface-900">
                      {audit._count.findings}
                    </div>
                    {audit.criticalFindings > 0 && (
                      <span className="text-xs text-red-600">
                        ({audit.criticalFindings} critical)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
