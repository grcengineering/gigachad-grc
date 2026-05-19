/**
 * Legacy Tooltip wrapper. Renders an info icon (when no children given)
 * and delegates positioning + hover behavior to the design-system Tooltip.
 *
 * Callers should migrate to `<Tooltip content={...}>{trigger}</Tooltip>`
 * from @/components/ui/Tooltip directly.
 */
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  /** Kept for API compatibility — width is driven by content in the new tooltip. */
  width?: 'sm' | 'md' | 'lg';
}

export function Tooltip({ content, children, position = 'top', showIcon = true }: TooltipProps) {
  const trigger =
    children ??
    (showIcon ? (
      <InformationCircleIcon className="w-4 h-4 text-surface-500 hover:text-surface-700 cursor-help inline-block" />
    ) : null);

  if (!trigger) return null;

  return (
    <UITooltip content={content} side={position}>
      {trigger}
    </UITooltip>
  );
}

export default Tooltip;
