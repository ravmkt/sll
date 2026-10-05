export type CommercialRuleType = "fixed" | "nth_weekday";

export interface CommercialDate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tip: string | null;
  rule_type: CommercialRuleType;
  month: number;
  day: number | null;
  weekday: number | null;
  nth: number | null;
  lead_days: number;
  sort_order: number;
  sector_ids: string[];
}

export interface CommercialDateOccurrence extends CommercialDate {
  date: Date;
  deadline: Date;
  daysLeft: number;
  inLeadWindow: boolean;
}

const DAY_MS = 86400000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / DAY_MS);
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  let result = new Date(year, month - 1, 1 + offset + (nth - 1) * 7);
  if (result.getMonth() !== month - 1) {
    result = new Date(result.getFullYear(), result.getMonth(), result.getDate() - 7);
  }
  return result;
}

export function resolveDate(d: CommercialDate, year: number): Date {
  if (d.rule_type === "fixed") {
    return new Date(year, d.month - 1, d.day ?? 1);
  }
  return nthWeekdayOfMonth(year, d.month, d.weekday ?? 0, d.nth ?? 1);
}

export function getOccurrence(d: CommercialDate, year: number, today: Date = new Date()): CommercialDateOccurrence {
  const date = resolveDate(d, year);
  const base = startOfDay(today);
  const deadline = new Date(date.getFullYear(), date.getMonth(), date.getDate() - d.lead_days);
  const daysLeft = diffDays(date, base);
  return { ...d, date, deadline, daysLeft, inLeadWindow: daysLeft >= 0 && diffDays(deadline, base) <= 0 };
}

export function getNextOccurrence(d: CommercialDate, today: Date = new Date()): CommercialDateOccurrence {
  const current = getOccurrence(d, today.getFullYear(), today);
  return current.daysLeft >= 0 ? current : getOccurrence(d, today.getFullYear() + 1, today);
}

export function getUpcoming(dates: CommercialDate[], limit = 3, today: Date = new Date()): CommercialDateOccurrence[] {
  return dates
    .map((d) => getNextOccurrence(d, today))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

export function getMonthOccurrences(
  dates: CommercialDate[],
  year: number,
  month: number,
  today: Date = new Date()
): CommercialDateOccurrence[] {
  return dates
    .filter((d) => d.month === month + 1)
    .map((d) => getOccurrence(d, year, today))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}