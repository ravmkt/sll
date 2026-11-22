import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export const NF_PAGE_SIZE = 25;

export type NfStatus = 'pendente' | 'emitida' | 'autorizada' | 'rejeitada' | 'cancelada' | 'inutilizada';

export const NF_STATUSES: NfStatus[] = ['pendente', 'emitida', 'autorizada', 'rejeitada', 'cancelada', 'inutilizada'];

export const NF_STATUS_LABEL: Record<NfStatus, string> = {
  pendente: 'Pendente',
  emitida: 'Emitida',
  autorizada: 'Autorizada',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada',
  inutilizada: 'Inutilizada',
};

/** Cores semanticas (podem ficar fixas). */
export const NF_STATUS_CLS: Record<NfStatus, string> = {
  pendente: 'bg-amber-600 text-white',
  emitida: 'bg-teal-600 text-white',
  autorizada: 'bg-emerald-600 text-white',
  rejeitada: 'bg-red-600 text-white',
  cancelada: 'bg-slate-500 text-white',
  inutilizada: 'bg-slate-700 text-white',
};

export const NF_MIN_REASON = 15;

export interface NfNota {
  id: string;
  store_id: string;
  order_id: string | null;
  customer_id: string | null;
  serie: number;
  number: number;
  status: NfStatus;
  issued_at: string;
  recipient_name: string | null;
  recipient_document: string | null;
  recipient_email: string | null;
  total: number;
  channel: string | null;
  access_key: string | null;
  protocol: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  reject_reason: string | null;
  cancel_reason: string | null;
  provider_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface NfItem {
  id: string;
  nota_id: string;
  sku: string | null;
  description: string;
  ncm: string | null;
  cfop: string | null;
  qty: number;
  unit_price: number;
  total: number;
}

export interface NfEvent {
  id: string;
  nota_id: string;
  type: string;
  message: string | null;
  created_at: string;
}

export interface NfInutilizada {
  id: string;
  serie: number;
  number_from: number;
  number_to: number;
  reason: string;
  created_at: string;
}

export interface NfSettings {
  store_id: string;
  mode: 'manual' | 'provedor';
  provider: string | null;
  environment: 'homologacao' | 'producao';
  tax_regime: string | null;
  cnpj: string | null;
  ie: string | null;
  serie: number;
  next_number: number;
  default_cfop: string;
}

export interface NfSettingsForm {
  mode: 'manual' | 'provedor';
  provider: string;
  environment: 'homologacao' | 'producao';
  tax_regime: string;
  cnpj: string;
  ie: string;
  serie: string;
  next_number: string;
  default_cfop: string;
}

export interface NfListFilters {
  search: string;
  status: NfStatus | '';
  from: string | null;
  to: string | null;
  page: number;
}

export interface NfManualForm {
  order_id: string | null;
  serie: string;
  number: string;
  access_key: string;
  xml_url: string;
  issued: string;
  recipient_name: string;
  recipient_document: string;
  total: string;
  channel: string;
}

export interface NfDetail {
  nota: NfNota;
  items: NfItem[];
  events: NfEvent[];
}

export const DEFAULT_SETTINGS_FORM: NfSettingsForm = {
  mode: 'manual',
  provider: '',
  environment: 'homologacao',
  tax_regime: '',
  cnpj: '',
  ie: '',
  serie: '1',
  next_number: '1',
  default_cfop: '5102',
};

export const TAX_REGIMES = [
  { value: 'mei', label: 'MEI' },
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real', label: 'Lucro Real' },
];

// ---------- formatacao ----------

export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('pt-BR') : '-');

export const fmtDateTime = (v: string | null | undefined) => (v ? new Date(v).toLocaleString('pt-BR') : '-');

export const onlyDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function fmtDoc(doc: string | null | undefined): string {
  const d = onlyDigits(doc);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc || '-';
}

export const fmtNumber = (n: Pick<NfNota, 'serie' | 'number'>) => `${n.number} / s${n.serie}`;

