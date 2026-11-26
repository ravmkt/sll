export const onlyDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function fmtCnpjCpf(v: string): string {
  const d = onlyDigits(v);
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return v;
}

export function fmtCep(v: string): string {
  const d = onlyDigits(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : v;
}

export function isValidCnpj(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = w.reduce((s, n, i) => s + n * Number(d[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function isValidCpf(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const sum = Array.from({ length: len }, (_, i) => Number(d[i]) * (len + 1 - i)).reduce((a, b) => a + b, 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

type Hit = { ok: true; data: any } | { ok: false; notFound: boolean };

// Uma tentativa. 404 = nao existe; qualquer outra falha (429, 5xx, rede, CORS, tempo) = tentar a proxima fonte.
async function tryGet(url: string): Promise<Hit> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (res.status === 404) return { ok: false, notFound: true };
    if (!res.ok) return { ok: false, notFound: false };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, notFound: false };
  } finally {
    clearTimeout(t);
  }
}

async function getJson(url: string): Promise<any> {
  const r = await tryGet(url);
  if (r.ok) return r.data;
  if (r.notFound) return null;
  throw new Error('Serviço de consulta indisponível. Tente de novo em instantes.');
}

export interface CepResult {
  street: string; district: string; city: string; state: string; ibge_code: string; complement: string;
}

export async function fetchCep(cep: string): Promise<CepResult | null> {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  const j = await getJson(`https://viacep.com.br/ws/${d}/json/`);
  if (!j || j.erro) return null;
  return {
    street: j.logradouro || '', district: j.bairro || '', city: j.localidade || '',
    state: j.uf || '', ibge_code: j.ibge || '', complement: j.complemento || '',
  };
}

export interface CnpjResult {
  legal_name: string; trade_name: string; email: string; phone: string; zip: string; street: string;
  number: string; complement: string; district: string; city: string; state: string; ibge_code: string;
  tax_regime: '' | 'mei' | 'simples'; situation: string;
}

const CNPJ_SOURCES = [
  (d: string) => `https://brasilapi.com.br/api/cnpj/v1/${d}`,
  (d: string) => `https://minhareceita.org/${d}`,
];

const cnpjCache = new Map<string, CnpjResult>();

function mapCnpj(j: any): CnpjResult {
  return {
    legal_name: j.razao_social || '',
    trade_name: j.nome_fantasia || '',
    email: (j.email || '').toLowerCase(),
    phone: onlyDigits(j.ddd_telefone_1 || ''),
    zip: onlyDigits(j.cep || ''),
    street: [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' '),
    number: j.numero || '',
    complement: j.complemento || '',
    district: j.bairro || '',
    city: j.municipio || '',
    state: j.uf || '',
    ibge_code: j.codigo_municipio_ibge ? String(j.codigo_municipio_ibge) : '',
    tax_regime: j.opcao_pelo_mei ? 'mei' : j.opcao_pelo_simples ? 'simples' : '',
    situation: j.descricao_situacao_cadastral || '',
  };
}

export async function fetchCnpj(cnpj: string): Promise<CnpjResult | null> {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return null;
  const cached = cnpjCache.get(d);
  if (cached) return cached;

  let allNotFound = true;
  for (const src of CNPJ_SOURCES) {
    const r = await tryGet(src(d));
    if (r.ok) {
      const out = mapCnpj(r.data);
      cnpjCache.set(d, out);
      return out;
    }
    if (!r.notFound) allNotFound = false;
  }
  if (allNotFound) return null;
  throw new Error('As consultas de CNPJ estão com muitas requisições no momento. Aguarde cerca de 1 minuto e clique em Buscar de novo, ou preencha os dados manualmente.');
}