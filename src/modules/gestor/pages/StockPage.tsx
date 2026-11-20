import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, History, Loader2,
  Package, Save, Search, Undo2, Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { listProducts } from '@/services/productsService';
import type { CatalogProduct } from '@/services/productsService';
import { hasRealVariants, listVariantsByProduct, variantLabel } from '@/components/products/variantsData';
import type { VariantRow } from '@/components/products/variantsData';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { selectOnFocus } from '@/components/products/selectOnFocus';
import { pushStockToYampi } from '../services/gestor';
import StockImportModal, { IMPORT_MAX_MB, IMPORT_MAX_ROWS } from '../components/StockImportModal';

const sb: any = supabase;
const BASE = '/dashboard/modules/gestor';
const PAGE = 25;

type Item = { product: CatalogProduct; variants: VariantRow[]; multi: boolean };
type Filter = 'all' | 'with' | 'without' | 'changed';
type ImpStatus = 'change' | 'same' | 'notfound' | 'invalid' | 'dup';
type ImpRow = { line: number; sku: string; label: string; current: number | null; next: number | null; variantId: string | null; status: ImpStatus };

const STATUS_LABEL: Record<ImpStatus, string> = {
  change: 'Vai alterar',
  same: 'Sem mudança',
  notfound: 'SKU não encontrado',
  invalid: 'Valor inválido',
  dup: 'SKU repetido no arquivo',
};

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function parseQty(x: unknown): number | null | 'invalid' {
  if (x === null || x === undefined) return null;
  if (typeof x === 'string' && x.trim() === '') return null;
  const n = typeof x === 'number' ? x : Number(String(x).trim().replace(',', '.'));
  return Number.isInteger(n) && n >= 0 ? n : 'invalid';
}

function nextOnEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-stock]'));
  all[all.indexOf(e.currentTarget) + 1]?.focus();
}

function StockInput({ value, dirty, onChange }: { value: string; dirty: boolean; onChange: (v: string) => void }) {
  return (
    <input
      data-stock
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      {...selectOnFocus}
      onKeyDown={nextOnEnter}
      className={cn(
        'h-9 w-24 rounded-lg border bg-white px-2 text-center font-mono text-sm outline-none focus:border-[#0094eb] dark:bg-[#111524]',
        value === '' ? 'border-rose-400' : dirty ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700',
      )}
    />
  );
}

