import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Kbd } from '@/components/ui/Kbd';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'Navigation' },
  { keys: ['Ctrl', 'K'], description: 'Open command palette (Win/Linux)', category: 'Navigation' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Help' },
  { keys: ['Esc'], description: 'Close dialog or palette', category: 'Navigation' },
  { keys: ['↑', '↓'], description: 'Navigate list items', category: 'Navigation' },
  { keys: ['↵'], description: 'Open selected item', category: 'Navigation' },
  { keys: ['←', '↑', '→', '↓'], description: 'Navigate heatmap cells', category: 'Risk' },
];

export function useKeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[role="combobox"]'));
      if (isTyping) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const grouped = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description={
        <>
          Press <Kbd>?</Kbd> anywhere to toggle this dialog.
        </>
      }
      size="md"
    >
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              {category}
            </h3>
            <div className="space-y-1.5">
              {items.map((s) => (
                <div
                  key={s.description}
                  className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded hover:bg-surface-100/50"
                >
                  <span className="text-small text-surface-700">{s.description}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
