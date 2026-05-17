import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { knowledgeBaseApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { SkeletonGrid } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import toast from 'react-hot-toast';

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = user?.organizationId || '';

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: ['knowledge-base', category, search, organizationId],
    queryFn: () => knowledgeBaseApi.list({ 
      organizationId,
      category: category !== 'all' ? category : undefined,
      search: search || undefined,
    }).then((res) => res.data),
    enabled: !!organizationId,
  });

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCsv = (csvText: string) => {
    // Organization ID must come from the authenticated user. Previously this
    // was hardcoded to 'default-org', which routed every CSV-imported entry
    // into a fictitious tenant regardless of who was signed in.
    const organizationId = user?.organizationId;
    if (!organizationId) {
      throw new Error('Cannot import knowledge-base entries: no authenticated user / organizationId');
    }

    const lines = csvText.trim().split('\n');
    const headers = parseCsvLine(lines[0]);

    const entries = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCsvLine(lines[i]);
      const entry: any = {
        organizationId,
      };

      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          if (header === 'tags') {
            entry[header] = value.split(';').map(t => t.trim()).filter(t => t);
          } else if (header === 'isPublic') {
            entry[header] = value.toLowerCase() === 'true' || value === '1';
          } else {
            entry[header] = value;
          }
        }
      });

      entries.push(entry);
    }

    return entries;
  };

  const downloadTemplate = () => {
    const template = `category,title,question,answer,tags,framework,status,isPublic
security,Data Encryption at Rest,Does your platform encrypt data at rest?,"Yes, all data is encrypted at rest using AES-256 encryption. We maintain strict key management practices.",encryption;data security,SOC2,approved,true
privacy,GDPR Compliance,Are you GDPR compliant?,"We are fully GDPR compliant and maintain all necessary documentation, including DPIAs and data mapping.",GDPR;privacy;compliance,GDPR,approved,true`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-base-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!csvFile) return;

    try {
      setUploading(true);
      const text = await csvFile.text();
      const parsedEntries = parseCsv(text);

      const response = await knowledgeBaseApi.bulkCreate({ entries: parsedEntries });
      const result = response.data;

      toast.success(`Successfully uploaded ${result.success} entries${result.failed > 0 ? `. Failed: ${result.failed}` : ''}`);

      setShowBulkUpload(false);
      setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    } catch (error) {
      console.error('Error bulk uploading:', error);
      toast.error('Failed to upload entries. Please check the CSV format.');
    } finally {
      setUploading(false);
    }
  };

  const categories = ['all', 'security', 'privacy', 'compliance', 'technical', 'operational'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-100">Knowledge Base</h1>
            <p className="mt-1 text-surface-400">Pre-approved answers to common security questions</p>
          </div>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Knowledge Base</h1>
          <p className="mt-1 text-surface-400">Pre-approved answers to common security questions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowBulkUpload(true)}
            leftIcon={<ArrowUpTrayIcon className="w-5 h-5" />}
          >
            Bulk Upload
          </Button>
          <Button
            onClick={() => navigate('/knowledge-base/new')}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            New Entry
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Entries Grid */}
      {entries.length === 0 ? (
        <EmptyState
          variant="book"
          title="No knowledge entries yet"
          description="Build your knowledge base with common questions and answers for security questionnaires."
          action={{
            label: "New Entry",
            onClick: () => navigate('/knowledge-base/new'),
            icon: <PlusIcon className="w-5 h-5" />,
          }}
          secondaryAction={{
            label: "Import from CSV",
            onClick: () => setShowBulkUpload(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(entries as any[]).map((entry) => (
            <div
              key={entry.id}
              onClick={() => navigate(`/knowledge-base/${entry.id}`)}
              className="bg-surface-900 border border-surface-800 rounded-lg p-6 hover:bg-surface-800 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-surface-100 flex-1">{entry.title}</h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded capitalize ${
                    entry.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {entry.status}
                  </span>
                  {entry.isPublic && (
                    <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                      Public
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded capitalize">
                  {entry.category}
                </span>
                {entry.framework && (
                  <span className="px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded">
                    {entry.framework}
                  </span>
                )}
                <span className="text-xs text-surface-500">
                  Used {entry.usageCount} times
                </span>
              </div>
              <p className="text-sm text-surface-400 line-clamp-2">{entry.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-surface-100">Bulk Upload Knowledge Base Entries</h2>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-700 text-surface-200 rounded-lg hover:bg-surface-600 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download Template
              </button>
            </div>
            <p className="text-surface-400 mb-4">
              Upload a CSV file with your knowledge base entries. Required columns: category, title, answer. Optional: question, tags (semicolon-separated), framework, status, isPublic.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-400 mb-2">CSV File</label>
              <div className="border-2 border-dashed border-surface-700 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  <ArrowUpTrayIcon className="w-12 h-12 text-surface-500 mb-2" />
                  <span className="text-surface-300 mb-1">
                    {csvFile ? csvFile.name : 'Click to select CSV file'}
                  </span>
                  <span className="text-sm text-surface-500">
                    or drag and drop
                  </span>
                </label>
              </div>
            </div>

            <div className="mb-4 bg-surface-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-surface-300 mb-2">Example CSV Format:</h3>
              <pre className="text-xs text-surface-400 font-mono overflow-x-auto">
{`category,title,question,answer,tags,framework,status,isPublic
security,Data Encryption at Rest,Does your platform encrypt data at rest?,"Yes, all data is encrypted at rest using AES-256 encryption. We maintain strict key management practices.",encryption;data security,SOC2,approved,true
privacy,GDPR Compliance,Are you GDPR compliant?,"We are fully GDPR compliant and maintain all necessary documentation, including DPIAs and data mapping.",GDPR;privacy;compliance,GDPR,approved,true
technical,Multi-Factor Authentication,Do you support MFA?,"Yes, we support multiple MFA methods including TOTP, SMS, and hardware tokens.",authentication;security;MFA,SOC2,approved,true`}
              </pre>
              <p className="text-xs text-surface-500 mt-2">
                Note: Use quotes around values containing commas. Separate multiple tags with semicolons.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBulkUpload(false);
                  setCsvFile(null);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!csvFile}
                isLoading={uploading}
              >
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