export default function StockPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [imp, setImp] = useState<ImpRow[] | null>(null);
  const [impIgnored, setImpIgnored] = useState(0);
  const [impOpen, setImpOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const [products, vmap] = await Promise.all([listProducts(storeId), listVariantsByProduct(storeId)]);
      const list: Item[] = products
        .filter((p) => (vmap.get(p.id)?.length ?? 0) > 0)
        .map((p) => { const variants = vmap.get(p.id)!; return { product: p, variants, multi: hasRealVariants(variants) }; })
        .sort((a, b) => a.product.name.localeCompare(b.product.name, 'pt-BR'));
      setItems(list);
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar o estoque.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void reload(); }, [lojaLoading, reload]);
  useEffect(() => { setPage(1); }, [search, filter]);

  const dirtyCount = Object.keys(edits).length;
  useEffect(() => {
    if (!dirtyCount) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirtyCount]);

  const valOf = (v: VariantRow) => edits[v.id] ?? String(v.stock);
  const isDirty = (v: VariantRow) => edits[v.id] !== undefined;
  const numOf = (v: VariantRow) => Number(valOf(v) || 0);

  const setVal = (v: VariantRow, raw: string) =>
    setEdits((prev) => {
      const n = { ...prev };
      if (raw === String(v.stock)) delete n[v.id]; else n[v.id] = raw;
      return n;
    });

  const replicate = (it: Item) => {
    const raw = valOf(it.variants[0]);
    if (raw === '') { showError('Digite um valor na primeira variação antes de replicar.'); return; }
    setEdits((prev) => {
      const n = { ...prev };
      for (const v of it.variants) { if (raw === String(v.stock)) delete n[v.id]; else n[v.id] = raw; }
      return n;
    });
  };

  const undoItem = (it: Item) =>
    setEdits((prev) => { const n = { ...prev }; for (const v of it.variants) delete n[v.id]; return n; });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const total = it.variants.reduce((s, v) => s + v.stock, 0);
      if (q) {
        const hit = it.product.name.toLowerCase().includes(q) || (it.product.sku || '').toLowerCase().includes(q) ||
          it.variants.some((v) => v.sku.toLowerCase().includes(q) || variantLabel(v).toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (filter === 'with') return total > 0;
      if (filter === 'without') return total <= 0;
      if (filter === 'changed') return it.variants.some((v) => edits[v.id] !== undefined);
      return true;
    });
  }, [items, search, filter, edits]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages);
  const pageItems = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const pending = useMemo(
    () => items.flatMap((it) => it.variants.filter((v) => edits[v.id] !== undefined).map((v) => ({ it, v }))),
    [items, edits],
  );

  const save = async () => {
    if (!storeId || pending.length === 0) return;
    const bad = pending.find(({ v }) => !/^\d+$/.test(edits[v.id]));
    if (bad) { showError(`Saldo inválido em ${variantLabel(bad.v)}. Use número inteiro, zero ou maior.`); return; }
    setSaving(true);
    const done = new Set<string>();
    const failed: string[] = [];
    let pushFailed = 0;
    let idx = 0;
    const worker = async () => {
      while (idx < pending.length) {
        const { it, v } = pending[idx++];
        const delta = Number(edits[v.id]) - v.stock;
        if (delta === 0) { done.add(v.id); continue; }
        try {
          await sb.from('product_variants').update({ sync_hold_until: new Date(Date.now() + 60000).toISOString() }).eq('id', v.id);
        } catch { /* sem trava de eco: segue */ }
        const { data: balance, error } = await sb.rpc('gestor_stock_move', {
          p_variant: v.id, p_type: 'adjustment', p_qty: delta, p_note: 'Ajuste pela página Estoque',
        });
        if (error) { failed.push(`${v.sku}: ${error.message}`); continue; }
        done.add(v.id);
        if (it.product.origin === 'yampi') {
          try {
            const r: unknown = await pushStockToYampi(storeId, v.sku, Number(balance ?? edits[v.id]));
            if (r === 'erro') pushFailed++;
          } catch { pushFailed++; }
        }
      }
    };
    try {
      await Promise.all([worker(), worker(), worker(), worker()]);
    } finally {
      setEdits((prev) => { const n = { ...prev }; done.forEach((id) => delete n[id]); return n; });
      await reload();
      setSaving(false);
    }
    if (done.size) showSuccess(`${done.size} variação(ões) atualizada(s).${pushFailed ? ` Envio à Yampi falhou em ${pushFailed}.` : ''}`);
    if (failed.length) showError(`${failed.length} falha(s). ${failed.slice(0, 2).join(' | ')}`);
  };

  const exportXlsx = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows: (string | number | null)[][] = [['SKU', 'Produto', 'Variação', 'Saldo atual', 'Novo saldo']];
      for (const it of filtered) {
        for (const v of it.variants) {
          const e = edits[v.id];
          rows.push([v.sku, it.product.name, it.multi ? variantLabel(v) : '', v.stock, e !== undefined && /^\d+$/.test(e) ? Number(e) : null]);
        }
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 26 }, { wch: 46 }, { wch: 26 }, { wch: 13 }, { wch: 13 }];
      const help = XLSX.utils.aoa_to_sheet([
        ['Como usar'],
        ['1. Preencha a coluna "Novo saldo" só nas linhas que quiser alterar.'],
        ['2. Não altere a coluna SKU: é ela que identifica a variação.'],
        ['3. Use números inteiros (0 ou mais). Linhas sem novo saldo são ignoradas.'],
        ['4. Salve o arquivo e use "Importar planilha" no Gestor.'],
        ['Este arquivo funciona no Excel e no Google Sheets.'],
      ]);
      help['!cols'] = [{ wch: 80 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
      XLSX.utils.book_append_sheet(wb, help, 'Instruções');
      XLSX.writeFile(wb, `estoque-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
    } catch (e) {
      console.error(e);
      showError('Não foi possível gerar a planilha.');
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { showError('Use um arquivo .xlsx, .xls ou .csv.'); return; }
    if (file.size > IMPORT_MAX_MB * 1024 * 1024) { showError(`Arquivo muito grande (máximo de ${IMPORT_MAX_MB} MB).`); return; }
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetName = wb.SheetNames.includes('Estoque') ? 'Estoque' : wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '', raw: true });
      if (raw.length === 0) { showError('A planilha está vazia.'); return; }
      if (raw.length > IMPORT_MAX_ROWS) { showError(`A planilha tem linhas demais (máximo de ${IMPORT_MAX_ROWS.toLocaleString('pt-BR')}).`); return; }

      const keys = Object.keys(raw[0]);
      const skuKey = keys.find((k) => norm(k) === 'sku');
      const qtyKey = keys.find((k) => ['novo saldo', 'novo estoque', 'saldo novo'].includes(norm(k)));
      if (!skuKey || !qtyKey) { showError('Não encontrei as colunas "SKU" e "Novo saldo". Use a planilha baixada aqui.'); return; }

      const bySku = new Map<string, { it: Item; v: VariantRow }>();
      for (const it of items) for (const v of it.variants) bySku.set(v.sku.trim().toLowerCase(), { it, v });

      const seen = new Set<string>();
      const rows: ImpRow[] = [];
      let ignored = 0;
      raw.forEach((r, i) => {
        const sku = String(r[skuKey] ?? '').trim();
        const qty = parseQty(r[qtyKey]);
        if (!sku || qty === null) { ignored++; return; }
        const key = sku.toLowerCase();
        const hit = bySku.get(key);
        const base = { line: i + 2, sku, label: hit ? `${hit.it.product.name}${hit.it.multi ? ' · ' + variantLabel(hit.v) : ''}` : '-', current: hit ? hit.v.stock : null, variantId: hit ? hit.v.id : null };
        if (seen.has(key)) { rows.push({ ...base, next: null, status: 'dup' }); return; }
        seen.add(key);
        if (!hit) { rows.push({ ...base, next: null, status: 'notfound' }); return; }
        if (qty === 'invalid') { rows.push({ ...base, next: null, status: 'invalid' }); return; }
        rows.push({ ...base, next: qty, status: qty === hit.v.stock ? 'same' : 'change' });
      });
      if (rows.length === 0) { showError('Nenhuma linha com "Novo saldo" preenchido.'); return; }
      setImpIgnored(ignored);
      setImp(rows);
    } catch (e) {
      console.error(e);
      showError('Não consegui ler a planilha. Confira se o arquivo não está corrompido.');
    }
  };

  const applyImport = () => {
    if (!imp) return;
    const changes = imp.filter((r) => r.status === 'change' && r.variantId && r.next !== null);
    setEdits((prev) => {
      const n = { ...prev };
      for (const r of changes) n[r.variantId as string] = String(r.next);
      return n;
    });
    showSuccess(`${changes.length} alteração(ões) carregada(s). Confira e clique em Salvar tudo.`);
    setImp(null);
  };

  const expandAll = () => setOpen(new Set(filtered.filter((i) => i.multi).map((i) => i.product.id)));
  const collapseAll = () => setOpen(new Set());
  const toggleOpen = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const btn = 'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0094eb] dark:border-slate-700 dark:bg-[#1a1f2c] dark:text-slate-200';
  const sel = cn(inputCls, '!w-auto !py-2.5 cursor-pointer');
  const impCount = (s: ImpStatus) => (imp ?? []).filter((r) => r.status === s).length;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-sm text-slate-500">Edite os saldos direto na lista ou em lote por planilha. Cada alteração entra no histórico como ajuste.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportXlsx()} className={btn}><Download size={15} className="text-[#0094eb]" /> Baixar planilha</button>
          <button type="button" onClick={() => setImpOpen(true)} className={btn}><Upload size={15} className="text-[#0094eb]" /> Importar planilha</button>
          {impOpen && <StockImportModal onClose={() => setImpOpen(false)} onPick={async (file) => { setImpOpen(false); await onFile(file); }} />}
          <Link to={`${BASE}/estoque/historico`} className={btn}><History size={15} className="text-[#0094eb]" /> Histórico de movimentações</Link>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1a1f2c]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por produto, variação ou SKU..." className={cn(inputCls, 'pl-10')} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={sel}>
              <option value="all">Todos</option>
              <option value="with">Com estoque</option>
              <option value="without">Sem estoque</option>
              <option value="changed">Só alterados</option>
            </select>
            <button type="button" onClick={expandAll} className={btn}><ChevronsUpDown size={15} /> Expandir tudo</button>
            <button type="button" onClick={collapseAll} className={btn}><ChevronsDownUp size={15} /> Recolher tudo</button>
          </div>
        </div>

        {loading || lojaLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0094eb]" /></div>
        ) : !storeId ? (
          <p className="py-12 text-center text-sm text-slate-500">Nenhuma loja vinculada à sua conta.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3">Produto / variação</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Atual</th>
                  <th className="px-4 py-3 text-center">Novo saldo</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageItems.map((it) => {
                  const cur = it.variants.reduce((s, v) => s + v.stock, 0);
                  const total = it.variants.reduce((s, v) => s + numOf(v), 0);
                  const isOpen = it.multi && open.has(it.product.id);
                  const single = it.multi ? null : it.variants[0];
                  const changed = it.variants.some(isDirty);
                  return (
                    <Fragment key={it.product.id}>
                      <tr className={cn(changed && 'bg-amber-50/70 dark:bg-amber-950/10')}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {it.multi ? (
                              <button type="button" onClick={() => toggleOpen(it.product.id)} title={isOpen ? 'Recolher variações' : 'Ver variações'} className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-[#0094eb] dark:hover:bg-slate-800">
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            ) : <span className="inline-block w-5" />}
                            <p className="max-w-sm truncate text-sm font-semibold text-slate-800 dark:text-white" title={it.product.name}>{it.product.name}</p>
                            {it.multi && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{it.variants.length} var.</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{single ? single.sku : it.product.sku || '—'}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-sm">{cur}</td>
                        <td className="px-4 py-2.5 text-center">
                          {single ? (
                            <StockInput value={valOf(single)} dirty={isDirty(single)} onChange={(raw) => setVal(single, raw)} />
                          ) : (
                            <span className={cn('font-mono text-sm font-bold', total !== cur ? 'text-amber-600' : 'text-slate-400')}>{total}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {changed && (
                            <button type="button" title="Desfazer alterações deste produto" onClick={() => undoItem(it)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800">
                              <Undo2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && it.variants.map((v, i) => (
                        <tr key={v.id} className={cn('bg-slate-50/70 dark:bg-white/[0.02]', isDirty(v) && '!bg-amber-50/70 dark:!bg-amber-950/10')}>
                          <td className="py-2 pl-12 pr-4">
                            <div className="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                              <p className="max-w-xs truncate text-xs font-semibold text-slate-700 dark:text-slate-200" title={variantLabel(v)}>{variantLabel(v)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-[11px] text-slate-500">{v.sku}</td>
                          <td className="px-4 py-2 text-center font-mono text-xs">{v.stock}</td>
                          <td className="px-4 py-2 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <StockInput value={valOf(v)} dirty={isDirty(v)} onChange={(raw) => setVal(v, raw)} />
                              {i === 0 && it.variants.length > 1 ? (
                                <button type="button" title="Aplicar este valor em todas as variações" onClick={() => replicate(it)} className="cursor-pointer rounded-lg border border-[#0094eb]/30 bg-[#0094eb]/10 p-2 text-[#0094eb] hover:bg-[#0094eb]/20">
                                  <ArrowDown size={14} />
                                </button>
                              ) : <span className="inline-block w-[34px]" />}
                            </div>
                          </td>
                          <td />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <Package size={40} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum produto encontrado</p>
                      <p className="mt-1 text-xs text-slate-400">Produtos sem variação cadastrada não aparecem aqui.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs text-slate-400">{filtered.length} produto(s) · Página {safePage} de {pages}</p>
            <div className="flex gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:bg-slate-800">Anterior</button>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:bg-slate-800">Próximo</button>
            </div>
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xl dark:border-slate-700 dark:bg-[#1a1f2c]">
          <span className="text-sm font-semibold">{pending.length} {pending.length === 1 ? 'alteração' : 'alterações'}</span>
          <button type="button" disabled={saving} onClick={() => setEdits({})} className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Descartar</button>
          <button type="button" disabled={saving} onClick={() => void save()} className={primaryBtn + ' disabled:opacity-50'}>
            {saving ? <Loader2 size={15} className="mr-2 inline animate-spin" /> : <Save size={15} className="mr-2 inline" />}Salvar tudo
          </button>
        </div>
      )}

      {imp && (
        <Modal title="Prévia da importação" onClose={() => setImp(null)}>
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>{impCount('change')}</strong> vão alterar · {impCount('same')} sem mudança · {impCount('notfound') + impCount('invalid') + impCount('dup')} com problema
              {impIgnored > 0 && <> · {impIgnored} linha(s) sem novo saldo ignoradas</>}
            </p>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-[#111524]">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Linha</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2 text-center">Atual</th><th className="px-3 py-2 text-center">Novo</th><th className="px-3 py-2">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {imp.map((r) => (
                    <tr key={r.line}>
                      <td className="px-3 py-1.5 text-slate-400">{r.line}</td>
                      <td className="px-3 py-1.5 font-mono">{r.sku}</td>
                      <td className="max-w-[16rem] truncate px-3 py-1.5">{r.label}</td>
                      <td className="px-3 py-1.5 text-center font-mono">{r.current ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center font-mono font-bold">{r.next ?? '—'}</td>
                      <td className={cn('px-3 py-1.5 font-semibold', r.status === 'change' ? 'text-emerald-600' : r.status === 'same' ? 'text-slate-400' : 'text-rose-500')}>{STATUS_LABEL[r.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400">Confirmar só carrega os valores na tela. Nada é gravado até você clicar em Salvar tudo.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setImp(null)} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
              <button type="button" disabled={impCount('change') === 0} onClick={applyImport} className={primaryBtn + ' disabled:opacity-50'}>Carregar {impCount('change')} alteração(ões)</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}