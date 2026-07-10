type DateInput = Date | string | number;

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

const relativeUnits = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
] as const;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatRelativeTimeFromNow(input: DateInput): string {
  const date = toDate(input);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  for (const { unit, ms } of relativeUnits) {
    if (absMs >= ms || unit === 'second') {
      const value = Math.round(diffMs / ms);
      return relativeTimeFormatter.format(value, unit);
    }
  }

  return 'now';
}

export function formatDateTime(input: DateInput, includeYear = true): string {
  const date = toDate(input);

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(date);
}
