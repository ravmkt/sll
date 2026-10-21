export type DateRange = { start: string; end: string };

export const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function toRange(arg: number | DateRange): DateRange {
  if (typeof arg !== 'number') return arg;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (arg - 1));
  return { start: ymd(start), end: ymd(end) };
}