// Training Module Types and Data
import { trainingApi as backendTrainingApi } from './api';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'social-engineering' | 'privacy' | 'secure-coding' | 'general';
  duration: number; // minutes
  slides: number;
  path: string; // path to HTML file
  iconType: 'phishing' | 'executive' | 'watering-hole' | 'security' | 'privacy' | 'code' | 'comprehensive';
  topics: string[];
  prerequisites?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TrainingProgress {
  moduleId: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  score?: number;
  slideProgress: number; // 0-100
  timeSpent: number; // minutes
  lastAccessedAt?: string;
}

export interface TrainingAssignment {
  id: string;
  moduleId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedAt?: string;
  isRequired: boolean;
}

export interface TrainingCampaign {
  id: string;
  name: string;
  description: string;
  moduleIds: string[];
  targetGroups: string[]; // department, role, or 'all'
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface TrainingStats {
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  totalTimeSpent: number;
  averageScore: number;
  certificationsEarned: number;
  streak: number; // consecutive days
  xp: number;
  level: number;
}

// Duration is calculated as 30 seconds per slide
const SECONDS_PER_SLIDE = 30;
const calculateDuration = (slides: number) => Math.ceil((slides * SECONDS_PER_SLIDE) / 60);

// Training Modules Catalog
export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'phishing-smishing-vishing',
    title: 'Phishing, Smishing & Vishing',
    description: 'Learn to identify and defend against email phishing, SMS smishing, and voice vishing attacks with interactive simulators.',
    category: 'social-engineering',
    duration: calculateDuration(9), // 9 slides × 30s = 5 min
    slides: 9,
    path: '/training/phishing-smishing-vishing-training/enhanced-interactive-training.html',
    iconType: 'phishing',
    topics: ['Email phishing', 'SMS smishing', 'Voice vishing', 'Social engineering'],
    difficulty: 'beginner',
  },
  {
    id: 'ceo-executive-fraud',
    title: 'CEO & Executive Fraud',
    description: 'Recognize business email compromise and executive impersonation attacks with realistic chat simulations.',
    category: 'social-engineering',
    duration: calculateDuration(6), // 6 slides × 30s = 3 min
    slides: 6,
    path: '/training/ceo-executive-fraud-training/enhanced-interactive-training.html',
    iconType: 'executive',
    topics: ['BEC attacks', 'Impersonation', 'Wire fraud', 'Urgency tactics'],
    difficulty: 'intermediate',
  },
  {
    id: 'watering-hole-attacks',
    title: 'Watering Hole Attacks',
    description: 'Understand website-based attacks and learn to identify compromised sites and malicious URLs.',
    category: 'social-engineering',
    duration: calculateDuration(9), // 9 slides × 30s = 5 min
    slides: 9,
    path: '/training/watering-hole-attacks-training/enhanced-interactive-training.html',
    iconType: 'watering-hole',
    topics: ['Website infections', 'URL detection', 'Incident response', 'Browser security'],
    difficulty: 'intermediate',
  },
  {
    id: 'general-cybersecurity',
    title: 'General Cybersecurity',
    description: 'Master core security concepts including ransomware, device security, password best practices, and software updates.',
    category: 'general',
    duration: calculateDuration(10), // 10 slides × 30s = 5 min
    slides: 10,
    path: '/training/general-cybersecurity-training/enhanced-interactive-training.html',
    iconType: 'security',
    topics: ['Ransomware', 'Device security', 'Passwords', 'Software updates'],
    difficulty: 'beginner',
  },
  {
    id: 'privacy-awareness',
    title: 'Privacy Awareness',
    description: 'Learn data privacy fundamentals including GDPR, CCPA compliance, data classification, and privacy best practices.',
    category: 'privacy',
    duration: calculateDuration(10), // 10 slides × 30s = 5 min
    slides: 10,
    path: '/training/privacy-awareness-training/enhanced-interactive-training.html',
    iconType: 'privacy',
    topics: ['GDPR', 'CCPA', 'Data classification', 'Privacy breach response'],
    difficulty: 'beginner',
  },
  {
    id: 'secure-coding',
    title: 'Secure Coding (OWASP Top 10)',
    description: 'For developers: Interactive exploration of OWASP Top 10 vulnerabilities with SQL injection labs and code review exercises.',
    category: 'secure-coding',
    duration: calculateDuration(6), // 6 slides × 30s = 3 min
    slides: 6,
    path: '/training/secure-coding-training/enhanced-interactive-training.html',
    iconType: 'code',
    prerequisites: ['general-cybersecurity'],
    topics: ['OWASP Top 10', 'SQL injection', 'Code review', 'Dependency scanning'],
    difficulty: 'advanced',
  },
];

