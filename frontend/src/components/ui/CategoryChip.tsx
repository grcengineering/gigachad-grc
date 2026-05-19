import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { categoryStyle, toTitleCase } from '@/lib/categoryStyle';

export type CategoryChipCase = 'title' | 'upper' | 'preserve';

export interface CategoryChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** The category value (raw API value or user-typed string). */
  value: string | null | undefined;
  /** Override the label text; defaults to the case-normalized value. */
  label?: string;
  /**
   * How to render case:
   *  - `'title'` (default): "soc 2 type ii" → "Soc 2 Type Ii". Use for control
   *    categories, permission resources, evidence types — anything that reads
   *    as prose.
   *  - `'upper'`: ALL CAPS. Use for framework types and other standards
   *    (SOC 2, ISO 27001, HIPAA, NIST, PCI DSS, GDPR).
   *  - `'preserve'`: render the value verbatim. Use sparingly when the source
   *    already has deliberate mixed casing (e.g., FedRAMP).
   */
  case?: CategoryChipCase;
}

/**
 * Canonical chip for categorical, non-status data: control category,
 * framework type, permission resource, evidence category, etc.
 * Use this everywhere instead of hand-rolling a colored `<span>`.
 *
 * Status pills should use the `<Badge>` primitive with a variant.
 */
export const CategoryChip = forwardRef<HTMLSpanElement, CategoryChipProps>(
  ({ value, label, case: caseMode = 'title', className, ...props }, ref) => {
    const raw = value ?? '';
    let text = label;
    if (!text) {
      if (caseMode === 'preserve') text = raw;
      else if (caseMode === 'upper') text = raw.replace(/[_-]+/g, ' ');
      else text = toTitleCase(raw);
    }
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
          caseMode === 'upper' && 'uppercase tracking-wider',
          categoryStyle(value),
          className
        )}
        {...props}
      >
        {text}
      </span>
    );
  }
);
CategoryChip.displayName = 'CategoryChip';
