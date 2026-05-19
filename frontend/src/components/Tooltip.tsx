import { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  width?: 'sm' | 'md' | 'lg';
}

export function Tooltip({
  content,
  children,
  position = 'top',
  showIcon = true,
  width = 'md',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-800 border-x-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-surface-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-800 border-y-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-surface-800 border-y-transparent border-l-transparent',
  };

  const widthClasses = {
    sm: 'w-48',
    md: 'w-72',
    lg: 'w-96',
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children ||
          (showIcon && (
            <InformationCircleIcon className="w-4 h-4 text-surface-500 hover:text-surface-600 transition-colors" />
          ))}
      </div>
      {isVisible && (
        <div
          className={clsx(
            'absolute z-50 px-4 py-3 text-sm leading-relaxed',
            'text-surface-200 bg-surface-800 border border-surface-700',
            'rounded-lg shadow-xl',
            widthClasses[width],
            positionClasses[position]
          )}
        >
          {content}
          <div className={clsx('absolute w-0 h-0 border-[6px]', arrowClasses[position])} />
        </div>
      )}
    </div>
  );
}
