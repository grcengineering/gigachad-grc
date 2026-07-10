import { Tab } from '@headlessui/react';
import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabsProps {
  tabs: { label: ReactNode; content: ReactNode; disabled?: boolean }[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

export function Tabs({ tabs, defaultIndex, onChange, className }: TabsProps) {
  return (
    <Tab.Group defaultIndex={defaultIndex} onChange={onChange}>
      <Tab.List className={cn('flex items-center gap-1 border-b border-surface-200', className)}>
        {tabs.map((tab, i) => (
          <Tab
            key={i}
            disabled={tab.disabled}
            className={({ selected }) =>
              cn(
                'relative px-3 py-2 text-small font-medium transition-colors -mb-px border-b-2 outline-none',
                selected
                  ? 'border-brand-500 text-surface-900'
                  : 'border-transparent text-surface-600 hover:text-surface-900',
                'focus-visible:ring-2 focus-visible:ring-brand-500 rounded-t-md',
                tab.disabled && 'opacity-50 cursor-not-allowed'
              )
            }
          >
            {tab.label}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="mt-4">
        {tabs.map((tab, i) => (
          <Tab.Panel key={i} className="focus:outline-none">
            {tab.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}