export const formatAccessKey = (k: string | null | undefined) =>
  onlyDigits(k).replace(/(\d{4})(?=\d)/g, '$1 ');

// ---------- validacoes ----------

/** O banco exige 44 digitos. Retorna mensagem de erro ou null. */
export function validateAccessKey(key: string): string | null {
  const d = onlyDigits(key);
  if (!d) return null;
  return d.length === 44 ? null : 'A chave de acesso deve ter 44 números.';
}

/** Confere o digito verificador (modulo 11). Serve so de aviso, nao bloqueia. */
export function accessKeyDvOk(key: string): boolean {
  const d = onlyDigits(key);
  if (d.length !== 44) return false;
  let sum = 0;
  let w = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(d[i]) * w;
    w = w === 9 ? 2 : w + 1;
  }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv === Number(d[43]);
}

export const validateReason = (reason: string): string | null =>
  reason.trim().length >= NF_MIN_REASON ? null : `A justificativa precisa ter ${NF_MIN_REASON} caracteres ou mais.`;

export const canCancel = (n: Pick<NfNota, 'status'>) => n.status !== 'cancelada' && n.status !== 'inutilizada';

function toInt(v: string, label: string, min = 1): number {
  const n = Number(String(v).trim());
  if (!Number.isInteger(n) || n < min) throw new Error(`${label} inválido.`);
  return n;
}

function toMoney(v: string): number {
  const t = String(v ?? '').trim();
  if (!t) return 0;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  if (!Number.isFinite(n) || n < 0) throw new Error('Valor total inválido.');
  return n;
}

// ---------- configuracao fiscal ----------

export async function getSettings(storeId: string): Promise<NfSettings | null> {
  const { data, error } = await sb.from('gestor_nf_settings').select('*').eq('store_id', storeId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as NfSettings | null) ?? null;
}

export const settingsToForm = (s: NfSettings | null): NfSettingsForm =>
  s
    ? {
        mode: s.mode,
        provider: s.provider ?? '',
        environment: s.environment,
        tax_regime: s.tax_regime ?? '',
        cnpj: s.cnpj ?? '',
        ie: s.ie ?? '',
        serie: String(s.serie),
        next_number: String(s.next_number),
        default_cfop: s.default_cfop,
      }
    : { ...DEFAULT_SETTINGS_FORM };

export async function saveSettings(storeId: string, f: NfSettingsForm): Promise<void> {
  const cnpj = onlyDigits(f.cnpj);
  if (cnpj && cnpj.length !== 14) throw new Error('CNPJ inválido.');
  const { error } = await sb.rpc('gestor_nf_settings_save', {
    p_store: storeId,
    p_mode: f.mode,
    p_provider: f.provider.trim() || null,
    p_environment: f.environment,
    p_tax_regime: f.tax_regime || null,
    p_cnpj: cnpj || null,
    p_ie: f.ie.trim() || null,
    p_serie: toInt(f.serie, 'Série'),
    p_next_number: toInt(f.next_number, 'Próximo número'),
    p_cfop: f.default_cfop.trim() || '5102',
  });
  if (error) throw new Error(error.message);
}

// ---------- lista ----------

export async function listNotas(storeId: string, f: NfListFilters): Promise<{ rows: NfNota[]; total: number }> {
  let q = sb.from('gestor_nf_notas').select('*', { count: 'exact' }).eq('store_id', storeId);

  const term = f.search.trim().replace(/[,()%]/g, ' ').trim();
  if (term) {
    const parts = [
      `recipient_name.ilike.%${term}%`,
      `recipient_document.ilike.%${term}%`,
      `access_key.ilike.%${term}%`,
    ];
    if (/^\d{1,9}$/.test(term)) parts.push(`number.eq.${Number(term)}`);
    q = q.or(parts.join(','));
  }
  if (f.status) q = q.eq('status', f.status);
  if (f.from) q = q.gte('issued_at', f.from);
  if (f.to) q = q.lt('issued_at', f.to);

  const from = f.page * NF_PAGE_SIZE;
  const { data, error, count } = await q
    .order('issued_at', { ascending: false })
    .order('number', { ascending: false })
    .range(from, from + NF_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as NfNota[], total: count ?? 0 };
}

