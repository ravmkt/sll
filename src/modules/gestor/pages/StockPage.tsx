import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
import { listChannelLinks } from '../services/vinculos';
import { CHANNEL_META, listActiveChannels } from '../services/canais';
import type { ChannelKey } from '../services/canais';
import ChannelFavicon from '../components/ChannelFavicon';
import HistoryDialog from '../components/HistoryDialog';
import StockSyncModal from '../components/StockSyncModal';
import type { SyncProduct } from '../components/StockSyncModal';

import ChannelsModal from '../components/ChannelsModal';
import TransferDialog from '../components/TransferDialog';
import { ChannelsCell, TotalCell } from '../components/ChannelChips';
import { EMPTY_AVAIL, loadAvailability } from '../services/estoqueCanais';
import type { Availability } from '../services/estoqueCanais';
import { listWarehouses } from '@/shared/products/lookups';
import { Settings2 } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import StockImportModal, { IMPORT_MAX_MB, IMPORT_MAX_ROWS } from '../components/StockImportModal';
import { useGestorAccess } from '../hooks/useGestorAccess';

const sb: any = supabase;
const PAGE = 25;

type Item = { product: CatalogProduct; variants: VariantRow[]; multi: boolean };
type Filter = 'all' | 'with' | 'without' | 'changed';
type ImpStatus = 'change' | 'same' | 'notfound' | 'invalid' | 'dup';
type ImpRow = { line: number; sku: string; label: string; current: number | null; next: number | null; variantId: string | null; status: ImpStatus };

type FailRow = { line: number; sku: string; label: string; next: number | null; reason: string };
type ImpResult = { saved: number; same: number; ignored: number; pushFailed: number; failed: FailRow[] };

const REASON: Record<string, string> = {
  notfound: 'SKU não encontrado no cadastro. Confira se o SKU está igual ao do produto.',
  invalid: 'Valor inválido em "Novo saldo". Use número inteiro, 0 ou maior.',
  dup: 'SKU repetido na planilha. Só a primeira linha com esse SKU é considerada.',
};

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
  const { can: allowInput } = useGestorAccess();
  return (
    <input
      data-stock
      inputMode="numeric"
      value={value}
      readOnly={!allowInput('estoque', 'editar')}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      {...selectOnFocus}
      onKeyDown={nextOnEnter}
      className={cn(
        'h-9 w-24 rounded-lg border bg-white px-2 text-center font-mono text-sm outline-none focus:border-[color:var(--sll-b-brand)] dark:bg-[#111524]',
        value === '' ? 'border-rose-400' : dirty ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700',
      )}
    />
  );
}

