import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  PlayCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  DocumentCheckIcon,
  BookOpenIcon,
  XMarkIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  UserCircleIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CodeBracketIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import {
  TRAINING_MODULES,
  COMBINED_TRAINING,
  trainingApi,
  formatDuration,
  getDifficultyColor,
  getCategoryLabel,
  type TrainingModule,
  type TrainingProgress,
  type TrainingStats,
} from '@/lib/training';

type ViewMode = 'catalog' | 'viewer' | 'progress';

// Icon mapping for module types
function ModuleIcon({ type, className = "w-6 h-6" }: { type: TrainingModule['iconType']; className?: string }) {
  switch (type) {
    case 'phishing':
      return <EnvelopeIcon className={className} />;
    case 'executive':
      return <UserCircleIcon className={className} />;
    case 'watering-hole':
      return <GlobeAltIcon className={className} />;
    case 'security':
      return <ShieldCheckIcon className={className} />;
    case 'privacy':
      return <LockClosedIcon className={className} />;
    case 'code':
      return <CodeBracketIcon className={className} />;
    case 'comprehensive':
      return <AcademicCapIcon className={className} />;
    default:
      return <BookOpenIcon className={className} />;
  }
}

export default function AwarenessTraining() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const userId = user?.id || 'dev-user';
  
  useEffect(() => {
    setProgress(trainingApi.getProgress(userId));
    setStats(trainingApi.getStats(userId));
  }, [userId]);
  
  useEffect(() => {
    const moduleId = searchParams.get('module');
    if (moduleId) {
      const module = moduleId === 'combined' 
        ? COMBINED_TRAINING 
        : TRAINING_MODULES.find(m => m.id === moduleId);
      if (module) {
        setSelectedModule(module);
        setViewMode('viewer');
      }
    }
  }, [searchParams]);
  
  const handleStartModule = (module: TrainingModule) => {
    setSelectedModule(module);
    setViewMode('viewer');
    setSearchParams({ module: module.id === 'combined-training' ? 'combined' : module.id });
    
    const existingProgress = trainingApi.getModuleProgress(userId, module.id);
    if (!existingProgress || existingProgress.status === 'not_started') {
      trainingApi.startModule(userId, module.id);
      setProgress(trainingApi.getProgress(userId));
    }
  };
  
  const handleCloseViewer = () => {
    setSelectedModule(null);
    setViewMode('catalog');
    setSearchParams({});
    setStats(trainingApi.getStats(userId));
    setProgress(trainingApi.getProgress(userId));
  };
  
  const handleCompleteModule = () => {
    if (selectedModule) {
      trainingApi.completeModule(userId, selectedModule.id, 100);
      setStats(trainingApi.getStats(userId));
      setProgress(trainingApi.getProgress(userId));
    }
  };
  
  const getModuleProgress = (moduleId: string): TrainingProgress | undefined => {
    return progress.find(p => p.moduleId === moduleId);
  };
  
  const filteredModules = categoryFilter === 'all' 
    ? TRAINING_MODULES 
    : TRAINING_MODULES.filter(m => m.category === categoryFilter);

  if (viewMode === 'viewer' && selectedModule) {
    return (
      <TrainingViewer 
        module={selectedModule} 
        onClose={handleCloseViewer}
        onComplete={handleCompleteModule}
        progress={getModuleProgress(selectedModule.id)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Security Awareness Training</h1>
          <p className="text-gray-500 dark:text-surface-400 mt-1">
            Interactive training modules for security, privacy, and compliance
          </p>
        </div>
        <Button
          variant={viewMode === 'progress' ? 'primary' : 'secondary'}
          onClick={() => setViewMode(viewMode === 'progress' ? 'catalog' : 'progress')}
          leftIcon={<ChartBarIcon className="w-5 h-5" />}
        >
          {viewMode === 'progress' ? 'View Catalog' : 'My Progress'}
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && <StatsOverview stats={stats} />}

      {viewMode === 'progress' ? (
        <ProgressDashboard 
          progress={progress} 
          onStartModule={handleStartModule}
        />
      ) : (
        <>
          {/* Featured Training */}
          <FeaturedTraining 
            module={COMBINED_TRAINING} 
            onStart={handleStartModule} 
            progress={getModuleProgress(COMBINED_TRAINING.id)}
          />
          
          {/* Category Filter */}
          <div className="flex items-center gap-3 border-b border-gray-200 dark:border-surface-700 pb-4">
            <span className="text-gray-500 dark:text-surface-500 text-sm font-medium">Filter:</span>
            <div className="flex gap-1">
              {['all', 'social-engineering', 'privacy', 'secure-coding', 'general'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/30'
                      : 'text-gray-600 dark:text-surface-400 hover:text-gray-900 dark:hover:text-surface-200 hover:bg-gray-100 dark:hover:bg-surface-800'
                  }`}
                >
                  {cat === 'all' ? 'All Modules' : getCategoryLabel(cat as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Training Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredModules.map(module => (
              <TrainingCard 
                key={module.id} 
                module={module} 
                progress={getModuleProgress(module.id)}
                onStart={() => handleStartModule(module)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Stats Overview Component
function StatsOverview({ stats }: { stats: TrainingStats }) {
  const completionPercent = Math.round((stats.completedModules / stats.totalModules) * 100);
  
  return (
    <div className="bg-white/50 dark:bg-surface-800/50 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Training Progress</h2>
        <span className="text-2xl font-bold text-brand-500 dark:text-brand-400">{completionPercent}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${completionPercent}%` }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatItem label="Completed" value={stats.completedModules} total={stats.totalModules} />
        <StatItem label="In Progress" value={stats.inProgressModules} />
        <StatItem label="Time Invested" value={formatDuration(stats.totalTimeSpent)} />
        <StatItem label="Certificates" value={stats.certificationsEarned} />
      </div>
    </div>
  );
}

function StatItem({ label, value, total }: { label: string; value: string | number; total?: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
        {total !== undefined && <span className="text-gray-500 dark:text-surface-500 text-lg">/{total}</span>}
      </div>
      <div className="text-sm text-gray-500 dark:text-surface-400">{label}</div>
    </div>
  );
}

// Featured Training Card
function FeaturedTraining({ 
  module, 
  onStart, 
  progress 
}: { 
  module: TrainingModule; 
  onStart: (m: TrainingModule) => void;
  progress?: TrainingProgress;
}) {
  const isCompleted = progress?.status === 'completed';
  
  return (
    <div className="bg-gradient-to-br from-brand-500/10 via-white dark:via-surface-800 to-white dark:to-surface-800 rounded-xl border border-brand-500/20 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="p-4 bg-brand-500/10 rounded-xl border border-brand-500/20">
          <ModuleIcon type={module.iconType} className="w-10 h-10 text-brand-500 dark:text-brand-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-brand-500/20 text-brand-500 dark:text-brand-400 rounded text-xs font-medium">
              Recommended
            </span>
            {isCompleted && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded text-xs font-medium flex items-center gap-1">
                <CheckCircleSolidIcon className="w-3 h-3" /> Completed
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{module.title}</h2>
          <p className="text-gray-500 dark:text-surface-400 mb-4">{module.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-surface-500">
            <span className="flex items-center gap-1.5">
              <BookOpenIcon className="w-4 h-4" /> {module.slides} slides
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4" /> {formatDuration(module.duration)}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(module.difficulty)}`}>
              {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
            </span>
          </div>
        </div>
        <Button 
          onClick={() => onStart(module)} 
          size="lg"
          variant={isCompleted ? 'secondary' : 'primary'}
          rightIcon={<ArrowRightIcon className="w-4 h-4" />}
        >
          {isCompleted ? 'Review Training' : 'Start Training'}
        </Button>
      </div>
    </div>
  );
}

// Training Card Component
function TrainingCard({ 
  module, 
  progress, 
  onStart 
}: { 
  module: TrainingModule; 
  progress?: TrainingProgress; 
  onStart: () => void;
}) {
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';
  
  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 overflow-hidden hover:border-gray-300 dark:hover:border-surface-600 transition-all group">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-surface-700">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gray-100 dark:bg-surface-700/50 rounded-lg group-hover:bg-brand-500/10 transition-colors">
            <ModuleIcon type={module.iconType} className="w-6 h-6 text-gray-500 dark:text-surface-300 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors" />
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <CheckCircleSolidIcon className="w-4 h-4" />
              Complete
            </div>
          )}
          {isInProgress && !isCompleted && (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
              <PlayCircleIcon className="w-4 h-4" />
              In Progress
            </div>
          )}
        </div>
        
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
          {module.title}
        </h3>
        <p className="text-gray-500 dark:text-surface-400 text-sm line-clamp-2">{module.description}</p>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500 dark:text-surface-500 bg-gray-100 dark:bg-surface-700/50 px-2 py-1 rounded">
            {getCategoryLabel(module.category)}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(module.difficulty)}`}>
            {module.difficulty}
          </span>
        </div>
        
        {/* Progress bar */}
        {progress && progress.slideProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-surface-500 mb-1.5">
              <span>Progress</span>
              <span>{progress.slideProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-brand-500'} transition-all`}
                style={{ width: `${progress.slideProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Meta info */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-surface-500 mb-4">
          <span className="flex items-center gap-1.5">
            <BookOpenIcon className="w-4 h-4" /> {module.slides} slides
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4" /> {formatDuration(module.duration)}
          </span>
        </div>
        
        <Button 
          onClick={onStart} 
          variant={isCompleted ? 'secondary' : 'primary'} 
          className="w-full"
          leftIcon={isCompleted ? <CheckCircleIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}
        >
          {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
        </Button>
      </div>
    </div>
  );
}

// Training Viewer Component
function TrainingViewer({ 
  module, 
  onClose, 
  onComplete,
  progress 
}: { 
  module: TrainingModule; 
  onClose: () => void;
  onComplete: () => void;
  progress?: TrainingProgress;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Validate origin to prevent unauthorized postMessage attacks
      const allowedOrigins = [
        window.location.origin,
        import.meta.env.VITE_API_URL,
        import.meta.env.VITE_TRAINING_CDN_URL,
      ].filter(Boolean) as string[];
      
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('[Security] Received postMessage from unauthorized origin:', event.origin);
        return;
      }
      
      if (event.data?.type === 'trainingComplete') {
        onComplete();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-gray-100 dark:bg-surface-900`}>
      {/* Header */}
      <div className="bg-white dark:bg-surface-800 border-b border-gray-200 dark:border-surface-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-surface-700 rounded-lg">
              <ModuleIcon type={module.iconType} className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{module.title}</h2>
              <p className="text-sm text-gray-500 dark:text-surface-500">{formatDuration(module.duration)} • {module.slides} slides</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {progress?.status !== 'completed' && (
            <Button variant="secondary" onClick={onComplete} leftIcon={<DocumentCheckIcon className="w-4 h-4" />}>
              Mark Complete
            </Button>
          )}
          {progress?.status === 'completed' && (
            <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 text-sm font-medium px-3">
              <CheckCircleSolidIcon className="w-4 h-4" />
              Completed
            </span>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-500 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <XMarkIcon className="w-5 h-5" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Training Content */}
      <div className={`${isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[calc(100vh-180px)]'}`}>
        <iframe
          src={module.path}
          className="w-full h-full border-0"
          title={module.title}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

// Progress Dashboard Component
function ProgressDashboard({ 
  progress, 
  onStartModule 
}: { 
  progress: TrainingProgress[]; 
  onStartModule: (m: TrainingModule) => void;
}) {
  const completedModules = TRAINING_MODULES.filter(m => 
    progress.find(p => p.moduleId === m.id && p.status === 'completed')
  );
  const inProgressModules = TRAINING_MODULES.filter(m => 
    progress.find(p => p.moduleId === m.id && p.status === 'in_progress')
  );
  const notStartedModules = TRAINING_MODULES.filter(m => 
    !progress.find(p => p.moduleId === m.id)
  );
  
  return (
    <div className="space-y-8">
      {/* In Progress */}
      {inProgressModules.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PlayCircleIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            In Progress
            <span className="text-gray-500 dark:text-surface-500 font-normal">({inProgressModules.length})</span>
          </h3>
          <div className="space-y-3">
            {inProgressModules.map(module => {
              const moduleProgress = progress.find(p => p.moduleId === module.id);
              return (
                <div key={module.id} className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/10 rounded-lg">
                    <ModuleIcon type={module.iconType} className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 dark:text-white font-medium truncate">{module.title}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500"
                          style={{ width: `${moduleProgress?.slideProgress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-surface-500 w-10">{moduleProgress?.slideProgress || 0}%</span>
                    </div>
                  </div>
                  <Button variant="primary" onClick={() => onStartModule(module)}>
                    Continue
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Completed */}
      {completedModules.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            Completed
            <span className="text-gray-500 dark:text-surface-500 font-normal">({completedModules.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedModules.map(module => {
              const moduleProgress = progress.find(p => p.moduleId === module.id);
              return (
                <div key={module.id} className="bg-white dark:bg-surface-800 rounded-xl border border-emerald-500/20 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <ModuleIcon type={module.iconType} className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 dark:text-white font-medium truncate">{module.title}</h4>
                      {moduleProgress?.completedAt && (
                        <p className="text-xs text-gray-500 dark:text-surface-500 mt-0.5">
                          {new Date(moduleProgress.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-surface-700">
                    <span className="text-emerald-500 dark:text-emerald-400 text-xs font-medium flex items-center gap-1">
                      <SparklesIcon className="w-3.5 h-3.5" /> Certificate Earned
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => onStartModule(module)}>
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Not Started */}
      {notStartedModules.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-gray-500 dark:text-surface-500" />
            Not Started
            <span className="text-gray-500 dark:text-surface-500 font-normal">({notStartedModules.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notStartedModules.map(module => (
              <div key={module.id} className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-4 flex items-center gap-4">
                <div className="p-2.5 bg-gray-100 dark:bg-surface-700/50 rounded-lg">
                  <ModuleIcon type={module.iconType} className="w-5 h-5 text-gray-500 dark:text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 dark:text-white font-medium truncate">{module.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-surface-500">{formatDuration(module.duration)}</p>
                </div>
                <Button variant="secondary" onClick={() => onStartModule(module)}>
                  Start
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
