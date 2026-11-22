export type CepData = { street: string; district: string; city: string; state: string; ibge: string };

export type CnpjData = {
  legal_name: string; trade_name: string; email: string; phone: string;
  zip: string; street: string; number: string; complement: string; district: string;
  city: string; state: string; ibge: string; tax_regime: 'simples' | 'mei' | null;
};

export const onlyDigits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');

export const maskCep = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
};

export const maskCnpj = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export function isValidCnpj(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Servico de consulta indisponivel (' + res.status + ').');
    return await res.json();
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('A consulta demorou demais. Tente de novo.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** ViaCEP: devolve null se o CEP nao existir. */
export async function fetchCep(cep: string): Promise<CepData | null> {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  const j = await getJson('https://viacep.com.br/ws/' + d + '/json/');
  if (!j || j.erro) return null;
  return {
    street: j.logradouro ?? '', district: j.bairro ?? '', city: j.localidade ?? '',
    state: (j.uf ?? '').toUpperCase(), ibge: j.ibge ?? '',
  };
}

/** BrasilAPI: devolve null se o CNPJ nao existir. */
export async function fetchCnpj(cnpj: string): Promise<CnpjData | null> {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return null;
  const j = await getJson('https://brasilapi.com.br/api/cnpj/v1/' + d);
  if (!j) return null;
  const mei = j.opcao_pelo_mei === true;
  const simples = j.opcao_pelo_simples === true;
  return {
    legal_name: j.razao_social ?? '',
    trade_name: j.nome_fantasia ?? '',
    email: (j.email ?? '').toLowerCase(),
    phone: j.ddd_telefone_1 ?? '',
    zip: onlyDigits(j.cep),
    street: [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' '),
    number: j.numero ?? '',
    complement: j.complemento ?? '',
    district: j.bairro ?? '',
    city: j.municipio ?? '',
    state: (j.uf ?? '').toUpperCase(),
    ibge: j.codigo_municipio_ibge ? String(j.codigo_municipio_ibge) : '',
    tax_regime: mei ? 'mei' : simples ? 'simples' : null,
  };
}