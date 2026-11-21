import { reportCustomerImport } from './clientesDiag';
import type { SkippedCustomer } from './clientesDiag';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export const IMPORT_MAX_MB = 5;
export const IMPORT_MAX_ROWS = 20000;

// Plataforma (e-commerce) conectada. Hoje so a Yampi; novas plataformas entram aqui.
export const PLATFORM = { key: 'yampi', label: 'Yampi', fn: 'yampi-import-orders', logo: '/assets/platforms/yampi.png' };

export type ImportError = { ref: string; msg: string };

type F = {
  name: string; email: string; phone: string; document: string; birth_date: string; zip: string;
  street: string; number: string; complement: string; district: string; city: string; state: string;
  tags: string[]; notes: string;
};
export type ParsedRow = { line: number; ref: string; f: F };
export type Parsed = { rows: ParsedRow[]; blank: number; errors: ImportError[] };
export type FileImportResult = { created: number; updated: number; unchanged: number; blank: number; errors: ImportError[] };

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const ALIASES: Record<string, string[]> = {
  name: ['nome', 'nome completo', 'cliente', 'name'],
  email: ['e mail', 'email'],
  phone: ['telefone', 'celular', 'whatsapp', 'telefone whatsapp', 'telefone celular', 'phone'],
  document: ['documento', 'cpf', 'cnpj', 'cpf cnpj', 'cpf ou cnpj'],
  birth_date: ['nascimento', 'data de nascimento', 'data nascimento'],
  zip: ['cep'],
  street: ['rua', 'endereco', 'logradouro'],
  number: ['numero'],
  complement: ['complemento'],
  district: ['bairro'],
  city: ['cidade', 'municipio'],
  state: ['uf', 'estado'],
  tags: ['tags', 'tag'],
  notes: ['observacoes', 'observacao', 'obs'],
};

const isoDate = (d: Date) => new Date(d.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 10);
const str = (v: unknown) => (v instanceof Date ? isoDate(v) : String(v ?? '').trim());

function toBirth(v: string): string | null | 'invalid' {
  if (!v) return null;
  let y = 0, m = 0, d = 0;
  let x = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (x) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else {
    x = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!x) return 'invalid';
    d = +x[1]; m = +x[2]; y = +x[3];
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return 'invalid';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export async function readCustomerSheet(file: File): Promise<Parsed> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheet = wb.SheetNames.includes('Clientes') ? 'Clientes' : wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheet], { defval: '', raw: true });
  if (raw.length === 0) throw new Error('A planilha está vazia.');
  if (raw.length > IMPORT_MAX_ROWS) throw new Error(`A planilha tem linhas demais (máximo de ${IMPORT_MAX_ROWS.toLocaleString('pt-BR')}).`);

  const cols: Record<string, string> = {};
  for (const key of Object.keys(raw[0])) {
    const n = norm(key);
    for (const [field, names] of Object.entries(ALIASES)) if (!cols[field] && names.includes(n)) cols[field] = key;
  }
  if (!cols.name) throw new Error('Não encontrei a coluna "Nome". Use a planilha modelo.');
  if (!cols.email && !cols.document) throw new Error('A planilha precisa ter a coluna "E-mail" ou "Documento". Use a planilha modelo.');

  const out: Parsed = { rows: [], blank: 0, errors: [] };
  raw.forEach((r, i) => {
    const line = i + 2;
    const s = (k: string) => (cols[k] ? str(r[cols[k]]) : '');
    if (Object.keys(cols).every((k) => s(k) === '')) { out.blank++; return; }

    const name = s('name');
    const email = s('email').toLowerCase();
    let doc = s('document').replace(/\D/g, '');
    const ref = `Linha ${line}${name ? ' · ' + name : email ? ' · ' + email : ''}`;
    const fail = (msg: string) => out.errors.push({ ref, msg });

    if (doc) {
      if (doc.length >= 9 && doc.length <= 11) doc = doc.padStart(11, '0');
      else if (doc.length >= 12 && doc.length <= 14) doc = doc.padStart(14, '0');
      else return fail('Documento inválido. CPF tem 11 dígitos e CNPJ tem 14.');
    }
    if (!email && !doc) return fail('Informe o e-mail ou o documento do cliente.');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('E-mail inválido.');
    const birth = toBirth(s('birth_date'));
    if (birth === 'invalid') return fail('Nascimento inválido. Use dd/mm/aaaa.');
    const uf = s('state').toUpperCase();
    if (uf && !/^[A-Z]{2}$/.test(uf)) return fail('UF deve ter 2 letras (ex.: PR).');

    out.rows.push({
      line, ref,
      f: {
        name, email, phone: s('phone'), document: doc, birth_date: birth ?? '', zip: s('zip'),
        street: s('street'), number: s('number'), complement: s('complement'), district: s('district'),
        city: s('city'), state: uf,
        tags: s('tags').split(/[,;]/).map((t) => t.trim()).filter(Boolean),
        notes: s('notes'),
      },
    });
  });
  return out;
}

