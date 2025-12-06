import { useState } from 'react';
import {
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function AuditFindings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-100">Audit Findings</h1>
          <p className="text-surface-400 mt-1">Track and remediate audit findings and observations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
          <PlusIcon className="w-5 h-5" />
          New Finding
        </button>
      </div>

      {/* Empty State */}
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
        <h3 className="text-lg font-medium text-surface-300 mb-2">No findings yet</h3>
        <p className="text-surface-500 mb-4">Audit findings will appear here as audits are conducted</p>
      </div>
    </div>
  );
}
