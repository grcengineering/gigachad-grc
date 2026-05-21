import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    path: string;
  };
  tips?: string[];
}

const ONBOARDING_KEY = 'gigachad-grc-onboarding-completed';
const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to GigaChad GRC! 🎉',
    description:
      "Your comprehensive Governance, Risk, and Compliance platform. Let's take a quick tour to help you get started.",
    icon: RocketLaunchIcon,
    tips: ['Press ⌘K anytime to search or run commands', 'Press ⌘/ to see all keyboard shortcuts'],
  },
  {
    id: 'controls',
    title: 'Security Controls',
    description:
      'Manage your security controls, map them to compliance frameworks, and track implementation status across your organization.',
    icon: ShieldCheckIcon,
    action: {
      label: 'View Controls',
      path: '/controls',
    },
    tips: [
      'Import controls from frameworks like SOC 2, ISO 27001',
      'Link controls to policies and evidence',
    ],
  },
  {
    id: 'risks',
    title: 'Risk Management',
    description:
      'Identify, assess, and track risks with our comprehensive risk register. Visualize risks with heat maps and manage treatment plans.',
    icon: ExclamationTriangleIcon,
    action: {
      label: 'View Risks',
      path: '/risks',
    },
    tips: [
      'Use the Risk Heat Map for visual analysis',
      'Create risk scenarios to model potential threats',
    ],
  },
  {
    id: 'policies',
    title: 'Policy Management',
    description:
      'Create, version, and manage your security policies. Track reviews, approvals, and ensure employees acknowledge policy changes.',
    icon: DocumentTextIcon,
    action: {
      label: 'View Policies',
      path: '/policies',
    },
    tips: ['Set up automated review reminders', 'Track policy acknowledgments'],
  },
  {
    id: 'vendors',
    title: 'Third-Party Risk Management',
    description:
      'Assess and monitor your vendors and suppliers. Track contracts, security assessments, and manage vendor relationships.',
    icon: BuildingOfficeIcon,
    action: {
      label: 'View Vendors',
      path: '/vendors',
    },
    tips: ['Use questionnaires for vendor assessments', 'Set up contract expiration alerts'],
  },
  {
    id: 'frameworks',
    title: 'Compliance Frameworks',
    description:
      'Map your controls to compliance frameworks like SOC 2, ISO 27001, HIPAA, and more. Track your readiness score in real-time.',
    icon: ChartBarIcon,
    action: {
      label: 'View Frameworks',
      path: '/frameworks',
    },
    tips: [
      'Dashboard shows framework readiness at a glance',
      'Generate compliance reports for auditors',
    ],
  },
  {
    id: 'training',
    title: 'Security Awareness Training',
    description:
      'Keep your team security-aware with interactive training modules. Track completion and compliance across your organization.',
    icon: AcademicCapIcon,
    action: {
      label: 'Start Training',
      path: '/awareness-training',
    },
    tips: ['Assign training modules to employees', 'Track completion rates on the dashboard'],
  },
  {
    id: 'complete',
    title: "You're All Set! 🚀",
    description:
      "You're ready to start managing your GRC program. Remember, you can always access help from the command palette (⌘K) or view keyboard shortcuts (⌘/).",
    icon: SparklesIcon,
    tips: [
      'Start by mapping your controls to a framework',
      'Set up your risk register',
      'Configure notification preferences',
    ],
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
    onClose();
  };

  const handleAction = () => {
    if (step.action) {
      navigate(step.action.path);
    }
  };

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-200 shadow-2xl transition-all">
                {/* Progress Bar */}
                <div className="h-1 bg-surface-200">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Skip Button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={handleSkip}
                    className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
                  >
                    Skip tour
                  </button>
                </div>

                {/* Content */}
                <div className="p-8 pt-12 text-center">
                  {/* Icon */}
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mb-6">
                    <step.icon className="w-8 h-8 text-brand-400" />
                  </div>

                  {/* Title */}
                  <Dialog.Title className="text-2xl font-bold text-white mb-3">
                    {step.title}
                  </Dialog.Title>

                  {/* Description */}
                  <p className="text-surface-700 mb-6 leading-relaxed">{step.description}</p>

                  {/* Tips */}
                  {step.tips && step.tips.length > 0 && (
                    <div className="bg-white/50 rounded-xl p-4 mb-6 text-left">
                      <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider mb-3">
                        Pro Tips
                      </p>
                      <ul className="space-y-2">
                        {step.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                            <CheckCircleIcon className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  {step.action && (
                    <Button onClick={handleAction} variant="secondary" className="mb-6">
                      {step.action.label}
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </Button>
                  )}

                  {/* Step Indicators */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {TOUR_STEPS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentStep(idx)}
                        className={clsx(
                          'w-2 h-2 rounded-full transition-all',
                          idx === currentStep
                            ? 'w-6 bg-brand-500'
                            : idx < currentStep
                              ? 'bg-brand-500/50'
                              : 'bg-surface-600'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 py-4 border-t border-surface-200 bg-white/50">
                  <button
                    onClick={handlePrev}
                    disabled={isFirst}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      isFirst
                        ? 'text-surface-600 cursor-not-allowed'
                        : 'text-surface-700 hover:text-white hover:bg-surface-200'
                    )}
                  >
                    Previous
                  </button>
                  <Button onClick={handleNext}>
                    {isLast ? 'Get Started' : 'Next'}
                    {!isLast && <ArrowRightIcon className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  });

  const startTour = () => setShowTour(true);
  const closeTour = () => setShowTour(false);
  const completeTour = () => {
    setHasCompleted(true);
    setShowTour(false);
  };
  const resetTour = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setHasCompleted(false);
  };

  // Show tour automatically for new users
  useEffect(() => {
    if (!hasCompleted) {
      // Delay slightly to let the app load
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted]);

  return {
    showTour,
    hasCompleted,
    startTour,
    closeTour,
    completeTour,
    resetTour,
  };
}

// Simple welcome banner for returning users
export function WelcomeBanner({
  userName,
  onStartTour,
  onDismiss,
}: {
  userName?: string;
  onStartTour: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-brand-600/20 to-brand-500/10 border border-brand-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-500/20">
            <SparklesIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-white font-medium">Welcome back{userName ? `, ${userName}` : ''}!</p>
            <p className="text-sm text-surface-600">
              Need a refresher? Take the product tour anytime.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onStartTour}
            className="px-3 py-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Take Tour
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
