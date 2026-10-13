export type RuleDate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tip: string | null;
  rule_type: string;
  month: number | null;
  day: number | null;
  weekday: number | null;
  nth: number | null;
  lead_days: number | null;
};

function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function occurrence(d: RuleDate, year: number): Date | null {
  if (d.rule_type === 'easter_offset') {
    const e = easter(year);
    e.setDate(e.getDate() + (d.day ?? 0));
    return e;
  }
  if (!d.month) return null;
  if (d.rule_type === 'fixed') return d.day ? new Date(year, d.month - 1, d.day) : null;
  if ((d.rule_type === 'nth_weekday' || d.rule_type === 'thanksgiving_offset') && d.weekday !== null && d.nth) {
    const first = new Date(year, d.month - 1, 1);
    const offset = (d.weekday - first.getDay() + 7) % 7;
    const dt = new Date(year, d.month - 1, 1 + offset + (d.nth - 1) * 7);
    if (dt.getMonth() !== d.month - 1) return null;
    if (d.rule_type === 'thanksgiving_offset') dt.setDate(dt.getDate() + (d.day ?? 0));
    return dt;
  }
  return null;
}

export function nextOccurrence(d: RuleDate, today: Date): Date | null {
  for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
    const o = occurrence(d, y);
    if (o && o.getTime() >= today.getTime()) return o;
  }
  return null;
}