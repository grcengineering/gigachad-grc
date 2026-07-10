import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  Search,
  Home,
  Shield,
  Box,
  Folder,
  FileText,
  Server,
  Link as LinkIcon,
  TrendingUp,
  ListChecks,
  AlertTriangle,
  Zap,
  BarChart,
  Building2,
  FileCheck,
  Files,
  MessageSquare,
  BookOpen,
  Globe,
  ClipboardList,
  ScrollText,
  GraduationCap,
  SlidersHorizontal,
  Users,
  Key,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface RouteItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  keywords?: string[];
}

const ROUTES: RouteItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: Home, group: 'Navigate' },
  { label: 'Controls', path: '/controls', icon: Shield, group: 'Compliance' },
  { label: 'Frameworks', path: '/frameworks', icon: Box, group: 'Compliance' },
  { label: 'Evidence', path: '/evidence', icon: Folder, group: 'Data' },
  { label: 'Policies', path: '/policies', icon: FileText, group: 'Data' },
  { label: 'Assets', path: '/assets', icon: Server, group: 'Data' },
  { label: 'Integrations', path: '/integrations', icon: LinkIcon, group: 'Data' },
  { label: 'Risk Dashboard', path: '/risk-dashboard', icon: TrendingUp, group: 'Risk' },
  { label: 'Risk Register', path: '/risks', icon: AlertTriangle, group: 'Risk', keywords: ['risks'] },
  { label: 'My Queue', path: '/risk-queue', icon: ListChecks, group: 'Risk' },
  { label: 'Risk Heatmap', path: '/risk-heatmap', icon: BarChart, group: 'Risk' },
  { label: 'Scenarios', path: '/risk-scenarios', icon: Zap, group: 'Risk' },
  { label: 'Risk Reports', path: '/risk-reports', icon: BarChart, group: 'Risk' },
  { label: 'Vendors', path: '/vendors', icon: Building2, group: 'Third Party' },
  { label: 'Assessments', path: '/assessments', icon: FileCheck, group: 'Third Party' },
  { label: 'Contracts', path: '/contracts', icon: Files, group: 'Third Party' },
  { label: 'Questionnaires', path: '/questionnaires', icon: MessageSquare, group: 'Trust' },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen, group: 'Trust' },
  { label: 'Trust Center', path: '/trust-center', icon: Globe, group: 'Trust' },
  { label: 'Audits', path: '/audits', icon: ClipboardList, group: 'Audit' },
  { label: 'Audit Requests', path: '/audit-requests', icon: FileText, group: 'Audit' },
  { label: 'Findings', path: '/audit-findings', icon: AlertTriangle, group: 'Audit' },
  { label: 'Audit Log', path: '/audit', icon: ScrollText, group: 'Audit' },
  { label: 'Awareness & Training', path: '/tools/awareness', icon: GraduationCap, group: 'Tools' },
  { label: 'Risk Configuration', path: '/settings/risk', icon: SlidersHorizontal, group: 'Settings' },
  { label: 'Users', path: '/users', icon: Users, group: 'Settings' },
  { label: 'Permissions', path: '/permissions', icon: Key, group: 'Settings' },
  { label: 'Notification Settings', path: '/settings/notifications', icon: Settings, group: 'Settings' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'Settings' },
  { label: 'Design System', path: '/design-system', icon: Box, group: 'Settings', keywords: ['ui', 'primitives'] },
];

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

const RECENT_KEY = 'gc-cmdk-recent';
const MAX_RECENT = 6;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushRecent(path: string) {
  try {
    const current = loadRecent().filter((p) => p !== path);
    current.unshift(path);
    localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const recentPaths = loadRecent();

  const { data: searchResults = [] } = useQuery<SearchResult[]>({
    queryKey: ['cmdk-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const res = await axios.get(`${apiBase}/search/global`, {
          params: { q: query },
          withCredentials: true,
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) {
      // Defer clearing query so closing animation doesn't show empty state.
      const t = setTimeout(() => setQuery(''), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const go = (path: string) => {
    pushRecent(path);
    onOpenChange(false);
    navigate(path);
  };

  const recentItems = recentPaths
    .map((p) => ROUTES.find((r) => r.path === p))
    .filter((r): r is RouteItem => Boolean(r));

  const grouped = ROUTES.reduce<Record<string, RouteItem[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = [];
    acc[r.group].push(r);
    return acc;
  }, {});

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={() => onOpenChange(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-white/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-[12vh]">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-98 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-98 translate-y-2"
            >
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-lg bg-white border border-surface-300 shadow-2xl">
                <Command label="Command palette" loop>
                  <div className="flex items-center gap-3 border-b border-surface-200 px-4">
                    <Search className="h-4 w-4 text-surface-500" />
                    <Command.Input
                      value={query}
                      onValueChange={setQuery}
                      placeholder="Type a command, search, or jump to…"
                      className="flex-1 h-12 bg-transparent text-body text-surface-900 placeholder:text-surface-600 outline-none"
                      autoFocus
                    />
                    <kbd className="text-xs text-surface-500 font-mono">ESC</kbd>
                  </div>

                  <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
                    <Command.Empty>No results.</Command.Empty>

                    {!query && recentItems.length > 0 && (
                      <Command.Group heading="Recent">
                        {recentItems.map((item) => (
                          <Command.Item
                            key={`recent-${item.path}`}
                            value={`recent ${item.label}`}
                            onSelect={() => go(item.path)}
                          >
                            <item.icon className="h-4 w-4 text-surface-500" />
                            <span className="flex-1">{item.label}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-surface-500" />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {searchResults.length > 0 && (
                      <Command.Group heading="Search results">
                        {searchResults.map((r) => (
                          <Command.Item
                            key={`r-${r.type}-${r.id}`}
                            value={`${r.title} ${r.subtitle || ''} ${r.type}`}
                            onSelect={() => go(r.path)}
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-surface-100 text-[10px] uppercase text-surface-500">
                              {r.type.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{r.title}</div>
                              {r.subtitle && (
                                <div className="text-xs text-surface-500 truncate">{r.subtitle}</div>
                              )}
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {Object.entries(grouped).map(([group, items]) => (
                      <Command.Group key={group} heading={`Go to · ${group}`}>
                        {items.map((item) => (
                          <Command.Item
                            key={item.path}
                            value={`${item.label} ${item.keywords?.join(' ') || ''} ${group}`}
                            onSelect={() => go(item.path)}
                          >
                            <item.icon className="h-4 w-4 text-surface-500" />
                            <span className="flex-1">{item.label}</span>
                            <span className="text-xs text-surface-500">{item.path}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ))}
                  </Command.List>

                  <div className="flex items-center justify-between border-t border-surface-200 px-4 py-2 text-xs text-surface-500">
                    <div className="flex items-center gap-3">
                      <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
                      <span><kbd className="font-mono">↵</kbd> Open</span>
                    </div>
                    <span>
                      <kbd className="font-mono">⌘K</kbd> to toggle
                    </span>
                  </div>
                </Command>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/** Hook to wire global Cmd+K / Ctrl+K shortcut. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
