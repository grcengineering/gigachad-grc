import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ServerStackIcon,
  KeyIcon,
  UserGroupIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';
import { Dialog } from '@/components/ui/Dialog';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'completed' | 'error';
  instructions: string[];
  commands?: string[];
  checkEndpoint?: string;
}

interface SetupStatusResponse {
  isFirstRun: boolean;
  completedSteps: string[];
  pendingSteps: string[];
  setupProgress: number;
}

const SETUP_STEPS: Omit<SetupStep, 'status'>[] = [
  {
    id: 'database',
    title: 'Database Connection',
    description: 'PostgreSQL database must be running and accessible',
    icon: ServerStackIcon,
    instructions: [
      'Ensure PostgreSQL container is running',
      'Verify DATABASE_URL is correctly set in .env',
      'Check that the database user has proper permissions',
    ],
    commands: ['docker compose ps postgres', 'docker compose exec postgres pg_isready'],
  },
  {
    id: 'encryption-key',
    title: 'Encryption Key',
    description: 'Secure encryption key for sensitive data',
    icon: KeyIcon,
    instructions: [
      'Generate a strong encryption key (32+ characters)',
      'Set ENCRYPTION_KEY in your .env file',
      'This key encrypts API keys, credentials, and sensitive settings',
    ],
    commands: ['openssl rand -hex 32'],
  },
  {
    id: 'admin-user',
    title: 'Admin User',
    description: 'At least one admin user must exist',
    icon: UserGroupIcon,
    instructions: [
      'Run the seed command to create initial admin user',
      'Or configure Keycloak and create users there',
      'Admin users can manage all system settings',
    ],
    commands: ['docker compose exec controls npm run seed:admin'],
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Default organization setup',
    icon: Cog6ToothIcon,
    instructions: [
      'An organization is required for multi-tenancy',
      'The seed command creates a default organization',
      'Additional organizations can be created later',
    ],
  },
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'Configure Keycloak for production SSO',
    icon: ShieldCheckIcon,
    instructions: [
      'Access Keycloak admin console at your auth URL',
      'Create a realm for GRC (or import the provided realm)',
      'Configure client credentials in .env',
      'Set up user federation if using LDAP/AD',
    ],
    commands: ['docker compose logs keycloak'],
  },
  {
    id: 'backup-config',
    title: 'Backup Configuration',
    description: 'Configure automated backups for data protection',
    icon: CloudArrowUpIcon,
    instructions: [
      'Enable remote backup to S3 for disaster recovery',
      'Set DR_REMOTE_BACKUP_ENABLED=true in .env',
      'Configure S3 bucket and credentials',
      'Add backup.sh to crontab for scheduled backups',
    ],
    commands: ['crontab -e', '# Add: 0 2 * * * /opt/gigachad-grc/deploy/backup.sh'],
  },
];

export function SetupWizard({ onClose }: { onClose: () => void }) {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      setRefreshing(true);
      const response = await api.get<SetupStatusResponse>('/api/system/setup/status');
      const { completedSteps } = response.data;

      const updatedSteps: SetupStep[] = SETUP_STEPS.map((step) => ({
        ...step,
        status: completedSteps.includes(step.id) ? 'completed' : 'pending',
      }));

      setSteps(updatedSteps);

      // Find first incomplete step
      const firstIncomplete = updatedSteps.findIndex((s) => s.status === 'pending');
      if (firstIncomplete >= 0) {
        setCurrentStep(firstIncomplete);
      }
    } catch (error) {
      console.error('Failed to fetch setup status:', error);
      // Initialize with all steps as pending
      setSteps(SETUP_STEPS.map((step) => ({ ...step, status: 'pending' })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const progress =
    steps.length > 0
      ? Math.round((steps.filter((s) => s.status === 'completed').length / steps.length) * 100)
      : 0;

  const currentStepData = steps[currentStep];
  const isComplete = progress === 100;

  if (loading) {
    return (
      <Dialog open onClose={onClose}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-foreground">Loading setup status...</span>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} size="xl">
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {isComplete ? '🎉 Setup Complete!' : 'Production Setup Wizard'}
            </h2>
            <p className="text-sm text-foreground/60 mt-1">
              {isComplete
                ? 'Your GigaChad GRC instance is ready for production use'
                : 'Complete these steps to prepare your instance for production'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-foreground/60 hover:text-foreground"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b border-white/10">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-foreground/60">Setup Progress</span>
            <span className="text-foreground font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress === 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Steps sidebar */}
          <div className="w-64 border-r border-white/10 p-4 overflow-y-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = step.status === 'completed';

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                    isActive ? 'bg-primary/20 border border-primary/50' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-600'
                          : isActive
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface-700 text-foreground/40'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isCompleted
                            ? 'text-green-600'
                            : isActive
                              ? 'text-foreground'
                              : 'text-foreground/60'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentStepData && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-3 rounded-xl ${
                      currentStepData.status === 'completed' ? 'bg-green-500/20' : 'bg-primary/20'
                    }`}
                  >
                    {currentStepData.status === 'completed' ? (
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    ) : (
                      <currentStepData.icon className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-foreground/60">{currentStepData.description}</p>
                  </div>
                  {currentStepData.status === 'completed' && (
                    <span className="ml-auto px-3 py-1 bg-green-500/20 text-green-600 text-sm font-medium rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                {currentStepData.status !== 'completed' && (
                  <>
                    <div className="bg-surface-700/50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-foreground mb-3">Instructions</h4>
                      <ol className="space-y-2">
                        {currentStepData.instructions.map((instruction, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="text-primary font-medium">{i + 1}.</span>
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {currentStepData.commands && currentStepData.commands.length > 0 && (
                      <div className="bg-surface-900 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-foreground mb-3">Commands</h4>
                        <div className="space-y-2">
                          {currentStepData.commands.map((command, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 bg-black/30 rounded px-3 py-2"
                            >
                              <code className="text-sm text-green-600 font-mono flex-1">
                                {command}
                              </code>
                              <button
                                onClick={() => navigator.clipboard.writeText(command)}
                                className="text-foreground/40 hover:text-foreground text-xs"
                              >
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {currentStepData.status === 'completed' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircleIcon className="h-5 w-5" />
                      <span className="font-medium">This step is complete</span>
                    </div>
                    <p className="text-sm text-foreground/60 mt-2">
                      {currentStepData.title} has been properly configured. You can proceed to the
                      next step or review the configuration.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={fetchSetupStatus}
            disabled={refreshing}
            className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground disabled:opacity-50"
          >
            {refreshing ? 'Checking...' : 'Refresh Status'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground disabled:opacity-50 flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                Next
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
              >
                {isComplete ? 'Close' : 'Skip for Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Hook to check if setup wizard should be shown
 */
export function useSetupWizard() {
  const [showWizard, setShowWizard] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      // Check if user has dismissed the wizard
      const dismissed = sessionStorage.getItem('setupWizardDismissed');
      if (dismissed) {
        setHasChecked(true);
        return;
      }

      try {
        const response = await api.get<SetupStatusResponse>('/api/system/setup/status');
        if (response.data.isFirstRun || response.data.setupProgress < 50) {
          setShowWizard(true);
        }
      } catch {
        // Silently fail - don't block the app
      } finally {
        setHasChecked(true);
      }
    };

    checkSetup();
  }, []);

  const dismissWizard = () => {
    sessionStorage.setItem('setupWizardDismissed', 'true');
    setShowWizard(false);
  };

  return { showWizard, hasChecked, dismissWizard, openWizard: () => setShowWizard(true) };
}

export default SetupWizard;
