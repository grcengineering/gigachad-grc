import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  MailWarning,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from '@/components/ui';

interface TrainingModule {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  difficulty: string;
  isBuiltIn: boolean;
  scormPath?: string | null;
}

interface TrainingCampaign {
  id: string;
  name: string;
  status: string;
  assigned: number;
  completed: number;
  overdue: number;
}

interface PhishingCampaign {
  id: string;
  name: string;
  status: string;
  targetCount: number;
  clickedCount: number;
  reportedCount: number;
}

export default function AwarenessTraining() {
  const modules = useQuery<TrainingModule[]>({
    queryKey: ['training', 'modules'],
    queryFn: async () => {
      const response = await api.get('/api/training/modules');
      return [...(response.data?.builtIn ?? []), ...(response.data?.custom ?? [])];
    },
  });
  const campaigns = useQuery<TrainingCampaign[]>({
    queryKey: ['training', 'awareness-campaigns'],
    queryFn: async () => {
      const response = await api.get('/api/training/admin/campaigns');
      return response.data?.campaigns ?? [];
    },
  });
  const phishing = useQuery<PhishingCampaign[]>({
    queryKey: ['phishing', 'campaigns'],
    queryFn: async () => {
      const response = await api.get('/api/phishing/campaigns');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const activeTraining = (campaigns.data ?? []).filter((campaign) => campaign.status === 'active');
  const assignments = (campaigns.data ?? []).reduce((sum, campaign) => sum + campaign.assigned, 0);
  const completed = (campaigns.data ?? []).reduce((sum, campaign) => sum + campaign.completed, 0);
  const activePhishing = (phishing.data ?? []).filter((campaign) => campaign.status === 'active');

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Awareness & Training"
        description="Live security training and phishing simulation activity."
        actions={
          <div className="flex gap-2">
            <Link to="/people/training">
              <Button variant="outline">My training</Button>
            </Link>
            <Link to="/settings/training">
              <Button>Manage campaigns</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Training modules"
          value={modules.data?.length ?? 0}
          icon={<BookOpenCheck className="h-5 w-5" />}
          tone="brand"
          caption="Built-in and validated custom content"
        />
        <StatCard
          label="Active training"
          value={activeTraining.length}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="blue"
          caption={`${assignments} assignments`}
        />
        <StatCard
          label="Completions"
          value={completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          caption="Across visible campaigns"
        />
        <StatCard
          label="Active simulations"
          value={activePhishing.length}
          icon={<MailWarning className="h-5 w-5" />}
          tone="red"
          caption="Phishing campaigns in progress"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Training library</CardTitle>
            {modules.data && (
              <Badge variant="info" capitalize={false}>
                {modules.data.length} modules
              </Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-3">
            {modules.isLoading ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : modules.isError ? (
              <EmptyState
                icon={<AlertTriangle className="h-6 w-6" />}
                title="Training library unavailable"
                description="The training API could not be reached."
              />
            ) : modules.data?.length ? (
              modules.data.map((trainingModule) => (
                <div
                  key={trainingModule.id}
                  className="rounded-md border border-surface-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-surface-900">{trainingModule.name}</p>
                      <p className="text-small text-surface-600 mt-1">
                        {trainingModule.description ||
                          `${trainingModule.duration} minutes · ${trainingModule.category}`}
                      </p>
                    </div>
                    <Badge variant={trainingModule.isBuiltIn ? 'brand' : 'success'}>
                      {trainingModule.isBuiltIn
                        ? 'Built-in'
                        : trainingModule.scormPath
                          ? 'SCORM stored'
                          : 'Content pending'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No training modules"
                description="Create a custom module or restore the built-in catalog."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phishing simulations</CardTitle>
            {phishing.data && (
              <Badge variant="warning" capitalize={false}>
                {phishing.data.length} campaigns
              </Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-3">
            {phishing.isLoading ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : phishing.isError ? (
              <EmptyState
                icon={<MailWarning className="h-6 w-6" />}
                title="Phishing data unavailable"
                description="You may not have permission to view phishing campaigns, or the API is unavailable."
              />
            ) : phishing.data?.length ? (
              phishing.data.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-md border border-surface-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-surface-900">{campaign.name}</p>
                      <p className="text-small text-surface-600 mt-1">
                        {campaign.targetCount} targets · {campaign.clickedCount} clicked ·{' '}
                        {campaign.reportedCount} reported
                      </p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'} dot>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No phishing campaigns"
                description="No simulations have been configured."
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
