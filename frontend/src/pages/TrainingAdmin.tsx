import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  UsersIcon,
  FolderIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { trainingApi } from '@/lib/api';
import { Button } from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard } from '@/components/Skeleton';

// Types
interface CustomModule {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  difficulty: string;
  scormPath?: string;
  originalFileName?: string;
  iconType: string;
  topics: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  creator?: {
    firstName: string;
    lastName: string;
  };
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  moduleIds: string[];
  targetGroups: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  creator?: {
    firstName: string;
    lastName: string;
  };
}

interface ModulesResponse {
  builtIn: {
    id: string;
    name: string;
    description: string;
    category: string;
    duration: number;
    difficulty: string;
    isBuiltIn: boolean;
  }[];
  custom: CustomModule[];
}

type TabType = 'campaigns' | 'modules' | 'assignments';

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'compliance_manager', label: 'Compliance Manager' },
  { id: 'auditor', label: 'Auditor' },
  { id: 'viewer', label: 'Viewer' },
];

const CATEGORIES = [
  { id: 'social-engineering', label: 'Social Engineering' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'secure-coding', label: 'Secure Coding' },
  { id: 'general', label: 'General Security' },
  { id: 'custom', label: 'Custom' },
];

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

// Detailed descriptions for built-in modules
const BUILTIN_MODULE_DESCRIPTIONS: Record<string, { description: string; topics: string[] }> = {
  'phishing-smishing-vishing': {
    description: 'Learn to identify and protect yourself against phishing emails, smishing (SMS phishing), and vishing (voice phishing) attacks. This module covers real-world examples, red flags to watch for, and best practices for verifying suspicious communications.',
    topics: ['Email phishing tactics', 'SMS/text message scams', 'Phone call fraud', 'Social engineering techniques', 'Verification best practices', 'Reporting suspicious activity'],
  },
  'ceo-executive-fraud': {
    description: 'Understand Business Email Compromise (BEC) and CEO fraud schemes where attackers impersonate executives to trick employees into transferring funds or sharing sensitive data. Learn verification protocols and authorization procedures.',
    topics: ['Business Email Compromise (BEC)', 'Wire transfer fraud', 'Executive impersonation', 'Vendor email compromise', 'Multi-factor authorization', 'Out-of-band verification'],
  },
  'watering-hole-attacks': {
    description: 'Discover how attackers compromise legitimate websites frequented by target organizations to deliver malware. Learn to recognize compromised sites and protect against drive-by downloads.',
    topics: ['Compromised website indicators', 'Drive-by download attacks', 'Browser security settings', 'Safe browsing practices', 'Zero-day exploit awareness', 'Network segmentation benefits'],
  },
  'general-cybersecurity': {
    description: 'A comprehensive overview of cybersecurity fundamentals including password hygiene, device security, safe internet usage, and protecting company data both in the office and while working remotely.',
    topics: ['Password management', 'Multi-factor authentication', 'Device security', 'Public Wi-Fi risks', 'Data classification', 'Physical security', 'Remote work security', 'Incident reporting'],
  },
  'privacy-awareness': {
    description: 'Understand data privacy principles, regulations like GDPR and CCPA, and your role in protecting personal information. Learn proper data handling, retention policies, and privacy-by-design concepts.',
    topics: ['GDPR & CCPA basics', 'Personal data identification', 'Data subject rights', 'Consent management', 'Data minimization', 'Retention and disposal', 'Privacy incident handling'],
  },
  'secure-coding': {
    description: 'For developers and technical staff: Learn secure coding practices based on the OWASP Top 10, including input validation, authentication security, injection prevention, and secure session management.',
    topics: ['OWASP Top 10 vulnerabilities', 'SQL injection prevention', 'Cross-site scripting (XSS)', 'Authentication best practices', 'Secure session handling', 'Input validation', 'Error handling', 'Security testing'],
  },
  'combined-training': {
    description: 'A complete security and privacy awareness program combining all core modules into one comprehensive training. Ideal for annual compliance training or new employee onboarding.',
    topics: ['All phishing attack types', 'Executive fraud prevention', 'General security hygiene', 'Privacy regulations', 'Incident response', 'Reporting procedures'],
  },
};