const friendly = (e: any) =>
  e?.code === '23505' ? 'E-mail ou documento já pertence a outro cliente.' : String(e?.message || 'Erro ao gravar.');

const FILL: (keyof F)[] = ['email', 'phone', 'document', 'birth_date', 'zip', 'street', 'number', 'complement', 'district', 'city', 'state', 'notes'];

export async function importCustomersRows(
  storeId: string, parsed: Parsed, onProgress: (done: number, total: number) => void,
): Promise<FileImportResult> {
  const res: FileImportResult = { created: 0, updated: 0, unchanged: 0, blank: parsed.blank, errors: [...parsed.errors] };

  const existing: Record<string, any>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('customers')
      .select('id,name,email,phone,document,birth_date,zip,street,number,complement,district,city,state,tags,notes')
      .eq('store_id', storeId).order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    existing.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const byDoc = new Map<string, Record<string, any>>();
  const byEmail = new Map<string, Record<string, any>>();
  for (const c of existing) {
    const d = String(c.document || '').replace(/\D/g, '');
    if (d) byDoc.set(d, c);
    if (c.email) byEmail.set(String(c.email).toLowerCase(), c);
  }

  const seen = new Set<string>();
  const creates: { ref: string; payload: Record<string, any> }[] = [];
  const updates: { ref: string; id: string; patch: Record<string, any> }[] = [];

  for (const row of parsed.rows) {
    const { f } = row;
    const kd = f.document ? 'd:' + f.document : '';
    const ke = f.email ? 'e:' + f.email : '';
    if ((kd && seen.has(kd)) || (ke && seen.has(ke))) {
      res.errors.push({ ref: row.ref, msg: 'Documento ou e-mail repetido na planilha. Só a primeira linha é considerada.' });
      continue;
    }
    if (kd) seen.add(kd);
    if (ke) seen.add(ke);

    const ex = (f.document && byDoc.get(f.document)) || (f.email && byEmail.get(f.email)) || null;
    if (ex) {
      const patch: Record<string, any> = {};
      for (const k of FILL) if (!String(ex[k] ?? '').trim() && f[k]) patch[k] = f[k];
      const cur: string[] = Array.isArray(ex.tags) ? ex.tags : [];
      const merged = Array.from(new Set([...cur, ...f.tags]));
      if (merged.length > cur.length) patch.tags = merged;
      if (Object.keys(patch).length === 0) res.unchanged++;
      else updates.push({ ref: row.ref, id: ex.id, patch: { ...patch, updated_at: new Date().toISOString() } });
    } else {
      if (!f.name) { res.errors.push({ ref: row.ref, msg: 'Cliente novo precisa de nome.' }); continue; }
      creates.push({
        ref: row.ref,
        payload: {
          store_id: storeId, name: f.name, email: f.email || null, phone: f.phone || null, document: f.document || null,
          birth_date: f.birth_date || null, zip: f.zip || null, street: f.street || null, number: f.number || null,
          complement: f.complement || null, district: f.district || null, city: f.city || null, state: f.state || null,
          tags: f.tags, notes: f.notes || null, source_platform: 'planilha',
        },
      });
    }
  }

  const total = creates.length + updates.length;
  let done = 0;
  onProgress(0, total);

  for (let i = 0; i < creates.length; i += 100) {
    const chunk = creates.slice(i, i + 100);
    const { error } = await sb.from('customers').insert(chunk.map((c) => c.payload));
    if (!error) { res.created += chunk.length; }
    else {
      for (const c of chunk) {
        const r = await sb.from('customers').insert(c.payload);
        if (r.error) res.errors.push({ ref: c.ref, msg: friendly(r.error) }); else res.created++;
      }
    }
    done += chunk.length;
    onProgress(done, total);
  }

  let idx = 0;
  const worker = async () => {
    while (idx < updates.length) {
      const u = updates[idx++];
      const { error } = await sb.from('customers').update(u.patch).eq('id', u.id);
      if (error) res.errors.push({ ref: u.ref, msg: friendly(error) }); else res.updated++;
      done++;
      onProgress(done, total);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return res;
}

export async function downloadCustomersTemplate() {
  const XLSX = await import('xlsx');
  const head = ['Nome', 'E-mail', 'Telefone', 'Documento', 'Nascimento', 'CEP', 'Rua', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Tags', 'Observações'];
  const ws = XLSX.utils.aoa_to_sheet([head]);
  ws['!cols'] = head.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  const help = XLSX.utils.aoa_to_sheet([
    ['Como preencher'],
    ['1. Preencha a aba "Clientes", uma linha por cliente. Não renomeie as colunas.'],
    ['2. Obrigatório: Nome e, pelo menos, E-mail ou Documento (CPF 11 dígitos, CNPJ 14).'],
    ['3. Cliente que já existe (mesmo documento ou e-mail) não é duplicado: só campos vazios são preenchidos e as tags são somadas.'],
    ['4. Nascimento no formato dd/mm/aaaa. UF com 2 letras (ex.: PR). Tags separadas por vírgula.'],
    ['5. Esta importação não altera o aceite de marketing nem de WhatsApp dos clientes.'],
    ['6. Exemplo de linha: Maria Silva | maria@email.com | 41999990000 | 12345678909 | 25/12/1990 | 80000000 | Rua A | 10 | Ap 2 | Centro | Curitiba | PR | vip, atacado | Cliente antiga'],
    ['7. Telefone, CEP e Documento com zero à esquerda: formate a coluna como Texto antes de digitar.'],
    ['Este arquivo funciona no Excel e no Google Sheets.'],
  ]);
  help['!cols'] = [{ wch: 120 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.utils.book_append_sheet(wb, help, 'Instruções');
  XLSX.writeFile(wb, 'modelo-importacao-clientes.xlsx', { compression: true });
}

export async function downloadImportErrors(errors: ImportError[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([['Referência', 'Erro'], ...errors.map((e) => [e.ref, e.msg])]);
  ws['!cols'] = [{ wch: 44 }, { wch: 80 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Erros');
  XLSX.writeFile(wb, `importacao-erros-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
}

// ---------------- Plataforma (e-commerce) ----------------
async function invoke(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke(PLATFORM.fn, { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context.json(); if (j?.error) msg = String(j.error); } catch { /* mantem */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data;
}

export async function probePlatform(storeId: string): Promise<{ orders: number; customers: number | null }> {
  const d = await invoke({ action: 'probe', store_id: storeId });
  return {
    orders: Number(d?.total_pedidos || 0),
    customers: d?.total_clientes == null ? null : Number(d.total_clientes),
  };
}

async function countCustomers(storeId: string): Promise<number> {
  const { count } = await sb.from('customers').select('id', { count: 'exact', head: true }).eq('store_id', storeId);
  return Number(count || 0);
}

export type PlatformResult = {
  processed: number; ok: number; failed: number; no_items: number; newCustomers: number;
  unknown: Record<string, number>; errors: ImportError[]; stopped: boolean; fatal: string | null;
};

export async function importPlatformHistory(
  storeId: string,
  onProgress: (p: { page: number; total: number; ok: number }) => void,
  shouldStop: () => boolean,
): Promise<PlatformResult> {
  const r: PlatformResult = { processed: 0, ok: 0, failed: 0, no_items: 0, newCustomers: 0, unknown: {}, errors: [], stopped: false, fatal: null };
  let before = 0;
  try { before = await countCustomers(storeId); } catch { /* segue */ }
  let page = 1;
  try {
    for (let guard = 0; guard < 400; guard++) {
      const d = await invoke({ action: 'import', store_id: storeId, from_page: page, pages: 3 });
      r.processed += d.processed; r.ok += d.ok; r.failed += d.failed; r.no_items += d.no_items;
      for (const m of (d.errors || []) as string[]) {
        const i = m.indexOf(': ');
        r.errors.push(i > 0 ? { ref: `Pedido ${m.slice(0, i)}`, msg: m.slice(i + 2) } : { ref: 'Pedido', msg: m });
      }
      for (const [k, v] of Object.entries(d.unknown_status || {})) r.unknown[k] = (r.unknown[k] || 0) + Number(v);
      onProgress({ page: Math.min(d.next_page - 1, d.total_pages), total: d.total_pages, ok: r.ok });
      if (d.done) break;
      if (shouldStop()) { r.stopped = true; break; }
      page = d.next_page;
    }
      if (!r.stopped) {
        let cp = 1;
        let created = 0, existing = 0;
        const skipped: SkippedCustomer[] = [];
        for (let guard = 0; guard < 50; guard++) {
          const d = await invoke({ action: 'import_customers', store_id: storeId, from_page: cp, pages: 2 });
          created += d.created || 0;
          existing += d.existing || 0;
          skipped.push(...((d.skipped || []) as SkippedCustomer[]));
          r.failed += d.failed;
          for (const m of (d.errors || []) as string[]) {
            const i = m.indexOf(': ');
            r.errors.push(i > 0 ? { ref: `Cliente ${m.slice(0, i)}`, msg: m.slice(i + 2) } : { ref: 'Cliente', msg: m });
          }
          if (d.done) { reportCustomerImport(created, existing, skipped); break; }
          if (shouldStop()) { r.stopped = true; break; }
          cp = d.next_page;
        }
      }
  } catch (e) {
    r.fatal = (e as Error).message;
  }
  try { r.newCustomers = Math.max(0, (await countCustomers(storeId)) - before); } catch { /* segue */ }
  return r;
}