// Combined Training Module
export const COMBINED_TRAINING: TrainingModule = {
  id: 'combined-training',
  title: 'Complete Security & Privacy Training',
  description: 'Comprehensive training covering all six modules in a single unified interface. Recommended for annual compliance training.',
  category: 'general',
  duration: calculateDuration(50), // 50 slides × 30s = 25 min
  slides: 50,
  path: '/training/cybersecurity-privacy-training-combined.html',
  iconType: 'comprehensive',
  topics: ['Social Engineering', 'Privacy', 'Secure Coding', 'General Security'],
  difficulty: 'intermediate',
};

// Local Storage Keys (fallback)
const STORAGE_KEYS = {
  PROGRESS: 'grc_training_progress',
  ASSIGNMENTS: 'grc_training_assignments',
  CAMPAIGNS: 'grc_training_campaigns',
  STATS: 'grc_training_stats',
};

// Check if we should use API (authenticated) or localStorage (fallback)
// Reserved for future use when API authentication is implemented
const _isAuthenticated = () => {
  // Check for auth token in localStorage or session
  return localStorage.getItem('auth_token') !== null || 
         sessionStorage.getItem('auth_token') !== null ||
         document.cookie.includes('session');
};
// Suppress unused warning
void _isAuthenticated;

// Training API (with localStorage fallback for offline/unauthenticated use)
export const trainingApiWrapper = {
  // Modules (always static)
  getModules: (): TrainingModule[] => {
    return TRAINING_MODULES;
  },
  
  getModule: (id: string): TrainingModule | undefined => {
    if (id === 'combined-training') return COMBINED_TRAINING;
    return TRAINING_MODULES.find(m => m.id === id);
  },
  
  getCombinedModule: (): TrainingModule => {
    return COMBINED_TRAINING;
  },

  // Progress
  getProgress: async (userId: string): Promise<TrainingProgress[]> => {
    try {
      const response = await backendTrainingApi.getProgress();
      return (response.data || []).map((p: any) => ({
        moduleId: p.moduleId,
        userId: p.userId,
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        score: p.score,
        slideProgress: p.slideProgress,
        timeSpent: p.timeSpent,
        lastAccessedAt: p.lastAccessedAt,
      }));
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const all: TrainingProgress[] = data ? JSON.parse(data) : [];
      return all.filter(p => p.userId === userId);
    }
  },
  
  getModuleProgress: async (userId: string, moduleId: string): Promise<TrainingProgress | undefined> => {
    try {
      const response = await backendTrainingApi.getModuleProgress(moduleId);
      const p = response.data;
      if (!p) return undefined;
      return {
        moduleId: p.moduleId,
        userId: p.userId,
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        score: p.score,
        slideProgress: p.slideProgress,
        timeSpent: p.timeSpent,
        lastAccessedAt: p.lastAccessedAt,
      };
    } catch {
      const progress = await trainingApiWrapper.getProgress(userId);
      return progress.find(p => p.moduleId === moduleId);
    }
  },
  
  updateProgress: async (progress: TrainingProgress): Promise<void> => {
    try {
      await backendTrainingApi.updateProgress(progress.moduleId, {
        status: progress.status,
        score: progress.score,
        slideProgress: progress.slideProgress,
        timeSpent: progress.timeSpent,
      });
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const all: TrainingProgress[] = data ? JSON.parse(data) : [];
      const index = all.findIndex(p => p.userId === progress.userId && p.moduleId === progress.moduleId);
      
      if (index >= 0) {
        all[index] = { ...all[index], ...progress, lastAccessedAt: new Date().toISOString() };
      } else {
        all.push({ ...progress, lastAccessedAt: new Date().toISOString() });
      }
      
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
    }
  },
  
  startModule: async (userId: string, moduleId: string): Promise<TrainingProgress> => {
    try {
      const response = await backendTrainingApi.startModule(moduleId);
      const p = response.data;
      return {
        moduleId: p.moduleId,
        userId: p.userId,
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        score: p.score,
        slideProgress: p.slideProgress,
        timeSpent: p.timeSpent,
        lastAccessedAt: p.lastAccessedAt,
      };
    } catch {
      // Fallback to localStorage
      const progress: TrainingProgress = {
        moduleId,
        userId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        slideProgress: 0,
        timeSpent: 0,
        lastAccessedAt: new Date().toISOString(),
      };
      await trainingApiWrapper.updateProgress(progress);
      return progress;
    }
  },
  
  completeModule: async (userId: string, moduleId: string, score?: number): Promise<TrainingProgress> => {
    try {
      const response = await backendTrainingApi.completeModule(moduleId, score);
      const p = response.data;
      return {
        moduleId: p.moduleId,
        userId: p.userId,
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        score: p.score,
        slideProgress: p.slideProgress,
        timeSpent: p.timeSpent,
        lastAccessedAt: p.lastAccessedAt,
      };
    } catch {
      // Fallback to localStorage
      const existing = await trainingApiWrapper.getModuleProgress(userId, moduleId);
      const progress: TrainingProgress = {
        ...(existing || { moduleId, userId, slideProgress: 100, timeSpent: 0 }),
        status: 'completed',
        completedAt: new Date().toISOString(),
        score,
        slideProgress: 100,
      };
      await trainingApiWrapper.updateProgress(progress);
      return progress;
    }
  },

  // Assignments
  getAssignments: async (userId: string): Promise<TrainingAssignment[]> => {
    try {
      const response = await backendTrainingApi.getMyAssignments();
      return response.data || [];
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      const all: TrainingAssignment[] = data ? JSON.parse(data) : [];
      return all.filter(a => a.userId === userId);
    }
  },
  
  createAssignment: async (assignment: Omit<TrainingAssignment, 'id'>): Promise<TrainingAssignment> => {
    try {
      const response = await backendTrainingApi.createAssignment({
        userId: assignment.userId,
        moduleId: assignment.moduleId,
        dueDate: assignment.dueDate,
        isRequired: assignment.isRequired,
      });
      return response.data;
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      const all: TrainingAssignment[] = data ? JSON.parse(data) : [];
      const newAssignment = { ...assignment, id: crypto.randomUUID() };
      all.push(newAssignment);
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(all));
      return newAssignment;
    }
  },
  
  updateAssignment: async (id: string, updates: Partial<TrainingAssignment>): Promise<void> => {
    try {
      await backendTrainingApi.updateAssignment(id, {
        status: updates.status,
        dueDate: updates.dueDate,
        isRequired: updates.isRequired,
      });
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      const all: TrainingAssignment[] = data ? JSON.parse(data) : [];
      const index = all.findIndex(a => a.id === id);
      if (index >= 0) {
        all[index] = { ...all[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(all));
      }
    }
  },

  // Stats
  getStats: async (userId: string): Promise<TrainingStats> => {
    try {
      const response = await backendTrainingApi.getStats();
      return response.data;
    } catch {
      // Fallback to localStorage calculation
      const progress = await trainingApiWrapper.getProgress(userId);
      const completed = progress.filter(p => p.status === 'completed');
      const inProgress = progress.filter(p => p.status === 'in_progress');
      const totalTime = progress.reduce((acc, p) => acc + p.timeSpent, 0);
      const avgScore = completed.length > 0
        ? completed.reduce((acc, p) => acc + (p.score || 0), 0) / completed.length
        : 0;
      
      const xp = completed.length * 100 + inProgress.length * 25;
      const level = Math.floor(xp / 200) + 1;
      
      return {
        totalModules: TRAINING_MODULES.length,
        completedModules: completed.length,
        inProgressModules: inProgress.length,
        totalTimeSpent: totalTime,
        averageScore: Math.round(avgScore),
        certificationsEarned: completed.length,
        streak: 0, // Would need date tracking
        xp,
        level,
      };
    }
  },

  // Campaigns (admin feature)
  getCampaigns: async (): Promise<TrainingCampaign[]> => {
    try {
      const response = await backendTrainingApi.getCampaigns();
      return response.data || [];
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      return data ? JSON.parse(data) : [];
    }
  },
  
  createCampaign: async (campaign: Omit<TrainingCampaign, 'id' | 'createdAt'>): Promise<TrainingCampaign> => {
    try {
      const response = await backendTrainingApi.createCampaign({
        name: campaign.name,
        description: campaign.description,
        moduleIds: campaign.moduleIds,
        targetGroups: campaign.targetGroups,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        isActive: campaign.isActive,
      });
      return response.data;
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      const all: TrainingCampaign[] = data ? JSON.parse(data) : [];
      const newCampaign = { 
        ...campaign, 
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      all.push(newCampaign);
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(all));
      return newCampaign;
    }
  },
};