export default function TrainingAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('campaigns');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingModule, setEditingModule] = useState<CustomModule | null>(null);
  const [uploadingModuleId, setUploadingModuleId] = useState<string | null>(null);
  const [showUploadNewScorm, setShowUploadNewScorm] = useState(false);
  const [viewingModule, setViewingModule] = useState<{ id: string; name: string; description: string; category: string; duration: number; difficulty: string; topics: string[]; isBuiltIn: boolean } | null>(null);

  // Queries
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['training-campaigns'],
    queryFn: async () => {
      const response = await trainingApi.getCampaigns();
      return response.data as Campaign[];
    },
  });

  const { data: allModules, isLoading: modulesLoading } = useQuery({
    queryKey: ['training-all-modules'],
    queryFn: async () => {
      const response = await trainingApi.getAllModules();
      return response.data as ModulesResponse;
    },
  });

  const { data: orgStats } = useQuery({
    queryKey: ['training-org-stats'],
    queryFn: async () => {
      const response = await trainingApi.getOrgStats();
      return response.data;
    },
  });

  const tabs: { id: TabType; label: string; icon: typeof AcademicCapIcon }[] = [
    { id: 'campaigns', label: 'Campaigns', icon: PlayIcon },
    { id: 'modules', label: 'Modules', icon: FolderIcon },
    { id: 'assignments', label: 'Stats', icon: ChartBarIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <Cog6ToothIcon className="w-7 h-7 text-brand-500" />
            Training Configuration
          </h1>
          <p className="text-gray-500 dark:text-surface-400 mt-1">
            Manage training campaigns, custom modules, and assignments
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {orgStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Campaigns"
            value={orgStats.activeCampaigns || 0}
            icon={PlayIcon}
            color="brand"
          />
          <StatCard
            label="Total Assignments"
            value={orgStats.totalAssignments || 0}
            icon={UsersIcon}
            color="blue"
          />
          <StatCard
            label="Completion Rate"
            value={`${orgStats.assignmentCompletionRate || 0}%`}
            icon={CheckCircleIcon}
            color="emerald"
          />
          <StatCard
            label="Overdue"
            value={orgStats.overdueAssignments || 0}
            icon={XMarkIcon}
            color="red"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-surface-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-500 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-surface-400 dark:hover:text-surface-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' && (
        <CampaignsTab
          campaigns={campaigns || []}
          allModules={allModules}
          isLoading={campaignsLoading}
          onCreateNew={() => setShowCreateCampaign(true)}
          onEdit={setEditingCampaign}
        />
      )}

      {activeTab === 'modules' && (
        <ModulesTab
          allModules={allModules}
          isLoading={modulesLoading}
          onCreateNew={() => setShowCreateModule(true)}
          onEdit={setEditingModule}
          onUpload={setUploadingModuleId}
          onUploadNew={() => setShowUploadNewScorm(true)}
          onView={setViewingModule}
        />
      )}

      {activeTab === 'assignments' && (
        <StatsTab orgStats={orgStats} />
      )}

      {/* Create/Edit Campaign Modal */}
      {(showCreateCampaign || editingCampaign) && (
        <CampaignModal
          campaign={editingCampaign}
          allModules={allModules}
          onClose={() => {
            setShowCreateCampaign(false);
            setEditingCampaign(null);
          }}
        />
      )}

      {/* Create/Edit Module Modal */}
      {(showCreateModule || editingModule) && (
        <ModuleModal
          module={editingModule}
          onClose={() => {
            setShowCreateModule(false);
            setEditingModule(null);
          }}
        />
      )}

      {/* Upload SCORM Modal (for existing module) */}
      {uploadingModuleId && (
        <UploadScormModal
          moduleId={uploadingModuleId}
          onClose={() => setUploadingModuleId(null)}
        />
      )}

      {/* Upload New SCORM Module Modal */}
      {showUploadNewScorm && (
        <UploadNewScormModal
          onClose={() => setShowUploadNewScorm(false)}
        />
      )}

      {/* View Module Details Modal */}
      {viewingModule && (
        <ModuleDetailModal
          module={viewingModule}
          onClose={() => setViewingModule(null)}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: typeof AcademicCapIcon;
  color: 'brand' | 'blue' | 'emerald' | 'red';
}) {
  const colorClasses = {
    brand: 'bg-brand-500/10 text-brand-500 dark:text-brand-400',
    blue: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    red: 'bg-red-500/10 text-red-500 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-surface-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

// Campaigns Tab
function CampaignsTab({
  campaigns,
  allModules,
  isLoading,
  onCreateNew,
  onEdit,
}: {
  campaigns: Campaign[];
  allModules?: ModulesResponse;
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (campaign: Campaign) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingApi.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (err) => toast.error(err),
  });

  const launchMutation = useMutation({
    mutationFn: (id: string) => trainingApi.launchCampaign(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['training-org-stats'] });
      toast.success(`Campaign launched: ${data.data.assignmentsCreated} assignments created`);
    },
    onError: (err) => toast.error(err),
  });

  const getModuleNames = (moduleIds: string[]) => {
    if (!allModules) return moduleIds.join(', ');
    const allModulesList = [...allModules.builtIn, ...allModules.custom];
    return moduleIds
      .map((id) => allModulesList.find((m) => m.id === id)?.name || id)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateNew} leftIcon={<PlusIcon className="w-4 h-4" />}>
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700">
          <PlayIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-surface-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No campaigns yet</h3>
          <p className="mt-2 text-gray-500 dark:text-surface-400">
            Create your first training campaign to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {campaign.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        campaign.isActive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {campaign.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="mt-1 text-gray-500 dark:text-surface-400 text-sm">
                      {campaign.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-surface-400">
                    <span>
                      <strong>Modules:</strong> {getModuleNames(campaign.moduleIds as string[])}
                    </span>
                    <span>
                      <strong>Targets:</strong>{' '}
                      {(campaign.targetGroups as string[]).includes('all')
                        ? 'All Users'
                        : (campaign.targetGroups as string[]).join(', ')}
                    </span>
                    <span>
                      <strong>Start:</strong> {new Date(campaign.startDate).toLocaleDateString()}
                    </span>
                    {campaign.endDate && (
                      <span>
                        <strong>End:</strong> {new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => launchMutation.mutate(campaign.id)}
                    leftIcon={<PlayIcon className="w-4 h-4" />}
                    disabled={!campaign.isActive || launchMutation.isPending}
                  >
                    Launch
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(campaign)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(campaign.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Module detail type for viewing
interface ModuleDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  difficulty: string;
  topics: string[];
  isBuiltIn: boolean;
}

// Modules Tab
function ModulesTab({
  allModules,
  isLoading,
  onCreateNew,
  onEdit,
  onUpload,
  onUploadNew,
  onView,
}: {
  allModules?: ModulesResponse;
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (module: CustomModule) => void;
  onUpload: (moduleId: string) => void;
  onUploadNew: () => void;
  onView: (module: ModuleDetail) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingApi.deleteCustomModule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-all-modules'] });
      toast.success('Module deleted');
    },
    onError: (err) => toast.error(err),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Modules Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Custom Modules</h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCreateNew} leftIcon={<PlusIcon className="w-4 h-4" />}>
              Add Module
            </Button>
            <Button onClick={onUploadNew} leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}>
              Upload SCORM Package
            </Button>
          </div>
        </div>

        {(!allModules?.custom || allModules.custom.length === 0) ? (
          <div className="text-center py-8 bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700">
            <DocumentArrowUpIcon className="w-10 h-10 mx-auto text-gray-400 dark:text-surface-500" />
            <p className="mt-3 text-gray-500 dark:text-surface-400">
              No custom modules yet. Click "Upload SCORM Package" to create custom training.
            </p>
            <Button onClick={onUploadNew} className="mt-4" leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}>
              Upload SCORM Package
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allModules.custom.map((module) => (
              <div
                key={module.id}
                className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-4 hover:border-brand-500 hover:shadow-md transition-all"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => onView({
                    id: module.id,
                    name: module.name,
                    description: module.description || 'No description available',
                    category: module.category,
                    duration: module.duration,
                    difficulty: module.difficulty,
                    topics: Array.isArray(module.topics) ? module.topics : [],
                    isBuiltIn: false,
                  })}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{module.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-surface-400 mt-1 line-clamp-2">
                        {module.description || 'Click to view details'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        module.isActive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {module.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-surface-400 mb-3">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-surface-700 rounded">
                      {module.category}
                    </span>
                    <span>{module.duration} min</span>
                    <span className="capitalize">{module.difficulty}</span>
                  </div>
                </div>

                {module.scormPath ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-500 mb-3">
                    <CheckCircleIcon className="w-4 h-4" />
                    SCORM Uploaded
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-500 mb-3">
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    No SCORM package
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onUpload(module.id); }}
                    leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
                  >
                    Upload SCORM
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(module); }}>
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(module.id); }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Built-in Modules Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Built-in Modules</h3>
        <p className="text-sm text-gray-500 dark:text-surface-400 mb-4">Click any module to view details and topics covered</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allModules?.builtIn.map((module) => {
            const details = BUILTIN_MODULE_DESCRIPTIONS[module.id];
            return (
              <div
                key={module.id}
                onClick={() => onView({
                  id: module.id,
                  name: module.name,
                  description: details?.description || module.description || 'No description available',
                  category: module.category,
                  duration: module.duration,
                  difficulty: module.difficulty,
                  topics: details?.topics || [],
                  isBuiltIn: true,
                })}
                className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-4 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all"
              >
                <h4 className="font-medium text-gray-900 dark:text-white">{module.name}</h4>
                <p className="text-sm text-gray-500 dark:text-surface-400 mt-1 line-clamp-2">
                  {details?.description || 'Click to view details'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-surface-400 mt-3">
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-surface-700 rounded">
                    {module.category}
                  </span>
                  <span>{module.duration} min</span>
                  <span className="capitalize">{module.difficulty}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-brand-500 mt-3">
                  <AcademicCapIcon className="w-4 h-4" />
                  Built-in Module
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Stats Tab
function StatsTab({ orgStats }: { orgStats: any }) {
  if (!orgStats) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="w-12 h-12 mx-auto text-gray-400" />
        <p className="mt-4 text-gray-500">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Organization Training Statistics
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {orgStats.totalProgress || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-surface-400">Total Progress Records</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-500">{orgStats.completedProgress || 0}</div>
            <div className="text-sm text-gray-500 dark:text-surface-400">Completed Trainings</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-brand-500">{orgStats.completionRate || 0}%</div>
            <div className="text-sm text-gray-500 dark:text-surface-400">Completion Rate</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-500">{orgStats.overdueAssignments || 0}</div>
            <div className="text-sm text-gray-500 dark:text-surface-400">Overdue Assignments</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Campaign Modal
function CampaignModal({
  campaign,
  allModules,
  onClose,
}: {
  campaign: Campaign | null;
  allModules?: ModulesResponse;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    moduleIds: (campaign?.moduleIds as string[]) || [],
    targetGroups: (campaign?.targetGroups as string[]) || [],
    startDate: campaign?.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
    endDate: campaign?.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
    isActive: campaign?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      trainingApi.createCampaign({
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-campaigns'] });
      toast.success('Campaign created');
      onClose();
    },
    onError: (err) => toast.error(err),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      trainingApi.updateCampaign(campaign!.id, {
        ...data,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-campaigns'] });
      toast.success('Campaign updated');
      onClose();
    },
    onError: (err) => toast.error(err),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (campaign) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleModule = (moduleId: string) => {
    setFormData((prev) => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(moduleId)
        ? prev.moduleIds.filter((id) => id !== moduleId)
        : [...prev.moduleIds, moduleId],
    }));
  };

  const toggleRole = (role: string) => {
    if (role === 'all') {
      setFormData((prev) => ({
        ...prev,
        targetGroups: prev.targetGroups.includes('all') ? [] : ['all'],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        targetGroups: prev.targetGroups.includes(role)
          ? prev.targetGroups.filter((r) => r !== role)
          : [...prev.targetGroups.filter((r) => r !== 'all'), role],
      }));
    }
  };

  // Fallback built-in modules if API hasn't loaded yet
  const defaultBuiltInModules = [
    { id: 'phishing-smishing-vishing', name: 'Phishing, Smishing & Vishing', isBuiltIn: true },
    { id: 'ceo-executive-fraud', name: 'CEO & Executive Fraud', isBuiltIn: true },
    { id: 'watering-hole-attacks', name: 'Watering Hole Attacks', isBuiltIn: true },
    { id: 'general-cybersecurity', name: 'General Cybersecurity', isBuiltIn: true },
    { id: 'privacy-awareness', name: 'Privacy Awareness', isBuiltIn: true },
    { id: 'secure-coding', name: 'Secure Coding (OWASP Top 10)', isBuiltIn: true },
    { id: 'combined-training', name: 'Complete Security & Privacy Training', isBuiltIn: true },
  ];

  const allModulesList = allModules
    ? [...allModules.builtIn, ...allModules.custom]
    : defaultBuiltInModules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-surface-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {campaign ? 'Edit Campaign' : 'Create Campaign'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Modules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Select Modules
            </label>
            <div className="grid gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-surface-600 rounded-lg p-3">
              {allModulesList.map((module) => (
                <label key={module.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.moduleIds.includes(module.id)}
                    onChange={() => toggleModule(module.id)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{module.name}</span>
                  {'isBuiltIn' in module && module.isBuiltIn && (
                    <span className="text-xs text-gray-400">(Built-in)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Target Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Target Roles
            </label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-200 dark:border-surface-600 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.targetGroups.includes('all')}
                  onChange={() => toggleRole('all')}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">All Users</span>
              </label>
              {ROLES.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-200 dark:border-surface-600 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={formData.targetGroups.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    disabled={formData.targetGroups.includes('all')}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                End Date (Due Date)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">Campaign is active</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-surface-700">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Module Modal
function ModuleModal({
  module,
  onClose,
}: {
  module: CustomModule | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: module?.name || '',
    description: module?.description || '',
    category: module?.category || 'custom',
    duration: module?.duration || 30,
    difficulty: module?.difficulty || 'beginner',
    iconType: module?.iconType || 'security',
    topics: module?.topics || [],
    isActive: module?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => trainingApi.createCustomModule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-all-modules'] });
      toast.success('Module created');
      onClose();
    },
    onError: (err) => toast.error(err),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => trainingApi.updateCustomModule(module!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-all-modules'] });
      toast.success('Module updated');
      onClose();
    },
    onError: (err) => toast.error(err),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (module) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-surface-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {module ? 'Edit Module' : 'Create Module'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Module Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              >
                {DIFFICULTIES.map((diff) => (
                  <option key={diff.id} value={diff.id}>
                    {diff.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">Module is active</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-surface-700">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {module ? 'Update Module' : 'Create Module'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Upload SCORM Modal
function UploadScormModal({
  moduleId,
  onClose,
}: {
  moduleId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => trainingApi.uploadScormPackage(moduleId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-all-modules'] });
      toast.success('SCORM package uploaded successfully');
      onClose();
    },
    onError: (err) => toast.error(err),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.zip')) {
      setFile(droppedFile);
    } else {
      toast.error('Please upload a ZIP file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-surface-800 rounded-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upload SCORM Package
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-gray-300 dark:border-surface-600 hover:border-brand-500'
            }`}
          >
            <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-gray-400 dark:text-surface-500" />
            <p className="mt-3 text-sm text-gray-500 dark:text-surface-400">
              Drag and drop a SCORM ZIP file, or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected File */}
          {file && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
              <FolderIcon className="w-5 h-5 text-brand-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-surface-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-surface-700">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => file && uploadMutation.mutate(file)}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module Detail Modal
function ModuleDetailModal({
  module,
  onClose,
}: {
  module: {
    id: string;
    name: string;
    description: string;
    category: string;
    duration: number;
    difficulty: string;
    topics: string[];
    isBuiltIn: boolean;
  };
  onClose: () => void;
}) {
  const categoryLabel = CATEGORIES.find((c) => c.id === module.category)?.label || module.category;
  const difficultyLabel = DIFFICULTIES.find((d) => d.id === module.difficulty)?.label || module.difficulty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-surface-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${module.isBuiltIn ? 'bg-brand-500/10 text-brand-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <AcademicCapIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {module.name}
                </h2>
                <span className={`text-xs font-medium ${module.isBuiltIn ? 'text-brand-500' : 'text-emerald-500'}`}>
                  {module.isBuiltIn ? 'Built-in Module' : 'Custom Module'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Module Info */}
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-gray-100 dark:bg-surface-700 rounded-full text-sm text-gray-700 dark:text-surface-300">
              {categoryLabel}
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-surface-700 rounded-full text-sm text-gray-700 dark:text-surface-300">
              {module.duration} minutes
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-surface-700 rounded-full text-sm text-gray-700 dark:text-surface-300 capitalize">
              {difficultyLabel}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">Description</h3>
            <p className="text-gray-600 dark:text-surface-400 leading-relaxed">
              {module.description}
            </p>
          </div>

          {/* Topics Covered */}
          {module.topics && module.topics.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-surface-300 mb-3">Topics Covered</h3>
              <ul className="space-y-2">
                {module.topics.map((topic, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-surface-400">{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-surface-700">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload New SCORM Module Modal - Create module and upload SCORM in one step
function UploadNewScormModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'details'>('upload');
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    duration: 30,
    difficulty: 'beginner',
    iconType: 'security',
    topics: [] as string[],
    isActive: true,
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.zip')) {
      setFile(droppedFile);
      // Auto-populate name from filename
      const nameFromFile = droppedFile.name.replace('.zip', '').replace(/[-_]/g, ' ');
      setFormData(prev => ({ ...prev, name: nameFromFile }));
      setStep('details');
    } else {
      toast.error('Please upload a ZIP file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-populate name from filename
      const nameFromFile = selectedFile.name.replace('.zip', '').replace(/[-_]/g, ' ');
      setFormData(prev => ({ ...prev, name: nameFromFile }));
      setStep('details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      // Step 1: Create the module
      const createResponse = await trainingApi.createCustomModule(formData);
      const newModuleId = createResponse.data.id;

      // Step 2: Upload the SCORM package
      await trainingApi.uploadScormPackage(newModuleId, file);

      queryClient.invalidateQueries({ queryKey: ['training-all-modules'] });
      toast.success('SCORM module created successfully');
      onClose();
    } catch (error) {
      toast.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-surface-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upload SCORM Package
              </h2>
              <p className="text-sm text-gray-500 dark:text-surface-400 mt-1">
                {step === 'upload' ? 'Step 1: Select your SCORM package' : 'Step 2: Configure module details'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {step === 'upload' ? (
          <div className="p-6 space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-gray-300 dark:border-surface-600 hover:border-brand-500'
              }`}
            >
              <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-surface-500" />
              <p className="mt-4 text-base font-medium text-gray-700 dark:text-surface-300">
                Drag and drop your SCORM package
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-surface-400">
                or click to browse (ZIP files only)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-surface-700">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Selected File */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 truncate">
                  {file?.name}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  {file && (file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setStep('upload');
                }}
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                Module Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe what this training module covers..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                >
                  {DIFFICULTIES.map((diff) => (
                    <option key={diff.id} value={diff.id}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Active Status */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-900 dark:text-white">Module is active and available for campaigns</span>
            </label>

            {/* Actions */}
            <div className="flex justify-between gap-3 pt-4 border-t border-gray-200 dark:border-surface-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setStep('upload');
                }}
              >
                Back
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !formData.name}
                  leftIcon={isUploading ? undefined : <ArrowUpTrayIcon className="w-4 h-4" />}
                >
                  {isUploading ? 'Creating Module...' : 'Create Module'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
