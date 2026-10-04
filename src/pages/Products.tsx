import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Loader2, Package, Plus, Search, Tag, Trash2, Upload } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useLoja } from '@/contexts/LojaContext';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import {
  CatalogCategory,
  CatalogProduct,
  deleteProducts,
  listCategories,
  listProducts,
  setProductActive,
} from '@/services/productsService';
import ProductFormModal from '@/components/products/ProductFormModal';
import CategoriesModal from '@/components/products/CategoriesModal';
import ImportModal from '@/components/products/ImportModal';
import { inputCls } from '@/components/products/Modal';

type SortKey = 'name' | 'price' | 'category' | 'origin' | 'active';
const ORIGIN: Record<string, string> = { manual: 'Manual', xml: 'XML', planilha: 'Planilha' };
const brl = (n: number | null) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const selectCls = cn(inputCls, '!w-auto !py-2.5 cursor-pointer');

export default function Products() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fOrigin, setFOrigin] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [asc, setAsc] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [del, setDel] = useState<{ ids: string[]; label: string } | null>(null);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const [p, c] = await Promise.all([listProducts(storeId), listCategories(storeId)]);
      setProducts(p);
      setCategories(c);
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
      showError('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);
  useEffect(() => { setPage(1); }, [search, fCat, fStatus, fOrigin, pageSize]);

  const categoryNames = useMemo(
    () => Array.from(new Set([...categories.map((c) => c.name), ...products.map((p) => p.category || '').filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [categories, products]
  );

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) &&
        (fCat === 'all' || p.category === fCat) &&
        (fStatus === 'all' || (fStatus === 'active' ? !!p.active : !p.active)) &&
        (fOrigin === 'all' || p.origin === fOrigin)
    );
    if (!sortKey) return list;
    const val = (p: CatalogProduct): string | number =>
      sortKey === 'price' ? Number(p.price || 0) : sortKey === 'active' ? (p.active ? 1 : 0) : String(p[sortKey] || '');
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return asc ? r : -r;
    });
  }, [products, search, fCat, fStatus, fOrigin, sortKey, asc]);

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

  const Th = ({ k, label, cls }: { k: SortKey; label: string; cls?: string }) => (
    <th onClick={() => sortBy(k)} className={cn('cursor-pointer select-none px-4 py-3', cls)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Base central de produtos, compartilhada com todos os seus módulos SLL.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#0094eb] hover:bg-[#007bc4] px-4 py-2.5 text-sm font-semibold text-white transition cursor-pointer">
              <Plus size={16} /> Novo produto
            </button>
            <button type="button" onClick={() => setCatsOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0094eb] transition cursor-pointer">
              <Tag size={15} className="text-[#0094eb]" /> Categorias
            </button>
            <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0094eb] transition cursor-pointer">
              <Upload size={15} className="text-[#0094eb]" /> Importar produtos
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] p-5">
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
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls}>
                <option value="all">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Desativados</option>
              </select>
              <select value={fOrigin} onChange={(e) => setFOrigin(e.target.value)} className={selectCls}>
                <option value="all">Todas origens</option>
                <option value="manual">Manual</option>
                <option value="xml">XML</option>
                <option value="planilha">Planilha</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111524] p-3 sm:flex-row">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <span>{sorted.length} {sorted.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</span>
              {selected.size > 0 && <span className="rounded-full bg-[#0094eb]/10 px-3 py-0.5 text-[#0094eb]">{selected.size} selecionados</span>}
              {selected.size > 0 && !allFiltered && (
                <button type="button" onClick={() => setSelected(new Set(sorted.map((p) => p.id)))} className="text-[#0094eb] underline cursor-pointer">Selecionar todos os {sorted.length}</button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selected.size > 0 && (
                <button type="button" onClick={() => setDel({ ids: Array.from(selected), label: `${selected.size} ${selected.size === 1 ? 'produto' : 'produtos'}` })} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 cursor-pointer">
                  <Trash2 size={14} /> Excluir {selected.size}
                </button>
              )}
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

          {loading || lojaLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0094eb]" /></div>
          ) : !storeId ? (
            <p className="py-12 text-center text-sm text-slate-500">Nenhuma loja vinculada à sua conta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="w-12 px-4 py-3 text-center"><input type="checkbox" checked={allOnPage} onChange={togglePage} className="h-4 w-4 cursor-pointer" /></th>
                    <th className="w-20 px-4 py-3 text-center">Foto</th>
                    <Th k="name" label="Produto" />
                    <Th k="price" label="Preço" cls="text-center" />
                    <Th k="category" label="Categoria" cls="text-center" />
                    <Th k="origin" label="Origem" cls="text-center" />
                    <Th k="active" label="Status" cls="text-center" />
                    <th className="w-28 px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageItems.map((p) => (
                    <tr key={p.id} className={cn('transition-colors', selected.has(p.id) ? 'bg-[#0094eb]/5' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]')}>
                      <td className="px-4 py-3 text-center"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 cursor-pointer" /></td>
                      <td className="px-4 py-3">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#111524]">
                          {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Package size={18} className="text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs truncate text-sm font-semibold text-slate-800 dark:text-white" title={p.name}>{p.name}</p>
                        {p.sku && <p className="text-[11px] text-slate-400">SKU {p.sku}</p>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-800 dark:text-white">{brl(p.price)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-lg bg-slate-100 dark:bg-[#111524] px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <Tag size={11} className="shrink-0 text-[#0094eb]" />
                          <span className="truncate">{p.category || 'Sem categoria'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{ORIGIN[p.origin || ''] ?? (p.origin || '—')}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button type="button" onClick={() => toggleStatus(p)} className={cn('h-7 w-[100px] rounded-lg border text-[10px] font-bold uppercase cursor-pointer transition', p.active ? 'border-[#0094eb]/30 bg-[#0094eb]/10 text-[#0094eb] dark:border-[#0094eb]/30 dark:bg-[#0094eb]/10 dark:text-[#0094eb]' : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400')}>
                          {p.active ? 'Ativo' : 'Desativado'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" title="Editar" onClick={() => { setEditing(p); setFormOpen(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0094eb] dark:hover:bg-slate-800 cursor-pointer"><Edit3 size={15} /></button>
                          <button type="button" title="Excluir" onClick={() => setDel({ ids: [p.id], label: `"${p.name}"` })} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 cursor-pointer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
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

      {formOpen && storeId && (
        <ProductFormModal storeId={storeId} product={editing} categories={categoryNames} onClose={() => setFormOpen(false)} onSaved={reload} />
      )}
      {catsOpen && storeId && (
        <CategoriesModal storeId={storeId} categories={categories} onChanged={reload} onClose={() => setCatsOpen(false)} />
      )}
      {importOpen && storeId && (
        <ImportModal storeId={storeId} onImported={reload} onClose={() => setImportOpen(false)} />
      )}
      <ConfirmDeleteDialog
        isOpen={!!del}
        title="Excluir produtos"
        message={del ? `Tem certeza que deseja excluir ${del.label}? Esta ação não pode ser desfeita.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDel(null)}
      />
    </DashboardLayout>
  );
}