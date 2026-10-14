export type PeriodMode = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

export interface PeriodState {
  mode: PeriodMode;
  from: string;
  to: string;
  customFrom: string;
  customTo: string;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function startOfIsoWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
  return start;
}

export function rangeForMode(mode: Exclude<PeriodMode, 'custom'>, anchor = new Date()): DateRange {
  if (mode === 'day') {
    const from = toIsoDate(anchor);
    return { from, to: addDays(from, 1) };
  }

  if (mode === 'week') {
    const fromDate = startOfIsoWeek(anchor);
    const from = toIsoDate(fromDate);
    return { from, to: addDays(from, 7) };
  }

  if (mode === 'month') {
    const fromDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const toDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return { from: toIsoDate(fromDate), to: toIsoDate(toDate) };
  }

  const fromDate = new Date(anchor.getFullYear(), 0, 1);
  const toDate = new Date(anchor.getFullYear() + 1, 0, 1);
  return { from: toIsoDate(fromDate), to: toIsoDate(toDate) };
}

export function defaultPeriod(now = new Date()): PeriodState {
  const range = rangeForMode('month', now);
  return {
    mode: 'month',
    from: range.from,
    to: range.to,
    customFrom: range.from,
    customTo: addDays(range.to, -1)
  };
}

export function shiftPeriod(period: PeriodState, direction: -1 | 1): PeriodState {
  if (period.mode === 'custom') {
    const start = parseIsoDate(period.from);
    const end = parseIsoDate(period.to);
    const lengthMs = end.getTime() - start.getTime();
    const nextStart = new Date(start.getTime() + direction * lengthMs);
    const nextEnd = new Date(end.getTime() + direction * lengthMs);
    const from = toIsoDate(nextStart);
    const to = toIsoDate(nextEnd);
    return {
      ...period,
      from,
      to,
      customFrom: from,
      customTo: addDays(to, -1)
    };
  }

  const anchor = parseIsoDate(period.from);
  if (period.mode === 'day') {
    anchor.setDate(anchor.getDate() + direction);
  } else if (period.mode === 'week') {
    anchor.setDate(anchor.getDate() + direction * 7);
  } else if (period.mode === 'month') {
    anchor.setMonth(anchor.getMonth() + direction);
  } else {
    anchor.setFullYear(anchor.getFullYear() + direction);
  }

  const range = rangeForMode(period.mode, anchor);
  return {
    ...period,
    from: range.from,
    to: range.to,
    customFrom: range.from,
    customTo: addDays(range.to, -1)
  };
}

export function periodFromCustom(customFrom: string, customToInclusive: string): PeriodState {
  const to = addDays(customToInclusive, 1);
  return {
    mode: 'custom',
    from: customFrom,
    to,
    customFrom,
    customTo: customToInclusive
  };
}

export function formatPeriodLabel(period: PeriodState): string {
  const fromLabel = period.from;
  const toInclusive = addDays(period.to, -1);

  if (period.mode === 'day') {
    return fromLabel;
  }
  if (period.mode === 'week') {
    return `${fromLabel} – ${toInclusive}`;
  }
  if (period.mode === 'month') {
    const date = parseIsoDate(period.from);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (period.mode === 'year') {
    return String(parseIsoDate(period.from).getFullYear());
  }
  return `${fromLabel} – ${toInclusive}`;
}
