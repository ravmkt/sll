import PageTour from '@/components/tour/PageTour';
import { produtosTour } from '@/tours/produtosTour';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  BadgeCheck, Ban, ChevronDown, ChevronRight, ChevronUp, Edit3, Link2, List, ListTree, Loader2,
  Globe, Package, PackageX, Plus, RefreshCw, Search, Tag, Trash2, Upload,
} from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import {
  CatalogCategory,
  CatalogProduct,
  deleteProducts,
  listCategories,
  listProducts,
  setProductActive,
  listLinkedProductIds,
} from '@/services/productsService';
import ProductFormDialog from '@/shared/products/ProductFormDialog';
import CategoriesModal from '@/components/products/CategoriesModal';
import ImportModal from '@/components/products/ImportModal';
import StockEditDialog from '@/components/products/StockEditDialog';
import { Modal, inputCls } from '@/components/products/Modal';
import { listChannelLinks } from '@/modules/gestor/services/vinculos';
import { CHANNEL_META, listActiveChannels } from '@/modules/gestor/services/canais';
import type { ChannelKey } from '@/modules/gestor/services/canais';
import ChannelFavicon, { normChannel } from '@/modules/gestor/components/ChannelFavicon';
import ProductChannelsPanel from '@/modules/gestor/components/ProductChannelsPanel';
import ChannelsBulkDialog from '@/modules/gestor/components/ChannelsBulkDialog';
import { listStock } from '@/services/productVariantsService';
import { syncYampi } from '@/services/yampiSyncService';
import { hasRealVariants, listVariantsByProduct, variantLabel } from '@/components/products/variantsData';
import type { VariantRow } from '@/components/products/variantsData';

type SortKey = 'name' | 'price' | 'category' | 'origin' | 'active' | 'stock';
type StockFilter = 'all' | 'with' | 'without' | 'nocontrol';
type ViewMode = 'parents' | 'expanded';

const VIEW_KEY = 'sll_products_view';
const brl = (n: number | null) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const selectCls = cn(inputCls, '!w-auto !py-2.5 cursor-pointer');

