import {
  AcademicCapIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function AwarenessTraining() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Awareness & Training</h1>
        <p className="text-surface-400 mt-1">Security awareness training and phishing simulation</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-xl border border-brand-500/30 p-8 text-center">
        <AcademicCapIcon className="w-16 h-16 text-brand-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-surface-300 max-w-2xl mx-auto">
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

      {/* Message for Emre */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 p-6 text-center">
        <h3 className="text-lg font-medium text-white mb-2">All you, Emre. Go Wild 🚀</h3>
        <p className="text-surface-400">This module is ready for your internal tool integration.</p>
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
  const statusColors = {
    planned: 'bg-surface-600 text-surface-400',
    'in-progress': 'bg-amber-500/20 text-amber-400',
    available: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-surface-700 rounded-lg">
          <Icon className="w-6 h-6 text-brand-400" />
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
          {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      <p className="text-surface-400 text-sm">{description}</p>
    </div>
  );
}

