export type Method = 'gtm' | 'yampi' | 'manual';
export type Brand = {
  logo_url: string; primary_color: string; secondary_color: string;
  social_links?: Record<string, string>; benefits?: string[];
};
export type Billing = {
  person_type: 'pj' | 'pf'; legal_name: string; document: string; zip: string; street: string;
  number: string; complement: string; district: string; city: string; state: string;
};
export interface WizardData {
  store_url: string; store_niche: string; store_email: string; store_whatsapp: string;
  manager_name: string; manager_phone: string; manager_email: string; billing: Billing;
  connection_method: Method; script_verified: boolean; brand: Brand;
}
export interface StepProps { data: WizardData; storeId: string; onChange: (patch: Partial<WizardData>) => void }

export const DEFAULT_BRAND: Brand = { logo_url: '', primary_color: '#0094eb', secondary_color: '#fd8539' };
export const EMPTY_BILLING: Billing = { person_type: 'pj', legal_name: '', document: '', zip: '', street: '', number: '', complement: '', district: '', city: '', state: '' };
export const NICHES = ['Moda & Acessórios','Eletrônicos','Beleza & Cosméticos','Saúde','Casa & Decoração','Alimentos & Bebidas','Esportes & Fitness','Pet','Infantil','Outros'];
export const HEX = /^#[0-9a-fA-F]{6}$/;
export const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0094eb]';
export const LABEL = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
export const digits = (v: string) => (v || '').replace(/\D/g, '');
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function maskPhone(v: string): string {
  const d = digits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function maskDoc(v: string, type: 'pf' | 'pj'): string {
  const d = digits(v).slice(0, type === 'pf' ? 11 : 14);
  if (type === 'pf') {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
export function maskCep(v: string): string {
  const d = digits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
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

export function validateStore(d: WizardData): string | null {
  if (!normalizeUrl(d.store_url)) return 'Informe a URL da sua loja (ex.: www.sualoja.com.br).';
  if (!d.store_niche) return 'Selecione o nicho principal.';
  if (!emailOk(d.store_email)) return 'Informe um e-mail válido da loja.';
  const n = digits(d.store_whatsapp).length;
  if (n < 10 || n > 11) return 'Informe um WhatsApp de atendimento válido com DDD.';
  return null;
}
export function validateManager(d: WizardData): string | null {
  const b = d.billing;
  if (d.manager_name.trim().length < 3) return 'Informe o nome do contato.';
  const n = digits(d.manager_phone).length;
  if (n < 10 || n > 11) return 'Informe um telefone de contato válido com DDD.';
  if (!emailOk(d.manager_email)) return 'Informe um e-mail de contato válido.';
  if (b.legal_name.trim().length < 3) return b.person_type === 'pj' ? 'Informe a razão social.' : 'Informe o nome completo.';
  if (digits(b.document).length !== (b.person_type === 'pj' ? 14 : 11)) return b.person_type === 'pj' ? 'CNPJ deve ter 14 dígitos.' : 'CPF deve ter 11 dígitos.';
  if (digits(b.zip).length !== 8) return 'Informe o CEP com 8 dígitos.';
  if (!b.street.trim() || !b.number.trim() || !b.district.trim() || !b.city.trim()) return 'Complete o endereço de faturamento.';
  if (!/^[A-Za-z]{2}$/.test(b.state.trim())) return 'Informe a UF com 2 letras.';
  return null;
}
export function validateBrand(d: WizardData): string | null {
  return HEX.test(d.brand.primary_color) && HEX.test(d.brand.secondary_color) ? null : 'Informe as cores no formato #RRGGBB.';
}