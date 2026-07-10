import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { frameworksApi } from '@/lib/api';
import { CategoryChip } from '@/components/ui';
import { Box, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Button,
  Card,
  CardBody,
  Input,
  Textarea,
  Label,
  PageHeader,
  EmptyState,
  Dialog,
  Skeleton,
} from '@/components/ui';

interface Framework {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  readiness?: { score: number };
  requirementCount?: number;
  mappedControlCount?: number;
  lastAssessment?: { createdAt: string };
}

export default function Frameworks() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', version: '', description: '' });

  const { data: frameworks, isLoading } = useQuery<Framework[]>({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => frameworksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      setIsCreateOpen(false);
      setFormData({ name: '', type: '', version: '', description: '' });
    },
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Frameworks"
        description="Track your compliance readiness across regulatory frameworks."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Framework
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : frameworks && frameworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frameworks.map((framework) => (
            <FrameworkCard key={framework.id} framework={framework} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Box className="h-8 w-8" />}
            title="No frameworks yet"
            description="Get started by creating your first compliance framework."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create your first framework
              </Button>
            }
          />
        </Card>
      )}

      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Framework"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending}
              disabled={!formData.name || !formData.type}
              onClick={() => createMutation.mutate(formData)}
            >
              Create Framework
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="fw-name" required>
              Framework Name
            </Label>
            <Input
              id="fw-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SOC 2, ISO 27001, GDPR"
            />
          </div>
          <div>
            <Label htmlFor="fw-type" required>
              Type
            </Label>
            <Input
              id="fw-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="e.g., Security & Privacy, Data Protection"
            />
          </div>
          <div>
            <Label htmlFor="fw-version">Version</Label>
            <Input
              id="fw-version"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="e.g., 2017, 2022, 1.0"
            />
          </div>
          <div>
            <Label htmlFor="fw-desc">Description</Label>
            <Textarea
              id="fw-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the framework…"
              rows={3}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function FrameworkCard({ framework }: { framework: Framework }) {
  const score = framework.readiness?.score || 0;
  const scoreColor =
    score >= 80 ? 'text-emerald-700' : score >= 50 ? 'text-yellow-700' : 'text-red-600';
  const progressColor = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Link to={`/frameworks/${framework.id}`} className="block group">
      <Card className="h-full hover:border-surface-400 transition-colors">
        <CardBody density="comfy">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-600/10 rounded-md">
                <Box className="h-5 w-5 text-brand-700" />
              </div>
              <div>
                <h3 className="text-h3 text-surface-900 group-hover:text-brand-700 transition-colors">
                  {framework.name}
                </h3>
                <p className="text-xs text-surface-500">Version {framework.version}</p>
              </div>
            </div>
            <CategoryChip value={framework.type} case="upper" className="shrink-0" />
          </div>

          {framework.description && (
            <p className="text-small text-surface-600 line-clamp-2 mb-4">{framework.description}</p>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-small text-surface-600">Readiness Score</span>
              <span className={cn('text-h3 font-bold', scoreColor)}>{score}%</span>
            </div>
            <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all', progressColor)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-surface-200">
            <div>
              <p className="text-xs text-surface-500">Requirements</p>
              <p className="text-small font-medium text-surface-800">
                {framework.requirementCount || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Mapped Controls</p>
              <p className="text-small font-medium text-surface-800">
                {framework.mappedControlCount || 0}
              </p>
            </div>
          </div>

          {framework.lastAssessment && (
            <div className="mt-3 pt-3 border-t border-surface-200">
              <p className="text-xs text-surface-500">
                Last assessed: {new Date(framework.lastAssessment.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}
