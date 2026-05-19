import { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, CardBody } from './Card';
import { Sparkline } from './Sparkline';

export type StatCardTone =
  | 'brand'
  | 'accent'
  | 'emerald'
  | 'red'
  | 'amber'
  | 'blue'
  | 'purple'
  | 'neutral';

const toneStyles: Record<
  StatCardTone,
  { iconBg: string; spark: { stroke: string; fill: string } }
> = {
  brand: {
    iconBg: 'bg-brand-500/10 text-brand-700',
    spark: { stroke: 'rgb(16 185 129)', fill: 'rgba(16, 185, 129, 0.15)' },
  },
  accent: {
    iconBg: 'bg-accent-500/10 text-accent-700',
    spark: { stroke: 'rgb(129 140 248)', fill: 'rgba(129, 140, 248, 0.15)' },
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    spark: { stroke: 'rgb(52 211 153)', fill: 'rgba(52, 211, 153, 0.15)' },
  },
  red: {
    iconBg: 'bg-red-500/10 text-red-600',
    spark: { stroke: 'rgb(248 113 113)', fill: 'rgba(248, 113, 113, 0.15)' },
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-700',
    spark: { stroke: 'rgb(251 191 36)', fill: 'rgba(251, 191, 36, 0.15)' },
  },
  blue: {
    iconBg: 'bg-blue-500/10 text-blue-600',
    spark: { stroke: 'rgb(96 165 250)', fill: 'rgba(96, 165, 250, 0.15)' },
  },
  purple: {
    iconBg: 'bg-purple-500/10 text-purple-600',
    spark: { stroke: 'rgb(196 181 253)', fill: 'rgba(196, 181, 253, 0.15)' },
  },
  neutral: {
    iconBg: 'bg-surface-100 text-surface-700',
    spark: { stroke: 'rgb(154 160 180)', fill: 'rgba(154, 160, 180, 0.12)' },
  },
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: StatCardTone;
  /** Optional delta percent vs. prior period. Positive = up, negative = down. */
  delta?: number;
  /** Whether positive delta is good (green) or bad (red). Default true (good). */
  deltaPositiveIsGood?: boolean;
  /** Optional sparkline data points. */
  trend?: number[];
  /** Optional click handler. Renders the card as interactive. */
  onClick?: () => void;
  /** Optional secondary line beneath the value (e.g., "of 240 total"). */
  caption?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  delta,
  deltaPositiveIsGood = true,
  trend,
  onClick,
  caption,
  className,
}: StatCardProps) {
  const styles = toneStyles[tone];

  const deltaPositive = (delta ?? 0) > 0;
  const deltaZero = (delta ?? 0) === 0;
  const deltaGood = deltaZero ? null : deltaPositiveIsGood ? deltaPositive : !deltaPositive;
  const deltaColor =
    deltaGood === null ? 'text-surface-500' : deltaGood ? 'text-emerald-600' : 'text-red-600';

  return (
    <Card
      interactive={!!onClick}
      onClick={onClick}
      className={cn('relative overflow-hidden', className)}
    >
      <CardBody density="comfy">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">{label}</p>
            <p className="text-display text-surface-900 mt-1 tabular-nums">{value}</p>
            {caption && <p className="text-xs text-surface-500 mt-0.5">{caption}</p>}
            {delta !== undefined && (
              <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', deltaColor)}>
                {deltaZero ? (
                  <ArrowRight className="h-3 w-3" />
                ) : deltaPositive ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                <span>{deltaZero ? '0' : `${deltaPositive ? '+' : ''}${delta}`}%</span>
                <span className="text-surface-500 font-normal">vs last period</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {icon && <div className={cn('p-2 rounded-md', styles.iconBg)}>{icon}</div>}
            {trend && trend.length > 1 && (
              <Sparkline data={trend} stroke={styles.spark.stroke} fill={styles.spark.fill} />
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
