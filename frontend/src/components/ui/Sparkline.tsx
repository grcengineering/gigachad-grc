import { useMemo } from 'react';
import { cn } from '@/lib/cn';

export interface SparklineProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  showArea?: boolean;
  showDot?: boolean;
}

export function Sparkline({
  data,
  className,
  width = 80,
  height = 24,
  stroke = 'rgb(16 185 129)',
  fill = 'rgba(16, 185, 129, 0.15)',
  showArea = true,
  showDot = true,
}: SparklineProps) {
  const { linePath, areaPath, lastPoint } = useMemo(() => {
    if (!data || data.length === 0) {
      return { linePath: '', areaPath: '', lastPoint: null as null | { x: number; y: number } };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : width;

    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return { x, y };
    });

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

    const area = `${line} L ${points[points.length - 1].x.toFixed(2)} ${height} L 0 ${height} Z`;

    return { linePath: line, areaPath: area, lastPoint: points[points.length - 1] };
  }, [data, width, height]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      {showArea && areaPath && <path d={areaPath} fill={fill} />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={stroke} />}
    </svg>
  );
}
