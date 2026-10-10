export type Method = 'gtm' | 'yampi' | 'manual';
export type Brand = {
  logo_url: string; primary_color: string; secondary_color: string;
  social_links: { instagram: string; tiktok: string; whatsapp: string };
  benefits: string[];
};
export interface WizardData {
  store_url: string; store_niche: string; manager_whatsapp: string;
  connection_method: Method; script_verified: boolean; brand: Brand;
}
export interface StepProps { data: WizardData; storeId: string; onChange: (patch: Partial<WizardData>) => void }

export const DEFAULT_BRAND: Brand = {
  logo_url: '', primary_color: '#0094eb', secondary_color: '#fd8539',
  social_links: { instagram: '', tiktok: '', whatsapp: '' },
  benefits: ['Frete Grátis', '1ª Troca Grátis', 'Parcelamento em até 6x'],
};
export const NICHES = ['Moda & Acessórios','Eletrônicos','Beleza & Cosméticos','Saúde','Casa & Decoração','Alimentos & Bebidas','Esportes & Fitness','Pet','Infantil','Outros'];
export const HEX = /^#[0-9a-fA-F]{6}$/;
export const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0094eb]';
export const LABEL = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
export const digits = (v: string) => v.replace(/\D/g, '');

export function maskPhone(v: string): string {
  const d = digits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function normalizeUrl(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.hostname.includes('.') ? u.origin : null;
  } catch { return null; }
}
export const sllSnippet = (storeId: string) =>
  `<script async src="${window.location.origin}/sll-loader.js" data-store-id="${storeId}"></script>`;