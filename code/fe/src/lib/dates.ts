const dateValue = (value: string | Date) =>
  value instanceof Date
    ? value
    : new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);

export function formatDate(value: string | Date, includeYear = true) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC'
  })
    .format(dateValue(value))
    .replace(/\bSept\b/, 'Sep');
}

export function formatTime(value: string | Date) {
  return (
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC'
    }).format(dateValue(value)) + ' UTC'
  );
}

export function formatDateTime(value: string | Date) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatPeriod(from?: string, to?: string) {
  if (!from && !to) return 'All time';
  if (!from) return to ? `Until ${formatDate(to)}` : 'All time';
  if (!to) return `From ${formatDate(from)}`;
  if (from === to) return formatDate(from);
  const start = dateValue(from);
  const end = dateValue(to);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  if (sameYear && from.endsWith('-01-01') && to.endsWith('-12-31'))
    return from.slice(0, 4);
  const monthEnd = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)
  ).getUTCDate();
  if (sameMonth && start.getUTCDate() === 1 && end.getUTCDate() === monthEnd)
    return formatMonth(start);
  if (sameMonth) return `${start.getUTCDate()}–${formatDate(to)}`;
  return `${formatDate(from, !sameYear)} – ${formatDate(to)}`;
}

export function currentPeriodDates(
  period: 'This month' | 'Last month' | 'This year',
  now = new Date()
) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - (period === 'Last month' ? 1 : 0);
  const from = new Date(Date.UTC(year, period === 'This year' ? 0 : month, 1));
  const to = new Date(
    Date.UTC(year, period === 'This year' ? 12 : month + 1, 0)
  );
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10)
  };
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

// "YYYY-MM-DD" -> ISO midnight UTC, or null when not a real calendar date.
export function dateToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date.toISOString() : null;
}

// The ISO instant just after the given day, for exclusive `to` filters.
export function dateToExclusiveIso(value: string) {
  const iso = dateToIso(value);
  if (!iso) return null;
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export function shiftDate(value: string, days: number) {
  const iso = dateToIso(value);
  if (!iso) return value;
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateLabel(value: string, today = todayDate()) {
  if (value === today) return `Today · ${formatDate(value)}`;
  if (value === shiftDate(today, -1)) return `Yesterday · ${formatDate(value)}`;
  return dateToIso(value) ? formatDate(value) : value;
}

// Local-calendar keys for the native date picker, which works in local time.
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localPickerDate(value?: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatMonth(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(dateValue(value));
}
