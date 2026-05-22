import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Shortcut {
  keys: string[];
  description: string;
  action?: () => void;
  global?: boolean;
}

interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsProps) {
  const shortcutGroups: ShortcutGroup[] = [
    {
      name: 'Global',
      shortcuts: [
        { keys: ['⌘', 'K'], description: 'Open command palette' },
        { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
        { keys: ['Esc'], description: 'Close modal / Cancel' },
      ],
    },
    {
      name: 'Navigation',
      shortcuts: [
        { keys: ['G', 'H'], description: 'Go to Dashboard' },
        { keys: ['G', 'C'], description: 'Go to Controls' },
        { keys: ['G', 'R'], description: 'Go to Risks' },
        { keys: ['G', 'P'], description: 'Go to Policies' },
        { keys: ['G', 'E'], description: 'Go to Evidence' },
        { keys: ['G', 'V'], description: 'Go to Vendors' },
        { keys: ['G', 'F'], description: 'Go to Frameworks' },
        { keys: ['G', 'S'], description: 'Go to Settings' },
      ],
    },
    {
      name: 'Actions',
      shortcuts: [
        { keys: ['N', 'C'], description: 'New Control' },
        { keys: ['N', 'R'], description: 'New Risk' },
        { keys: ['N', 'P'], description: 'New Policy' },
        { keys: ['N', 'E'], description: 'Upload Evidence' },
        { keys: ['N', 'V'], description: 'New Vendor' },
      ],
    },
    {
      name: 'List Views',
      shortcuts: [
        { keys: ['J'], description: 'Next item' },
        { keys: ['K'], description: 'Previous item' },
        { keys: ['Enter'], description: 'Open selected item' },
        { keys: ['X'], description: 'Toggle selection' },
        { keys: ['⌘', 'A'], description: 'Select all' },
        { keys: ['⌘', 'D'], description: 'Deselect all' },
      ],
    },
  ];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white border border-surface-200 shadow-2xl transition-all dark:bg-surface-900">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Keyboard Shortcuts
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                  {shortcutGroups.map((group) => (
                    <div key={group.name}>
                      <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-3">
                        {group.name}
                      </h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2">
                            <span className="text-surface-700 text-sm">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIdx) => (
                                <Fragment key={keyIdx}>
                                  {keyIdx > 0 && (
                                    <span className="text-surface-600 text-xs mx-0.5">+</span>
                                  )}
                                  <kbd className="px-2 py-1 text-xs font-medium bg-surface-200 text-surface-700 rounded border border-surface-300">
                                    {key}
                                  </kbd>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 bg-white/50 border-t border-surface-200 dark:bg-surface-900/50">
                  <p className="text-xs text-surface-500 text-center">
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 bg-surface-200 rounded text-surface-600">⌘</kbd> +{' '}
                    <kbd className="px-1.5 py-0.5 bg-surface-200 rounded text-surface-600">/</kbd>{' '}
                    to toggle this help
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// Hook to handle all keyboard shortcuts
export function useKeyboardShortcuts(options: { onShowShortcuts?: () => void }) {
  const navigate = useNavigate();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Command palette - Cmd/Ctrl + K (handled in CommandPalette)
      // Shortcuts modal - Cmd/Ctrl + /
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        options.onShowShortcuts?.();
        return;
      }

      // Two-key shortcuts (G + X for navigation, N + X for new)
      const key = e.key.toUpperCase();

      if (pendingKey) {
        // Handle second key in combo
        if (pendingKey === 'G') {
          // Navigation shortcuts
          const navMap: Record<string, string> = {
            H: '/',
            C: '/controls',
            R: '/risks',
            P: '/policies',
            E: '/evidence',
            V: '/vendors',
            F: '/frameworks',
            S: '/settings',
            A: '/audits',
            T: '/tools/awareness',
          };
          if (navMap[key]) {
            e.preventDefault();
            navigate(navMap[key]);
          }
        } else if (pendingKey === 'N') {
          // New item shortcuts
          const newMap: Record<string, string> = {
            C: '/controls/new',
            R: '/risks/new',
            P: '/policies/new',
            E: '/evidence/new',
            V: '/vendors/new',
          };
          if (newMap[key]) {
            e.preventDefault();
            navigate(newMap[key]);
          }
        }
        setPendingKey(null);
        return;
      }

      // Start of two-key combo
      if (key === 'G' || key === 'N') {
        setPendingKey(key);
        // Clear pending key after 1 second
        setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      // Single key shortcuts (only on list views)
      // These would require more context about the current page state
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, pendingKey, options]);

  return { pendingKey };
}

export default KeyboardShortcutsModal;
