import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type CardDensity = 'compact' | 'cozy' | 'comfy';

const densityPad: Record<CardDensity, string> = {
  compact: 'p-3',
  cozy: 'p-4',
  comfy: 'p-6',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  density?: CardDensity;
  interactive?: boolean;
  /** When true, uses a subtle elevation shadow on top of the border. */
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, density, interactive, elevated = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg bg-white border border-surface-200',
        elevated && 'shadow-[0_1px_2px_0_rgba(30,25,20,0.06),0_1px_3px_-1px_rgba(30,25,20,0.08)]',
        density && densityPad[density],
        interactive && 'lift-hover cursor-pointer hover:border-surface-300',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 border-b border-surface-200',
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-h3 text-surface-900', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-small text-surface-600', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { density?: CardDensity }
>(({ className, density = 'cozy', ...props }, ref) => (
  <div ref={ref} className={cn(densityPad[density], className)} {...props} />
));
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-200 bg-surface-50/60',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
