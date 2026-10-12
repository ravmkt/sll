import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Loader2, Package, Search, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputCls } from '@/components/products/Modal';
import type { MeasureModel } from '@/services/sizingModelsService';

type SortKey = 'name' | 'title' | 'type' | 'linked';

interface Props {
  models: MeasureModel[];
  linked: Set<string>;
  loading: boolean;
  onEdit: (m: MeasureModel) => void;
  onDelete: (m: MeasureModel) => void;
  onBulkDelete: (ids: string[]) => void;
}

const selectCls = cn(inputCls, '!w-auto !py-2.5 cursor-pointer');

export default function MedidasList({ models, linked, loading, onEdit, onDelete, onBulkDelete }: Props) {
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('all');
  const [fLink, setFLink] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [asc, setAsc] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setPage(1); }, [search, fType, fLink, pageSize]);
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(models.map((m) => m.id));
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [models]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = models.filter(
      (m) =>
        (!q || m.name.toLowerCase().includes(q) || (m.title || '').toLowerCase().includes(q)) &&
        (fType === 'all' || m.type === fType) &&
        (fLink === 'all' || (fLink === 'linked' ? linked.has(m.id) : !linked.has(m.id)))
    );
    if (!sortKey) return list;
    const val = (m: MeasureModel): string | number =>
      sortKey === 'linked' ? (linked.has(m.id) ? 1 : 0) : String(m[sortKey] || '');
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return asc ? r : -r;
    });
  }, [models, linked, search, fType, fLink, sortKey, asc]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allOnPage = pageItems.length > 0 && pageItems.every((m) => selected.has(m.id));
  const allFiltered = sorted.length > 0 && sorted.every((m) => selected.has(m.id));

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc);
    else { setSortKey(k); setAsc(true); }
  };
  const togglePage = () =>
    setSelected((prev) => { const n = new Set(prev); pageItems.forEach((m) => (allOnPage ? n.delete(m.id) : n.add(m.id))); return n; });
  const toggleOne = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const th = (k: SortKey, label: string, cls?: string) => (
    <th onClick={() => sortBy(k)} className={cn('cursor-pointer select-none px-4 py-3', cls)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0094eb]" /></div>;
  }

  if (models.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
        <Package size={40} className="mx-auto mb-3 text-slate-400" />
        <p className="font-bold">Nenhum perfil de medidas cadastrado.</p>
        <p className="mt-1 text-xs text-slate-500">Clique em "Novo" para criar o primeiro perfil da sua loja.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] p-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou título..." className={cn(inputCls, 'pl-10')} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={fType} onChange={(e) => setFType(e.target.value)} className={selectCls}>
            <option value="all">Todos os tipos</option>
            <option value="humano">Humano</option>
            <option value="objeto">Objeto</option>
          </select>
          <select value={fLink} onChange={(e) => setFLink(e.target.value)} className={selectCls}>
            <option value="all">Todos (vínculo)</option>
            <option value="linked">Vinculados</option>
            <option value="unlinked">Não vinculados</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111524] p-3 sm:flex-row">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
          <span>{sorted.length} {sorted.length === 1 ? 'medida encontrada' : 'medidas encontradas'}</span>
          {selected.size > 0 && <span className="rounded-full bg-[#0094eb]/10 px-3 py-0.5 text-[#0094eb]">{selected.size} selecionadas</span>}
          {selected.size > 0 && !allFiltered && (
            <button type="button" onClick={() => setSelected(new Set(sorted.map((m) => m.id)))} className="text-[#0094eb] underline cursor-pointer">Selecionar todas as {sorted.length}</button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button type="button" onClick={() => onBulkDelete(Array.from(selected))} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 cursor-pointer">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="w-12 px-4 py-3 text-center"><input type="checkbox" checked={allOnPage} onChange={togglePage} className="h-4 w-4 cursor-pointer" /></th>
              {th('name', 'Nome')}
              {th('title', 'Título')}
              {th('type', 'Tipo', 'text-center')}
              {th('linked', 'Vinculado', 'text-center')}
              <th className="w-28 px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">Nenhuma medida encontrada com esses filtros.</td></tr>
            )}
            {pageItems.map((m) => {
              const isLinked = linked.has(m.id);
              return (
                <tr key={m.id} className={cn('transition-colors', selected.has(m.id) ? 'bg-[#0094eb]/5' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]')}>
                  <td className="px-4 py-3 text-center"><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleOne(m.id)} className="h-4 w-4 cursor-pointer" /></td>
                  <td className="px-4 py-3">
                    <p className="max-w-xs truncate text-sm font-semibold text-slate-800 dark:text-white" title={m.name}>{m.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-xs truncate text-sm text-slate-500 dark:text-slate-400" title={m.title || ''}>{m.title || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#111524] px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {m.type === 'objeto' ? <Package size={11} className="text-[#0094eb]" /> : <User size={11} className="text-[#0094eb]" />}
                      {m.type === 'objeto' ? 'Objeto' : 'Humano'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('inline-flex h-7 min-w-[110px] items-center justify-center rounded-lg border text-[10px] font-bold uppercase', isLinked ? 'border-[#0094eb]/30 bg-[#0094eb]/10 text-[#0094eb]' : 'border-slate-200 dark:border-slate-700 text-slate-400')}>
                      {isLinked ? 'Vinculado' : 'Não vinculado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" title="Editar" onClick={() => onEdit(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0094eb] dark:hover:bg-slate-800 cursor-pointer"><Edit3 size={15} /></button>
                      <button type="button" title="Excluir" onClick={() => onDelete(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 cursor-pointer"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Página {safePage} de {pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer">Anterior</button>
            <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}