// Legacy API export for backwards compatibility
// Also exported as trainingApi for backwards compatibility with AwarenessTraining.tsx
export const trainingApi_legacy = {
  getModules: trainingApiWrapper.getModules,
  getModule: trainingApiWrapper.getModule,
  getCombinedModule: trainingApiWrapper.getCombinedModule,
  getProgress: (userId: string) => {
    // Sync version for compatibility - returns from localStorage only
    const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    const all: TrainingProgress[] = data ? JSON.parse(data) : [];
    return all.filter(p => p.userId === userId);
  },
  getModuleProgress: (userId: string, moduleId: string) => {
    const progress = trainingApi_legacy.getProgress(userId);
    return progress.find(p => p.moduleId === moduleId);
  },
  updateProgress: (progress: TrainingProgress) => {
    // Fire and forget API call, sync localStorage. Errors are non-fatal
    // (localStorage is the source of truth) but we log them so a broken
    // backend isn't completely silent.
    trainingApiWrapper.updateProgress(progress).catch((err) => {
      console.warn('Training updateProgress sync failed:', err);
    });
    
    const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    const all: TrainingProgress[] = data ? JSON.parse(data) : [];
    const index = all.findIndex(p => p.userId === progress.userId && p.moduleId === progress.moduleId);
    
    if (index >= 0) {
      all[index] = { ...all[index], ...progress, lastAccessedAt: new Date().toISOString() };
    } else {
      all.push({ ...progress, lastAccessedAt: new Date().toISOString() });
    }
    
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
  },
  startModule: (userId: string, moduleId: string) => {
    const progress: TrainingProgress = {
      moduleId,
      userId,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      slideProgress: 0,
      timeSpent: 0,
      lastAccessedAt: new Date().toISOString(),
    };
    trainingApi_legacy.updateProgress(progress);
    // Also call API. Errors are non-fatal but worth surfacing in console.
    backendTrainingApi.startModule(moduleId).catch((err) => {
      console.warn('Training startModule sync failed:', err);
    });
    return progress;
  },
  completeModule: (userId: string, moduleId: string, score?: number) => {
    const existing = trainingApi_legacy.getModuleProgress(userId, moduleId);
    const progress: TrainingProgress = {
      ...(existing || { moduleId, userId, slideProgress: 100, timeSpent: 0 }),
      status: 'completed',
      completedAt: new Date().toISOString(),
      score,
      slideProgress: 100,
    };
    trainingApi_legacy.updateProgress(progress);
    // Also call API. Errors are non-fatal but worth surfacing in console.
    backendTrainingApi.completeModule(moduleId, score).catch((err) => {
      console.warn('Training completeModule sync failed:', err);
    });
    return progress;
  },
  getAssignments: (userId: string) => {
    const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    const all: TrainingAssignment[] = data ? JSON.parse(data) : [];
    return all.filter(a => a.userId === userId);
  },
  createAssignment: (assignment: Omit<TrainingAssignment, 'id'>) => {
    const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    const all: TrainingAssignment[] = data ? JSON.parse(data) : [];
    const newAssignment = { ...assignment, id: crypto.randomUUID() };
    all.push(newAssignment);
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(all));
    return newAssignment;
  },
  updateAssignment: (id: string, updates: Partial<TrainingAssignment>) => {
    const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    const all: TrainingAssignment[] = data ? JSON.parse(data) : [];
    const index = all.findIndex(a => a.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(all));
    }
  },
  getStats: (userId: string) => {
    const progress = trainingApi_legacy.getProgress(userId);
    const completed = progress.filter(p => p.status === 'completed');
    const inProgress = progress.filter(p => p.status === 'in_progress');
    const totalTime = progress.reduce((acc, p) => acc + p.timeSpent, 0);
    const avgScore = completed.length > 0
      ? completed.reduce((acc, p) => acc + (p.score || 0), 0) / completed.length
      : 0;
    
    const xp = completed.length * 100 + inProgress.length * 25;
    const level = Math.floor(xp / 200) + 1;
    
    return {
      totalModules: TRAINING_MODULES.length,
      completedModules: completed.length,
      inProgressModules: inProgress.length,
      totalTimeSpent: totalTime,
      averageScore: Math.round(avgScore),
      certificationsEarned: completed.length,
      streak: 0,
      xp,
      level,
    };
  },
  getCampaigns: () => {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    return data ? JSON.parse(data) : [];
  },
  createCampaign: (campaign: Omit<TrainingCampaign, 'id' | 'createdAt'>) => {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    const all: TrainingCampaign[] = data ? JSON.parse(data) : [];
    const newCampaign = { 
      ...campaign, 
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    all.push(newCampaign);
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(all));
    return newCampaign;
  },
};

// Helper functions
export function getModulesByCategory(category: TrainingModule['category']): TrainingModule[] {
  return TRAINING_MODULES.filter(m => m.category === category);
}

export function getDifficultyColor(difficulty: TrainingModule['difficulty']): string {
  switch (difficulty) {
    case 'beginner': return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20';
    case 'intermediate': return 'text-amber-400 bg-amber-400/10 border border-amber-400/20';
    case 'advanced': return 'text-rose-400 bg-rose-400/10 border border-rose-400/20';
  }
}

export function getCategoryLabel(category: TrainingModule['category']): string {
  switch (category) {
    case 'social-engineering': return 'Social Engineering';
    case 'privacy': return 'Privacy';
    case 'secure-coding': return 'Secure Coding';
    case 'general': return 'General Security';
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Export trainingApi_legacy as trainingApi for backwards compatibility
export const trainingApi = trainingApi_legacy;
