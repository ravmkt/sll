import type { Supplier, SupplierForm } from './cadastros';

export const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function fmtDoc(doc: string | null | undefined): string {
  const d = digits(doc);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return doc?.trim() || '-';
}

export function fmtPhone(p: string | null | undefined): string {
  const d = digits(p);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p?.trim() || '-';
}

export function whatsappUrl(p: string | null | undefined): string | null {
  const d = digits(p);
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? '55' + d : d}`;
}

export const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const EMPTY_FORM: SupplierForm = {
  name: '', document: '', email: '', phone: '', contact_name: '',
  lead_time_days: '', payment_terms: '', notes: '', active: true,
};

export const toForm = (s: Supplier): SupplierForm => ({
  name: s.name,
  document: s.document ?? '',
  email: s.email ?? '',
  phone: s.phone ?? '',
  contact_name: s.contact_name ?? '',
  lead_time_days: s.lead_time_days == null ? '' : String(s.lead_time_days),
  payment_terms: s.payment_terms ?? '',
  notes: s.notes ?? '',
  active: s.active,
});

export function validateSupplier(f: SupplierForm): string | null {
  if (!f.name.trim()) return 'Informe o nome do fornecedor.';
  const d = digits(f.document);
  if (f.document.trim() && d.length !== 11 && d.length !== 14) return 'CPF/CNPJ inválido: use 11 ou 14 dígitos.';
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'E-mail inválido.';
  if (f.lead_time_days.trim()) {
    const n = Number(f.lead_time_days);
    if (!Number.isInteger(n) || n < 0 || n > 999) return 'Prazo de entrega: número inteiro de 0 a 999 dias.';
  }
  return null;
}

export type SupplierSort = 'name' | 'document' | 'contact_name' | 'lead_time_days' | 'payment_terms' | 'active';

export const defaultSupplierDir = (): 'asc' => 'asc';

export function compareSuppliers(a: Supplier, b: Supplier, key: SupplierSort, dir: 'asc' | 'desc'): number {
  const m = dir === 'asc' ? 1 : -1;
  if (key === 'lead_time_days') {
    if (a.lead_time_days == null && b.lead_time_days == null) return 0;
    if (a.lead_time_days == null) return 1;
    if (b.lead_time_days == null) return -1;
    return (a.lead_time_days - b.lead_time_days) * m;
  }
  if (key === 'active') return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * m;
  const x = norm(String(a[key] ?? ''));
  const y = norm(String(b[key] ?? ''));
  if (!x && y) return 1;
  if (x && !y) return -1;
  return x.localeCompare(y, 'pt-BR') * m;
}