import {
  AcademicCapIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Badge, type BadgeVariant } from '@/components/ui';

export default function AwarenessTraining() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Awareness & Training</h1>
        <p className="text-surface-600 mt-1">Security awareness training and phishing simulation</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-xl border border-brand-500/30 p-8 text-center">
        <AcademicCapIcon className="w-16 h-16 text-brand-700 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-surface-900 mb-2">Coming Soon</h2>
        <p className="text-surface-700 max-w-2xl mx-auto">
          A comprehensive security awareness and training module is being developed. 
          This will help you manage employee training, track compliance, and run phishing simulations.
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          icon={PlayCircleIcon}
          title="Training Courses"
          description="Interactive security awareness courses with videos, quizzes, and certifications"
          status="planned"
        />
        <FeatureCard
          icon={DocumentTextIcon}
          title="Phishing Simulations"
          description="Run simulated phishing campaigns to test and improve employee awareness"
          status="planned"
        />
        <FeatureCard
          icon={ChartBarIcon}
          title="Analytics Dashboard"
          description="Track completion rates, quiz scores, and identify high-risk users"
          status="planned"
        />
        <FeatureCard
          icon={UserGroupIcon}
          title="User Management"
          description="Assign training by department, role, or custom groups"
          status="planned"
        />
        <FeatureCard
          icon={ClockIcon}
          title="Automated Campaigns"
          description="Schedule recurring training and automatic reminders for overdue courses"
          status="planned"
        />
        <FeatureCard
          icon={AcademicCapIcon}
          title="Compliance Tracking"
          description="Track training requirements for SOC 2, ISO 27001, and other frameworks"
          status="planned"
        />
      </div>

    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'available';
}) {
  const statusVariant: Record<typeof status, BadgeVariant> = {
    planned: 'neutral',
    'in-progress': 'warning',
    available: 'success',
  };

  return (
    <div className="bg-white rounded-lg border border-surface-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-surface-50 rounded-lg">
          <Icon className="w-6 h-6 text-brand-700" />
        </div>
        <Badge variant={statusVariant[status]} size="sm">
          {status === 'in-progress' ? 'In progress' : status}
        </Badge>
      </div>
      <h3 className="text-surface-900 font-medium mb-2">{title}</h3>
      <p className="text-surface-600 text-sm">{description}</p>
    </div>
  );
}