const TONES = {
  slate: { box: 'bg-slate-100 text-slate-500 dark:bg-slate-800' },
  emerald: { box: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' },
  rose: { box: 'bg-rose-50 text-rose-500 dark:bg-rose-950/30' },
  sky: { box: 'bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)] dark:bg-[color:var(--sll-b-brand-soft)]' },
  amber: { box: 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' },
} as const;

function MetricCard({ icon: Icon, label, value, tone, active, loading, onClick }: {
  icon: ElementType; label: string; value: number; tone: keyof typeof TONES; active: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Clique para filtrar a lista"
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-2xl border bg-white p-5 text-left transition hover:shadow-md dark:bg-[#1a1f2c]',
        active ? 'border-2 border-[color:var(--sll-b-brand)]' : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', TONES[tone].box)}><Icon size={22} /></span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="block text-2xl font-bold text-slate-800 dark:text-white">{loading ? '—' : value}</span>
      </span>
    </button>
  );
}

type CatalogPerms = { create: boolean; edit: boolean; remove: boolean; stock: boolean; importar: boolean };
const ALL_PERMS: CatalogPerms = { create: true, edit: true, remove: true, stock: true, importar: true };

export default function ProductsCatalog({ mode = 'hub', perms = ALL_PERMS }: { mode?: 'hub' | 'gestor'; perms?: CatalogPerms }) {
  const isGestor = mode === 'gestor';
  const { storeId, loading: lojaLoading } = useLoja();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fOrigin, setFOrigin] = useState('all');
  const [fStock, setFStock] = useState<StockFilter>('all');
  const [fLinked, setFLinked] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [asc, setAsc] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [view, setView] = useState<ViewMode>(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'expanded' ? 'expanded' : 'parents'; } catch { return 'parents'; }
  });
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [del, setDel] = useState<{ ids: string[]; label: string } | null>(null);
  const [stock, setStock] = useState<Map<string, number>>(new Map());
  const [variants, setVariants] = useState<Map<string, VariantRow[]>>(new Map());
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [stockProduct, setStockProduct] = useState<CatalogProduct | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [chLinks, setChLinks] = useState<Map<string, { channel: ChannelKey; published: boolean }[]>>(new Map());
  const [activeCh, setActiveCh] = useState<ChannelKey[]>([]);
  const [fChannel, setFChannel] = useState('all');
  const [chProduct, setChProduct] = useState<CatalogProduct | null>(null);
  const [bulkChOpen, setBulkChOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const [p, c, st, lk, vs] = await Promise.all([
        listProducts(storeId),
        listCategories(storeId),
        listStock(storeId).catch(() => new Map<string, number>()),
        listLinkedProductIds(storeId).catch(() => new Set<string>()),
        listVariantsByProduct(storeId).catch(() => new Map<string, VariantRow[]>()),
      ]);
      setProducts(p);
      setCategories(c);
      setStock(st);
      setLinked(lk);
      setVariants(vs);
      try {
        const [lk2, act] = await Promise.all([listChannelLinks(storeId), listActiveChannels(storeId)]);
        const m = new Map<string, { channel: ChannelKey; published: boolean }[]>();
        for (const l of lk2) {
          const ch = normChannel(l.channel);
          if (!ch) continue;
          const arr = m.get(l.product_id) ?? [];
          if (!arr.some((a) => a.channel === ch)) arr.push({ channel: ch, published: l.published });
          m.set(l.product_id, arr);
        }
        setChLinks(m);
        setActiveCh(act);
      } catch (e) {
        console.warn('[Produtos] canais indisponiveis', e);
      }
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
      showError('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);
  useEffect(() => { setPage(1); }, [search, fCat, fStatus, fOrigin, fStock, fLinked, fChannel, pageSize]);

  const changeView = (v: ViewMode) => {
    setView(v);
    setToggled(new Set());
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignora */ }
  };
  const isOpen = (id: string) => (view === 'expanded') !== toggled.has(id);
  const toggleRow = (id: string) =>
    setToggled((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const metrics = useMemo(() => {
    const active = products.filter((p) => !!p.active).length;
    return {
      total: products.length,
      active,
      inactive: products.length - active,
      linked: products.filter((p) => linked.has(p.id)).length,
      nostock: products.filter((p) => stock.has(p.id) && (stock.get(p.id) || 0) <= 0).length,
    };
  }, [products, linked, stock]);

  const isTotalOn = fStatus === 'all' && fStock === 'all' && !fLinked;
  const cardTotal = () => { setFStatus('all'); setFStock('all'); setFLinked(false); };
  const cardStatus = (s: 'active' | 'inactive') => { setFLinked(false); setFStock('all'); setFStatus(fStatus === s ? 'all' : s); };
  const cardLinked = () => { setFStatus('all'); setFStock('all'); setFLinked(!fLinked); };
  const cardNoStock = () => { setFStatus('all'); setFLinked(false); setFStock(fStock === 'without' ? 'all' : 'without'); };

  const categoryNames = useMemo(
    () => Array.from(new Set([...categories.map((c) => c.name), ...products.map((p) => p.category || '').filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [categories, products]
  );

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const stockOk = (p: CatalogProduct) => {
      if (fStock === 'all') return true;
      if (fStock === 'nocontrol') return !stock.has(p.id);
      const s = stock.get(p.id);
      if (s === undefined) return false;
      return fStock === 'with' ? s > 0 : s <= 0;
    };
    const list = products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) ||
          (variants.get(p.id) ?? []).some((v) => v.sku.toLowerCase().includes(q))) &&
        (fCat === 'all' || p.category === fCat) &&
        (fStatus === 'all' || (fStatus === 'active' ? !!p.active : !p.active)) &&
        (fOrigin === 'all' || p.origin === fOrigin) &&
        (!fLinked || linked.has(p.id)) &&
            (fChannel === 'all' || (fChannel === 'none' ? !(chLinks.get(p.id)?.length) : !!chLinks.get(p.id)?.some((x) => x.channel === fChannel))) &&
        stockOk(p)
    );
    if (!sortKey) return list;
    const val = (p: CatalogProduct): string | number =>
      sortKey === 'price'
        ? Number(p.price || 0)
        : sortKey === 'stock'
          ? (stock.has(p.id) ? Number(stock.get(p.id)) : -1)
          : sortKey === 'active'
            ? (p.active ? 1 : 0)
            : String(p[sortKey] || '');
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return asc ? r : -r;
    });
  }, [products, variants, search, fCat, fStatus, fOrigin, fStock, fLinked, fChannel, chLinks, linked, stock, sortKey, asc]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allOnPage = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const allFiltered = sorted.length > 0 && sorted.every((p) => selected.has(p.id));

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc);
    else { setSortKey(k); setAsc(true); }
  };
  const togglePage = () =>
    setSelected((prev) => { const n = new Set(prev); pageItems.forEach((p) => (allOnPage ? n.delete(p.id) : n.add(p.id))); return n; });
  const toggleOne = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toggleStatus = async (p: CatalogProduct) => {
    if (!storeId) return;
    const next = !p.active;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: next } : x)));
    try {
      await setProductActive(storeId, p.id, next);
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: p.active } : x)));
      showError('Erro ao alterar status do produto.');
    }
  };

  const confirmDelete = async () => {
    if (!del || !storeId) return;
    try {
      await deleteProducts(storeId, del.ids);
      const gone = new Set(del.ids);
      setProducts((prev) => prev.filter((p) => !gone.has(p.id)));
      setSelected(new Set());
      showSuccess(del.ids.length === 1 ? 'Produto removido.' : `${del.ids.length} produtos removidos.`);
    } catch (e) {
      console.error(e);
      showError('Erro ao remover produto(s).');
    } finally {
      setDel(null);
    }
  };

  const syncOne = async (p: CatalogProduct) => {
    if (!storeId) return;
    setSyncingId(p.id);
    try {
      const r = await syncYampi(storeId, p.id);
      await reload();
      showSuccess(r.variants_updated || r.prices_updated ? 'Produto sincronizado com a Yampi.' : 'Produto já estava atualizado.');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao sincronizar.');
    } finally {
      setSyncingId(null);
    }
  };

  const openEdit = (p: CatalogProduct) => { if (!perms.edit) return; setEditing(p); setFormOpen(true); };

  const Th = ({ k, label, cls }: { k: SortKey; label: string; cls?: string }) => (
    <th onClick={() => sortBy(k)} className={cn('cursor-pointer select-none px-4 py-3', cls)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  const stockBtn = (p: CatalogProduct, n: number) => (
    <button
      type="button"
      onClick={() => { if (perms.stock) setStockProduct(p); }}
      title="Editar estoque"
      className={cn('cursor-pointer rounded-lg px-2.5 py-1 font-mono text-xs font-bold', n > 0 ? 'bg-slate-100 text-slate-700 dark:bg-[#111524] dark:text-white' : 'bg-rose-50 text-rose-600')}
    >
      {n}
    </button>
  );

  const viewBtn = (v: ViewMode, Icon: ElementType, title: string) => (
    <button
      type="button"
      title={title}
      onClick={() => changeView(v)}
      className={cn('cursor-pointer rounded-lg p-1.5 transition', view === v ? 'bg-[color:var(--sll-b-brand)] text-white' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700')}
    >
      <Icon size={16} />
    </button>
  );

  const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[color:var(--sll-b-brand)] transition cursor-pointer';
  const mLoading = loading || lojaLoading;

  return (
    <>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {!isGestor && <PageTour tourKey="produtos" steps={produtosTour} />}
            <h1 className={isGestor ? 'hidden' : 'text-2xl font-bold tracking-tight'}>{isGestor ? 'Produtos' : 'Catálogo de Produtos'}</h1>
            {!isGestor && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Base central de produtos, compartilhada com todos os seus módulos SLL.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <>{perms.create && (<button type="button" data-tour="prod-novo" onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--sll-b-brand-hover)]">
              <Plus size={16} /> Novo produto
            </button>)}</>
            <>{perms.edit && !isGestor && (<button type="button" data-tour="prod-categorias" onClick={() => setCatsOpen(true)} className={btnGhost}>
              <Tag size={15} className="text-[color:var(--sll-b-brand)]" /> Categorias
            </button>)}</>
            <>{perms.importar && (<button type="button" data-tour="prod-importar" onClick={() => setImportOpen(true)} className={btnGhost}>
              <Upload size={15} className="text-[color:var(--sll-b-brand)]" /> Importar produtos
            </button>)}</>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard icon={Package} label="Total de produtos" value={metrics.total} tone="slate" active={isTotalOn} loading={mLoading} onClick={cardTotal} />
          <MetricCard icon={BadgeCheck} label="Ativos" value={metrics.active} tone="emerald" active={fStatus === 'active'} loading={mLoading} onClick={() => cardStatus('active')} />
          <MetricCard icon={Ban} label="Inativos" value={metrics.inactive} tone="rose" active={fStatus === 'inactive'} loading={mLoading} onClick={() => cardStatus('inactive')} />
          <MetricCard icon={Link2} label="Vinculados a vídeo" value={metrics.linked} tone="sky" active={fLinked} loading={mLoading} onClick={cardLinked} />
          <MetricCard icon={PackageX} label="Sem estoque" value={metrics.nostock} tone="amber" active={fStock === 'without'} loading={mLoading} onClick={cardNoStock} />
        </div>

        <div data-tour="prod-lista" className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." className={cn(inputCls, 'pl-10')} />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={selectCls}>
                <option value="all">Todas categorias</option>
                {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={fStock} onChange={(e) => setFStock(e.target.value as StockFilter)} className={selectCls}>
                <option value="all">Todo estoque</option>
                <option value="with">Com estoque</option>
                <option value="without">Sem estoque</option>
                <option value="nocontrol">Sem controle</option>
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls}>
                <option value="all">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Desativados</option>
              </select>
              <select value={fChannel} onChange={(e) => setFChannel(e.target.value)} className={selectCls}>
                    <option value="all">Todos canais</option>
                    {activeCh.map((ch) => <option key={ch} value={ch}>{CHANNEL_META[ch].label}</option>)}
                    <option value="none">Sem canal</option>
                  </select>
                  <select value={fOrigin} onChange={(e) => setFOrigin(e.target.value)} className={selectCls}>
                <option value="all">Todas origens</option>
                <option value="manual">Manual</option>
                <option value="xml">XML</option>
                <option value="yampi">Yampi</option>
                <option value="planilha">Planilha</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111524] p-3 sm:flex-row">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <span>{sorted.length} {sorted.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</span>
              {fLinked && <span className="rounded-full bg-[color:var(--sll-b-brand-soft)] px-3 py-0.5 text-[color:var(--sll-b-brand)]">Vinculados a vídeo</span>}
              {selected.size > 0 && <span className="rounded-full bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] px-3 py-0.5 text-[color:var(--sll-b-brand)]">{selected.size} selecionados</span>}
              {selected.size > 0 && !allFiltered && (
                <button type="button" onClick={() => setSelected(new Set(sorted.map((p) => p.id)))} className="text-[color:var(--sll-b-brand)] underline cursor-pointer">Selecionar todos os {sorted.length}</button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selected.size > 0 && (
                <>{perms.remove && (<button type="button" onClick={() => setDel({ ids: Array.from(selected), label: `${selected.size} ${selected.size === 1 ? 'produto' : 'produtos'}` })} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 cursor-pointer">
                  <Trash2 size={14} /> Excluir {selected.size}
                </button>)}</>
              )}
              {perms.edit && (
                        <button
                          type="button"
                          title="Marque os produtos na lista e vincule todos de uma vez"
                          onClick={() => {
                            if (selected.size === 0) { showError('Marque os produtos na lista (caixinha à esquerda) e clique de novo.'); return; }
                            setBulkChOpen(true);
                          }}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[color:var(--sll-b-brand-hover)]"
                        >
                          <Globe size={14} /> Vincular a canais{selected.size > 0 ? ' (' + selected.size + ')' : ''}
                        </button>
                      )}
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {viewBtn('parents', List, 'Só produtos (variações recolhidas)')}
                {viewBtn('expanded', ListTree, 'Produtos com variações expandidas')}
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Itens por página
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className={cn(inputCls, '!w-auto !py-1 !text-xs cursor-pointer')}>
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>
          </div>

          {mLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
          ) : !storeId ? (
            <p className="py-12 text-center text-sm text-slate-500">Nenhuma loja vinculada à sua conta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="w-12 px-4 py-3 text-center"><input type="checkbox" checked={allOnPage} onChange={togglePage} className="h-4 w-4 cursor-pointer" /></th>
                    <th className="w-20 px-4 py-3 text-center">Foto</th>
                    <Th k="name" label="Produto" cls="sll-left" />
                    <Th k="stock" label="Estoque" cls="text-center" />
                    <Th k="price" label="Preço" cls="text-center" />
                    <Th k="category" label="Categoria" cls="text-center" />
                        <th className="px-4 py-3 text-center">Canais</th>
                    <Th k="active" label="Status" cls="text-center" />
                    <th className="w-36 px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageItems.map((p) => {
                    const vs = variants.get(p.id);
                    const expandable = hasRealVariants(vs);
                    const open = expandable && isOpen(p.id);
                    return (
                      <Fragment key={p.id}>
                        <tr className={cn('transition-colors', selected.has(p.id) ? 'bg-[color:color-mix(in_srgb,var(--sll-b-brand)_5%,transparent)]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]')}>
                          <td className="px-4 py-3 text-center"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 cursor-pointer" /></td>
                          <td className="px-4 py-3">
                            <div role="button" tabIndex={0} title="Editar produto" onClick={() => openEdit(p)} className="mx-auto flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#111524] hover:border-[color:var(--sll-b-brand)] transition">
                              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Package size={18} className="text-slate-400" />}
                            </div>
                          </td>
                          <td className="sll-left px-4 py-3">
                            <div className="flex items-center gap-2">
                              {expandable ? (
                                <button type="button" onClick={() => toggleRow(p.id)} title={open ? 'Recolher variações' : `Ver ${vs!.length} variações`} className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800">
                                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              ) : <span className="inline-block w-5" />}
                              <div className="min-w-0">
                                <p onClick={() => openEdit(p)} className="max-w-xs cursor-pointer truncate text-sm font-semibold text-slate-800 hover:text-[color:var(--sll-b-brand)] dark:text-white" title={p.name}>{p.name}</p>
                                {p.sku && <p className="text-[11px] text-slate-400">SKU {p.sku}</p>}
                              </div>
                              {expandable && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{vs!.length} var.</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {stock.has(p.id) ? stockBtn(p, stock.get(p.id) || 0) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-800 dark:text-white">{brl(p.price)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-lg bg-slate-100 dark:bg-[#111524] px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              <Tag size={11} className="shrink-0 text-[color:var(--sll-b-brand)]" />
                              <span className="truncate">{p.category || 'Sem categoria'}</span>
                            </span>
                          </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  disabled={!perms.edit}
                                  onClick={() => setChProduct(p)}
                                  title="Escolher canais de venda"
                                  className="mx-auto flex min-h-[28px] cursor-pointer flex-wrap items-center justify-center gap-1 rounded-lg px-1.5 py-1 hover:bg-slate-100 disabled:cursor-default dark:hover:bg-slate-800"
                                >
                                  {(chLinks.get(p.id) ?? []).map((x) => <ChannelFavicon key={x.channel} channel={x.channel} pending={!x.published} />)}
                                  {!(chLinks.get(p.id)?.length) && <span className="text-xs text-slate-300">—</span>}
                                </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => toggleStatus(p)} disabled={!perms.edit} className={cn('h-7 w-[100px] rounded-lg border text-[10px] font-bold uppercase cursor-pointer transition', p.active ? 'border-[color:color-mix(in_srgb,var(--sll-b-brand)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--sll-b-brand)_10%,transparent)] text-[color:var(--sll-b-brand)]' : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400')}>
                              {p.active ? 'Ativo' : 'Desativado'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {p.origin === 'yampi' && (
                                <>{perms.edit && (<button type="button" onClick={() => syncOne(p)} disabled={syncingId === p.id} title="Sincronizar este produto" className="mr-1 cursor-pointer text-slate-400 hover:text-[color:var(--sll-b-brand)] disabled:opacity-50">
                                  {syncingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                </button>)}</>
                              )}
                              <>{perms.edit && (<button type="button" title="Vincular a canais de venda" onClick={() => setChProduct(p)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800"><Globe size={15} /></button>)}</>
                                  <>{perms.edit && (<button type="button" title="Editar" onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800 cursor-pointer"><Edit3 size={15} /></button>)}</>
                              <>{perms.remove && (<button type="button" title="Excluir" onClick={() => setDel({ ids: [p.id], label: `"${p.name}"` })} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 cursor-pointer"><Trash2 size={15} /></button>)}</>
                            </div>
                          </td>
                        </tr>
                        {open && vs!.map((v) => (
                          <tr key={v.id} className="bg-slate-50/70 dark:bg-white/[0.02]">
                            <td />
                            <td />
                            <td className="sll-left py-2 pl-12 pr-4">
                              <div className="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                                <p className="max-w-xs truncate text-xs font-semibold text-slate-700 dark:text-slate-200" title={variantLabel(v)}>{variantLabel(v)}</p>
                                <p className="text-[10px] text-slate-400">SKU {v.sku}</p>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">{stockBtn(p, v.stock)}</td>
                            <td className="px-4 py-2 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{v.price != null ? brl(v.price) : '—'}</td>
                            <td colSpan={4} />
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <Package size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum produto encontrado</p>
                        <p className="mt-1 text-xs text-slate-400">{products.length ? 'Tente ajustar os filtros.' : 'Clique em "Novo produto" ou "Importar produtos" para começar.'}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row">
              <p className="text-xs text-slate-400">Página {safePage} de {pages}</p>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer">Anterior</button>
                <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer">Próximo</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {storeId && (
        <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} storeId={storeId} productId={editing?.id ?? null} onSaved={() => void reload()} />
      )}
      {catsOpen && storeId && (
        <CategoriesModal storeId={storeId} categories={categories} onChanged={reload} onClose={() => setCatsOpen(false)} />
      )}
      {importOpen && storeId && (
        <ImportModal storeId={storeId} onImported={reload} onClose={() => setImportOpen(false)} />
      )}
      {chProduct && storeId && (
            <Modal title={`Canais: ${chProduct.name}`} onClose={() => setChProduct(null)}>
              <div className="p-6">
                <ProductChannelsPanel storeId={storeId} productId={chProduct.id} onChanged={() => void reload()} />
              </div>
            </Modal>
          )}
          {bulkChOpen && storeId && (
            <ChannelsBulkDialog storeId={storeId} productIds={Array.from(selected)} onClose={() => setBulkChOpen(false)} onDone={() => void reload()} />
          )}
          <ConfirmDeleteDialog
        isOpen={!!del}
        title="Excluir produtos"
        message={del ? `Tem certeza que deseja excluir ${del.label}? Esta ação não pode ser desfeita.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDel(null)}
      />
      {stockProduct && storeId && (
        <StockEditDialog
          key={stockProduct.id}
          storeId={storeId}
          product={{ id: stockProduct.id, name: stockProduct.name, origin: stockProduct.origin }}
          variants={variants.get(stockProduct.id) ?? []}
          onSaved={reload}
          onClose={() => setStockProduct(null)}
        />
      )}
    </>
  );
}