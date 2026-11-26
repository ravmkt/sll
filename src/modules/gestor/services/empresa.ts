import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface Company {
  legal_name: string; trade_name: string; cnpj: string; ie: string; ie_exempt: boolean; im: string; cnae: string;
  tax_regime: string; email: string; phone: string; website: string;
  zip: string; street: string; number: string; complement: string; district: string; city: string; state: string; ibge_code: string;
}

export const EMPTY_COMPANY: Company = {
  legal_name: '', trade_name: '', cnpj: '', ie: '', ie_exempt: false, im: '', cnae: '', tax_regime: '', email: '', phone: '', website: '',
  zip: '', street: '', number: '', complement: '', district: '', city: '', state: '', ibge_code: '',
};

export const REGIMES = [
  { value: 'mei', label: 'MEI' },
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro presumido' },
  { value: 'real', label: 'Lucro real' },
];

const s = (v: unknown) => (v == null ? '' : String(v));

export async function getCompany(storeId: string): Promise<{ company: Company; canEdit: boolean; saved: boolean }> {
  const { data, error } = await sb.rpc('gestor_company_get', { p_store: storeId });
  if (error) throw new Error(error.message);
  const d: any = data || {};
  const c: any = d.company || {};
  const company: Company = { ...EMPTY_COMPANY };
  (Object.keys(EMPTY_COMPANY) as (keyof Company)[]).forEach((k) => {
    if (k === 'ie_exempt') company.ie_exempt = !!c.ie_exempt;
    else (company as any)[k] = s(c[k]);
  });
  return { company, canEdit: !!d.can_edit, saved: !!d.saved };
}

export async function saveCompany(storeId: string, c: Company): Promise<void> {
  const dg = (v: string) => v.replace(/\D/g, '');
  const payload = { ...c, cnpj: dg(c.cnpj), zip: dg(c.zip), cnae: dg(c.cnae), ibge_code: dg(c.ibge_code) };
  const { error } = await sb.rpc('gestor_company_save', { p_store: storeId, p_data: payload });
  if (error) throw new Error(error.message);
}

/** O que ainda falta para a empresa poder emitir nota fiscal. */
export function missingFields(c: Company): string[] {
  const out: string[] = [];
  if (!c.legal_name.trim()) out.push('Razão social');
  if (c.cnpj.replace(/\D/g, '').length !== 14) out.push('CNPJ');
  if (!c.tax_regime) out.push('Regime tributário');
  if (!c.ie_exempt && !c.ie.trim()) out.push('Inscrição estadual (ou marque Isento)');
  if (c.zip.replace(/\D/g, '').length !== 8) out.push('CEP');
  if (!c.street.trim()) out.push('Rua');
  if (!c.number.trim()) out.push('Número');
  if (!c.district.trim()) out.push('Bairro');
  if (!c.city.trim()) out.push('Cidade');
  if (c.state.trim().length !== 2) out.push('UF');
  if (!c.email.trim()) out.push('E-mail');
  return out;
}