export default function StockPage() {
  const { can: allow } = useGestorAccess();
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncProducts, setSyncProducts] = useState<SyncProduct[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [transferFor, setTransferFor] = useState<{ id: string; label: string; sku: string } | null>(null);
  const [avail, setAvail] = useState<Availability>(EMPTY_AVAIL);
  const [whCount, setWhCount] = useState(1);
  const [links, setLinks] = useState<Map<string, Set<string>>>(new Map());
  const isLinked = (pid: string, ch: string) => links.get(pid)?.has(ch) ?? false;
  const hasCh = (pid: string, ch: string) => {
    const s = links.get(pid);
    return !!s && (s.has(ch) || s.has(ch.replace('_', '')));
  };
  const [activeCh, setActiveCh] = useState<ChannelKey[]>([]);
  const [chFilter, setChFilter] = useState<string>('all');

  const refreshActive = useCallback(async () => {
    if (!storeId) return;
    try {
      setActiveCh(await listActiveChannels(storeId));
    } catch (e) {
      console.warn('[Gestor] canais ativos indisponiveis', e);
    }
  }, [storeId]);

  useEffect(() => { void refreshActive(); }, [refreshActive]);

  const refreshLinks = useCallback(async () => {
    if (!storeId) return;
    try {
      const m = new Map<string, Set<string>>();
      for (const l of await listChannelLinks(storeId)) {
        const s = m.get(l.product_id) ?? new Set<string>();
        s.add(l.channel);
        m.set(l.product_id, s);
      }
      setLinks(m);
    } catch (e) {
      console.warn('[Gestor] vinculos de canal indisponiveis', e);
    }
  }, [storeId]);

  useEffect(() => { void refreshLinks(); }, [refreshLinks, items]);

  const refreshAvail = useCallback(async () => {
    if (!storeId) return;
    try {
      const [a, w] = await Promise.all([loadAvailability(storeId), listWarehouses(storeId)]);
      setAvail(a);
      setWhCount(w.filter((x) => x.active).length);
    } catch (e) {
      console.warn('[Gestor] disponibilidade por canal indisponivel', e);
    }
  }, [storeId]);

  useEffect(() => { void refreshAvail(); }, [refreshAvail, items]);
  const [impOpen, setImpOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [impResult, setImpResult] = useState<ImpResult | null>(null);
  const [showFailed, setShowFailed] = useState(false);

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
  useEffect(() => { setPage(1); }, [search, filter, chFilter]);

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
      if (chFilter === 'none') {
          if (activeCh.some((c) => hasCh(it.product.id, c))) return false;
        } else if (chFilter !== 'all' && !hasCh(it.product.id, chFilter)) return false;
        if (filter === 'with') return total > 0;
      if (filter === 'without') return total <= 0;
      if (filter === 'changed') return it.variants.some((v) => edits[v.id] !== undefined);
      return true;
    });
  }, [items, search, filter, edits, chFilter, activeCh, links]);

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
        if (isLinked(it.product.id, 'yampi')) {
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

  const applyImport = async () => {
    if (!imp || !storeId || importing) return;
    const todo = imp.filter((r) => r.status === 'change' && r.variantId && r.next !== null);
    const sameCount = imp.filter((r) => r.status === 'same').length;
    const byId = new Map<string, { it: Item; v: VariantRow }>();
    for (const it of items) for (const v of it.variants) byId.set(v.id, { it, v });

    const failed: FailRow[] = imp
      .filter((r) => r.status === 'notfound' || r.status === 'invalid' || r.status === 'dup')
      .map((r) => ({ line: r.line, sku: r.sku, label: r.label, next: r.next, reason: REASON[r.status] }));
    const saved = new Set<string>();
    let pushFailed = 0;
    let idx = 0;
    setImporting(true);

    const worker = async () => {
      while (idx < todo.length) {
        const r = todo[idx++];
        const hit = byId.get(r.variantId as string);
        const next = r.next as number;
        if (!hit) {
          failed.push({ line: r.line, sku: r.sku, label: r.label, next, reason: 'Variação não encontrada na tela. Atualize a página e importe de novo.' });
          continue;
        }
        try {
          const delta = next - hit.v.stock;
          if (delta !== 0) {
            try {
              await sb.from('product_variants').update({ sync_hold_until: new Date(Date.now() + 60000).toISOString() }).eq('id', hit.v.id);
            } catch { /* sem trava de eco: segue */ }
            const { data: balance, error } = await sb.rpc('gestor_stock_move', {
              p_variant: hit.v.id, p_type: 'adjustment', p_qty: delta, p_note: 'Importação de planilha',
            });
            if (error) throw new Error(error.message);
            if (isLinked(hit.it.product.id, 'yampi')) {
              try {
                const res: unknown = await pushStockToYampi(storeId, hit.v.sku, Number(balance ?? next));
                if (res === 'erro') pushFailed++;
              } catch { pushFailed++; }
            }
          }
          saved.add(hit.v.id);
        } catch (e) {
          failed.push({ line: r.line, sku: r.sku, label: r.label, next, reason: (e as Error).message || 'Erro ao gravar no banco.' });
        }
      }
    };

    try {
      await Promise.all([worker(), worker(), worker(), worker()]);
    } finally {
      setEdits((prev) => { const n = { ...prev }; saved.forEach((id) => delete n[id]); return n; });
      await reload();
      setImporting(false);
    }
    failed.sort((a, b) => a.line - b.line);
    setImp(null);
    setShowFailed(false);
    setImpResult({ saved: saved.size, same: sameCount, ignored: impIgnored, pushFailed, failed });
  };

  const exportFailed = async () => {
    if (!impResult) return;
    try {
      const XLSX = await import('xlsx');
      const rows: (string | number | null)[][] = [['SKU', 'Produto', 'Novo saldo', 'Linha original', 'Erro']];
      for (const r of impResult.failed) rows.push([r.sku, r.label === '-' ? '' : r.label, r.next, r.line, r.reason]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 26 }, { wch: 46 }, { wch: 13 }, { wch: 14 }, { wch: 70 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
      XLSX.writeFile(wb, `estoque-nao-carregados-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
    } catch (e) {
      console.error(e);
      showError('Não foi possível gerar a planilha.');
    }
  };

  const expandAll = () => setOpen(new Set(filtered.filter((i) => i.multi).map((i) => i.product.id)));
  const collapseAll = () => setOpen(new Set());
  const toggleOpen = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const btn = 'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--sll-b-brand)] dark:border-slate-700 dark:bg-[#1a1f2c] dark:text-slate-200';
  const selCls = cn(inputCls, '!w-auto !py-2.5 cursor-pointer');
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
      const allSel = filtered.length > 0 && filtered.every((i) => sel.has(i.product.id));
      const toggleAllSel = () => setSel(allSel ? new Set() : new Set(filtered.map((i) => i.product.id)));
      const syncIds = (ids: string[]) => {
        if (pending.length > 0) { showError('Salve ou descarte as alterações pendentes antes de sincronizar.'); return; }
        const pick = new Set(ids);
        const list: SyncProduct[] = items.filter((i) => pick.has(i.product.id)).map((i) => ({
          id: i.product.id,
          name: i.product.name,
          channels: activeCh.filter((c) => hasCh(i.product.id, c)),
          variants: i.variants.map((v) => ({ id: v.id, sku: v.sku, stock: v.stock, label: i.multi ? variantLabel(v) : '' })),
        }));
        if (!list.length) { showError('Marque ao menos um produto na lista para sincronizar.'); return; }
        setSyncProducts(list);
        setSyncOpen(true);
      };
      const syncSelected = () => syncIds(Array.from(sel));
      const showTotal = whCount > 1;
  const showCh = avail.channels.length > 0;
  const canTransfer = showTotal && allow('estoque', 'editar');
  const impCount = (s: ImpStatus) => (imp ?? []).filter((r) => r.status === s).length;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          
        </div>
        <div className="flex flex-wrap gap-2">
          <>{allow('estoque','exportar') && (<button type="button" onClick={() => void exportXlsx()} className={btn}><Download size={15} className="text-[color:var(--sll-b-brand)]" /> Baixar planilha</button>)}</>
          <>{allow('estoque','editar') && (<button type="button" onClick={() => setImpOpen(true)} className={btn}><Upload size={15} className="text-[color:var(--sll-b-brand)]" /> Importar planilha</button>)}</>
          {impOpen && <StockImportModal onClose={() => setImpOpen(false)} onPick={async (file) => { setImpOpen(false); await onFile(file); }} />}
          <button type="button" onClick={() => setHistoryOpen(true)} className={btn}><History size={15} className="text-[color:var(--sll-b-brand)]" /> Histórico de movimentações</button>
          <button type="button" onClick={() => syncSelected()} className={btn}><RefreshCw size={15} className="text-[color:var(--sll-b-brand)]" /> Sincronizar estoque</button>
              <button type="button" onClick={() => setChannelsOpen(true)} className={btn}><Settings2 size={15} className="text-[color:var(--sll-b-brand)]" /> Canais e depósitos</button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1a1f2c]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por produto, variação ou SKU..." className={cn(inputCls, 'pl-10')} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={selCls}>
              <option value="all">Todos</option>
              <option value="with">Com estoque</option>
              <option value="without">Sem estoque</option>
              <option value="changed">Só alterados</option>
            </select>
            <select value={chFilter} onChange={(e) => setChFilter(e.target.value)} className={selCls}>
                  <option value="all">Todos os canais</option>
                  {activeCh.map((c) => <option key={c} value={c}>{CHANNEL_META[c].label}</option>)}
                  <option value="none">Sem canal vinculado</option>
                </select>
                <button type="button" onClick={expandAll} className={btn}><ChevronsUpDown size={15} /> Expandir tudo</button>
            <button type="button" onClick={collapseAll} className={btn}><ChevronsDownUp size={15} /> Recolher tudo</button>
                <button type="button" onClick={toggleAllSel} className={btn}>{allSel ? 'Limpar seleção' : 'Selecionar todos'}</button>
          </div>
        </div>

        {loading || lojaLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : !storeId ? (
          <p className="py-12 text-center text-sm text-slate-500">Nenhuma loja vinculada à sua conta.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-5" />
                          <input type="checkbox" checked={allSel} onChange={toggleAllSel} title={`Selecionar todos os ${filtered.length} produtos do filtro`} className="h-4 w-4 shrink-0 cursor-pointer" />
                          <span>Produto / variação</span>
                        </div>
                      </th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Atual</th>
                      {showTotal && <th className="px-4 py-3 text-center" title="Soma de todos os depósitos ativos">Total físico</th>}
                      {showCh && <th className="px-4 py-3 text-center" title="O que cada canal exibe, já com teto e reserva">Disponível por canal</th>}
                  <th className="px-4 py-3 text-center">Novo saldo</th>
                  <th className="px-4 py-3 text-center" title="Canais ativos em que o produto está vinculado">Canais</th>
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
                              <button type="button" onClick={() => toggleOpen(it.product.id)} title={isOpen ? 'Recolher variações' : 'Ver variações'} className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800">
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            ) : <span className="inline-block w-5" />}
                            <input type="checkbox" checked={sel.has(it.product.id)} onChange={() => toggleSel(it.product.id)} title="Selecionar para sincronizar" className="h-4 w-4 shrink-0 cursor-pointer" />
                                <p className="max-w-sm truncate text-sm font-semibold text-slate-800 dark:text-white" title={it.product.name}>{it.product.name}</p>
                            {it.multi && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{it.variants.length} var.</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{single ? single.sku : it.product.sku || '—'}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-sm">{cur}</td>
                            {showTotal && <TotalCell ids={it.variants.map((x) => x.id)} avail={avail} onTransfer={canTransfer && single ? () => setTransferFor({ id: single.id, label: it.product.name, sku: single.sku }) : undefined} />}
                            {showCh && <ChannelsCell ids={it.variants.map((x) => x.id)} avail={avail} />}
                        <td className="px-4 py-2.5 text-center">
                          {single ? (
                            <StockInput value={valOf(single)} dirty={isDirty(single)} onChange={(raw) => setVal(single, raw)} />
                          ) : (
                            <span className={cn('font-mono text-sm font-bold', total !== cur ? 'text-amber-600' : 'text-slate-400')}>{total}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {activeCh.filter((c) => hasCh(it.product.id, c)).map((c) => <ChannelFavicon key={c} channel={c} size={20} />)}
                                {!activeCh.some((c) => hasCh(it.product.id, c)) && <span className="text-xs text-slate-300">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                          {allow('estoque','editar') && (
                                <button type="button" title="Sincronizar o estoque deste produto" onClick={() => syncIds([it.product.id])} className="mr-1 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800">
                                  <RefreshCw size={15} />
                                </button>
                              )}
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
                              {showTotal && <TotalCell compact ids={[v.id]} avail={avail} onTransfer={canTransfer ? () => setTransferFor({ id: v.id, label: `${it.product.name} · ${variantLabel(v)}`, sku: v.sku }) : undefined} />}
                              {showCh && <ChannelsCell compact ids={[v.id]} avail={avail} />}
                          <td className="px-4 py-2 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <StockInput value={valOf(v)} dirty={isDirty(v)} onChange={(raw) => setVal(v, raw)} />
                              {i === 0 && it.variants.length > 1 ? (
                                <>{allow('estoque','editar') && (<button type="button" title="Aplicar este valor em todas as variações" onClick={() => replicate(it)} className="cursor-pointer rounded-lg border border-[color:color-mix(in_srgb,var(--sll-b-brand)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] p-2 text-[color:var(--sll-b-brand)] hover:bg-[color:color-mix(in_srgb,var(--sll-b-brand)_20%,transparent)]">
                                  <ArrowDown size={14} />
                                </button>)}</>
                              ) : <span className="inline-block w-[34px]" />}
                            </div>
                          </td>
                          <td /><td />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={6 + (showTotal ? 1 : 0) + (showCh ? 1 : 0)} className="px-6 py-16 text-center">
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

      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      {syncOpen && storeId && <StockSyncModal storeId={storeId} products={syncProducts} activeChannels={activeCh} onClose={() => setSyncOpen(false)} onDone={() => void reload()} />}
          {sel.size > 0 && (
            <div className={cn('fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xl dark:border-slate-700 dark:bg-[#1a1f2c]', pending.length > 0 ? 'bottom-24' : 'bottom-4')}>
              <span className="text-sm font-semibold">{sel.size} selecionado(s)</span>
              <button type="button" onClick={() => setSel(new Set())} className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Limpar</button>
              <button type="button" onClick={syncSelected} className={primaryBtn}>Sincronizar estoque ({sel.size})</button>
            </div>
          )}
      {channelsOpen && storeId && <ChannelsModal storeId={storeId} onClose={() => setChannelsOpen(false)} onChanged={() => { void refreshAvail(); void refreshActive(); }} />}
      {transferFor && <TransferDialog variant={transferFor} onClose={() => setTransferFor(null)} onDone={() => void reload()} />}

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
            <Modal title="Prévia da importação" onClose={() => { if (!importing) setImp(null); }}>
              <div className="space-y-4 p-6">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <strong>{impCount('change')}</strong> vão alterar · {impCount('same')} sem mudança · {impCount('notfound') + impCount('invalid') + impCount('dup')} com problema
                  {impIgnored > 0 && <> · {impIgnored} linha(s) sem novo saldo ignoradas</>}
                </p>
                <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full table-fixed text-left text-xs">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-[24%]" />
                      <col />
                      <col className="w-12" />
                      <col className="w-12" />
                      <col className="w-[22%]" />
                    </colgroup>
                    <thead className="sticky top-0 bg-slate-50 dark:bg-[#111524]">
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-2 py-2">Lin.</th>
                        <th className="px-2 py-2">SKU</th>
                        <th className="px-2 py-2">Produto</th>
                        <th className="px-1 py-2 text-center">Atual</th>
                        <th className="px-1 py-2 text-center">Novo</th>
                        <th className="px-2 py-2">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {imp.map((r) => (
                        <tr key={r.line} className="align-top">
                          <td className="px-2 py-1.5 text-slate-400">{r.line}</td>
                          <td className="break-all px-2 py-1.5 font-mono">{r.sku}</td>
                          <td className="break-words px-2 py-1.5">{r.label}</td>
                          <td className="px-1 py-1.5 text-center font-mono">{r.current ?? '—'}</td>
                          <td className="px-1 py-1.5 text-center font-mono font-bold">{r.next ?? '—'}</td>
                          <td className={cn('break-words px-2 py-1.5 font-semibold', r.status === 'change' ? 'text-emerald-600' : r.status === 'same' ? 'text-slate-400' : 'text-rose-500')}>{STATUS_LABEL[r.status]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400">Ao clicar em Carregar, os saldos válidos são gravados na hora e entram no histórico como ajuste.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={importing} onClick={() => setImp(null)} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Cancelar</button>
                  <button type="button" disabled={importing || impCount('change') === 0} onClick={() => void applyImport()} className={primaryBtn + ' disabled:opacity-50'}>
                    {importing && <Loader2 size={15} className="mr-2 inline animate-spin" />}
                    {importing ? 'Salvando...' : `Carregar e salvar ${impCount('change')}`}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {impResult && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setImpResult(null)}>
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1f2c]"
              >
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <h2 className="text-lg font-bold">Resultado da importação</h2>
                </div>
                <div className="space-y-4 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
                      <p className="text-3xl font-extrabold text-emerald-600">{impResult.saved}</p>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">carregado(s) com sucesso</p>
                    </div>
                    <div className={cn('rounded-xl p-4 text-center', impResult.failed.length ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-[#111524]')}>
                      <p className={cn('text-3xl font-extrabold', impResult.failed.length ? 'text-rose-600' : 'text-slate-400')}>{impResult.failed.length}</p>
                      <p className={cn('text-xs font-semibold', impResult.failed.length ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400')}>não carregado(s)</p>
                    </div>
                  </div>
                  {(impResult.same > 0 || impResult.ignored > 0 || impResult.pushFailed > 0) && (
                    <ul className="space-y-1 text-xs text-slate-500">
                      {impResult.same > 0 && <li>{impResult.same} linha(s) já estavam com esse saldo (sem mudança).</li>}
                      {impResult.ignored > 0 && <li>{impResult.ignored} linha(s) sem "Novo saldo" foram ignoradas.</li>}
                      {impResult.pushFailed > 0 && <li className="font-semibold text-amber-600">O saldo foi salvo no ERP, mas o envio à Yampi falhou em {impResult.pushFailed} item(ns).</li>}
                    </ul>
                  )}
                  {impResult.failed.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setShowFailed((v) => !v)} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-[color:var(--sll-b-brand)] dark:border-slate-700">
                          {showFailed ? 'Ocultar lista' : `Ver os ${impResult.failed.length} não carregados`}
                        </button>
                        <button type="button" onClick={() => void exportFailed()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-[color:var(--sll-b-brand)] dark:border-slate-700">
                          <Download size={15} className="text-[color:var(--sll-b-brand)]" /> Baixar lista com erros
                        </button>
                      </div>
                      {showFailed && (
                        <div className="max-h-[40vh] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full table-fixed text-left text-xs">
                            <colgroup>
                              <col className="w-10" />
                              <col className="w-[26%]" />
                              <col />
                            </colgroup>
                            <thead className="sticky top-0 bg-slate-50 dark:bg-[#111524]">
                              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="px-2 py-2">Lin.</th>
                                <th className="px-2 py-2">SKU / Produto</th>
                                <th className="px-2 py-2">Erro</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {impResult.failed.map((r, i) => (
                                <tr key={`${r.line}-${i}`} className="align-top">
                                  <td className="px-2 py-1.5 text-slate-400">{r.line}</td>
                                  <td className="break-all px-2 py-1.5">
                                    <span className="font-mono">{r.sku}</span>
                                    {r.label !== '-' && <span className="block break-words text-[10px] text-slate-400">{r.label}</span>}
                                  </td>
                                  <td className="break-words px-2 py-1.5 font-semibold text-rose-500">{r.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400">A planilha de erros usa as mesmas colunas (SKU e Novo saldo). Corrija e importe de novo.</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                  <button type="button" onClick={() => setImpResult(null)} className={primaryBtn}>Fechar</button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}