export async function countByStatus(storeId: string): Promise<Record<NfStatus, number>> {
  const out = Object.fromEntries(NF_STATUSES.map((s) => [s, 0])) as Record<NfStatus, number>;
  await Promise.all(
    NF_STATUSES.map(async (s) => {
      const { count, error } = await sb
        .from('gestor_nf_notas')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', s);
      if (error) throw new Error(error.message);
      out[s] = count ?? 0;
    }),
  );
  return out;
}

// ---------- detalhe ----------

export async function getNota(id: string): Promise<NfDetail> {
  const [n, i, e] = await Promise.all([
    sb.from('gestor_nf_notas').select('*').eq('id', id).single(),
    sb.from('gestor_nf_items').select('*').eq('nota_id', id).order('sku', { ascending: true }),
    sb.from('gestor_nf_events').select('*').eq('nota_id', id).order('created_at', { ascending: false }),
  ]);
  if (n.error) throw new Error(n.error.message);
  if (i.error) throw new Error(i.error.message);
  if (e.error) throw new Error(e.error.message);
  return { nota: n.data as NfNota, items: (i.data ?? []) as NfItem[], events: (e.data ?? []) as NfEvent[] };
}

/** Notas ativas (nao canceladas/inutilizadas/rejeitadas) por pedido, para marcar a lista de Pedidos. */
export async function activeNotasByOrder(storeId: string, orderIds: string[]): Promise<Map<string, NfNota>> {
  const map = new Map<string, NfNota>();
  if (orderIds.length === 0) return map;
  const { data, error } = await sb
    .from('gestor_nf_notas')
    .select('*')
    .eq('store_id', storeId)
    .in('order_id', orderIds)
    .in('status', ['pendente', 'emitida', 'autorizada']);
  if (error) throw new Error(error.message);
  for (const n of (data ?? []) as NfNota[]) if (n.order_id) map.set(n.order_id, n);
  return map;
}

// ---------- acoes (RPCs) ----------

export async function registerManual(storeId: string, f: NfManualForm): Promise<string> {
  const key = onlyDigits(f.access_key);
  const keyErr = validateAccessKey(key);
  if (keyErr) throw new Error(keyErr);
  const { data, error } = await sb.rpc('gestor_nf_register_manual', {
    p_store: storeId,
    p_order: f.order_id || null,
    p_serie: toInt(f.serie || '1', 'Série'),
    p_number: toInt(f.number, 'Número da nota'),
    p_key: key || null,
    p_xml_url: f.xml_url.trim() || null,
    p_issued: f.issued || null,
    p_name: f.recipient_name.trim() || null,
    p_document: onlyDigits(f.recipient_document) || null,
    p_total: toMoney(f.total),
    p_channel: f.channel.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelNota(notaId: string, reason: string): Promise<void> {
  const err = validateReason(reason);
  if (err) throw new Error(err);
  const { error } = await sb.rpc('gestor_nf_cancel', { p_nota: notaId, p_reason: reason.trim() });
  if (error) throw new Error(error.message);
}

export async function inutilizar(
  storeId: string,
  serie: string,
  from: string,
  to: string,
  reason: string,
): Promise<string> {
  const err = validateReason(reason);
  if (err) throw new Error(err);
  const a = toInt(from, 'Número inicial');
  const b = toInt(to, 'Número final');
  if (b < a) throw new Error('Faixa de numeração inválida.');
  const { data, error } = await sb.rpc('gestor_nf_inutilizar', {
    p_store: storeId,
    p_serie: toInt(serie || '1', 'Série'),
    p_from: a,
    p_to: b,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function listInutilizadas(storeId: string): Promise<NfInutilizada[]> {
  const { data, error } = await sb
    .from('gestor_nf_inutilizadas')
    .select('id, serie, number_from, number_to, reason, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as NfInutilizada[];
}