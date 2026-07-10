import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Search, Upload, Download } from 'lucide-react';
import axios from 'axios';
import { knowledgeBaseApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Button,
  Badge,
  Card,
  CardBody,
  Input,
  Select,
  PageHeader,
  FilterBar,
  EmptyState,
  Skeleton,
  Dialog,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  question?: string;
  answer: string;
  framework?: string;
  status: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  tags?: string[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  draft: 'neutral',
};

const CATEGORY_OPTS = [
  { value: 'security', label: 'Security' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'technical', label: 'Technical' },
  { value: 'operational', label: 'Operational' },
];

interface ParsedEntry {
  organizationId: string;
  tags?: string[];
  isPublic?: boolean;
  [key: string]: string | string[] | boolean | undefined;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(csvText: string): ParsedEntry[] {
  const lines = csvText.trim().split('\n');
  const headers = parseCsvLine(lines[0]);
  const entries: ParsedEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const entry: ParsedEntry = { organizationId: 'default-org' };
    headers.forEach((header, index) => {
      const value = values[index];
      if (value) {
        if (header === 'tags') {
          entry.tags = value
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean);
        } else if (header === 'isPublic') {
          entry.isPublic = value.toLowerCase() === 'true' || value === '1';
        } else {
          entry[header] = value;
        }
      }
    });
    entries.push(entry);
  }
  return entries;
}

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<KnowledgeEntry[]>({
    queryKey: ['knowledge-base'],
    queryFn: () => knowledgeBaseApi.list().then((res) => res.data),
  });

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(q) ||
      e.answer.toLowerCase().includes(q) ||
      e.question?.toLowerCase().includes(q);
    const matchesCategory = !category || e.category === category;
    return matchesSearch && matchesCategory;
  });

  const activeFilters: ActiveFilter[] = [];
  if (search)
    activeFilters.push({ key: 'search', label: `Search: ${search}`, onClear: () => setSearch('') });
  if (category)
    activeFilters.push({
      key: 'category',
      label: `Category: ${category}`,
      onClear: () => setCategory(''),
    });
  const clearAll = () => {
    setSearch('');
    setCategory('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Knowledge Base"
        description="Pre-approved answers to common security questions."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => setShowBulkUpload(true)}
            >
              Bulk Upload
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/knowledge-base/new')}
            >
              New Entry
            </Button>
          </>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-72"
          placeholder="Search knowledge base…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Categories"
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTS}
          clearable
        />
      </FilterBar>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="No entries found"
            description="Start building your knowledge base."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/knowledge-base/new')}
              >
                New Entry
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              interactive
              onClick={() => navigate(`/knowledge-base/${entry.id}`)}
              className="hover:border-surface-400"
            >
              <CardBody density="comfy">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <h3 className="text-h3 text-surface-900 flex-1">{entry.title}</h3>
                  <div className="flex gap-1.5 shrink-0">
                    <Badge
                      variant={STATUS_VARIANT[entry.status] ?? 'neutral'}
                      size="sm"
                      className="capitalize"
                    >
                      {entry.status}
                    </Badge>
                    {entry.isPublic && (
                      <Badge variant="info" size="sm">
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="neutral" size="sm" className="capitalize">
                    {entry.category}
                  </Badge>
                  {entry.framework && (
                    <Badge variant="neutral" size="sm">
                      {entry.framework}
                    </Badge>
                  )}
                  <span className="text-xs text-surface-500">Used {entry.usageCount} times</span>
                </div>
                <p className="text-small text-surface-600 line-clamp-2">{entry.answer}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
            setShowBulkUpload(false);
          }}
        />
      )}
    </div>
  );
}

function BulkUploadDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const template = `category,title,question,answer,tags,framework,status,isPublic
security,Data Encryption at Rest,Does your platform encrypt data at rest?,"Yes, all data is encrypted at rest using AES-256 encryption.",encryption;data security,SOC2,approved,true
privacy,GDPR Compliance,Are you GDPR compliant?,"We are fully GDPR compliant.",GDPR;privacy,GDPR,approved,true`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-base-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      const text = await csvFile.text();
      const parsedEntries = parseCsv(text);
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(
        `${apiBase}/knowledge-base/bulk`,
        { entries: parsedEntries },
        { withCredentials: true }
      );
      const result = response.data;
      toast.success(
        `Uploaded ${result.success} entries${result.failed > 0 ? `, ${result.failed} failed` : ''}`
      );
      setCsvFile(null);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload entries. Please check the CSV format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Bulk Upload Knowledge Base Entries"
      description="Upload a CSV with category, title, answer (required), and optionally question, tags, framework, status, isPublic."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button loading={uploading} disabled={!csvFile} onClick={handleUpload}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={downloadTemplate}
          >
            Download Template
          </Button>
        </div>

        <div className="border-2 border-dashed border-surface-300 rounded-md p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="hidden"
            id="kb-csv-upload"
          />
          <label
            htmlFor="kb-csv-upload"
            className="cursor-pointer inline-flex flex-col items-center"
          >
            <Upload className="h-10 w-10 text-surface-500 mb-2" />
            <span className="text-body text-surface-700">
              {csvFile ? csvFile.name : 'Click to select CSV file'}
            </span>
            <span className="text-xs text-surface-500 mt-0.5">or drag and drop</span>
          </label>
        </div>

        <div className="bg-surface-100 rounded-md p-3">
          <h3 className="text-xs font-medium text-surface-600 uppercase tracking-wider mb-1.5">
            Example CSV
          </h3>
          <pre className="text-xs text-surface-600 font-mono overflow-x-auto">
            {`category,title,question,answer,tags,framework,status,isPublic
security,Data Encryption,Encrypted at rest?,"Yes, AES-256.",encryption;security,SOC2,approved,true
privacy,GDPR,GDPR compliant?,"Yes, fully compliant.",GDPR;privacy,GDPR,approved,true`}
          </pre>
          <p className="text-xs text-surface-500 mt-2">
            Use quotes around values containing commas. Separate tags with semicolons.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
