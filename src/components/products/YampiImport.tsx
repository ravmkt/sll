import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { addCategory, listCategories, normCat, type ImportSummary } from '@/services/productsService';
import { fetchYampi, getYampiStatus, importYampiProducts, saveYampiCredentials, type YampiProduct } from '@/services/yampiService';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { errMsg, ghostBtn, inputCls, labelCls, primaryBtn } from './Modal';

type Props = { storeId: string; onClose: () => void; onImported: () => void };

const viewCls = (on: boolean) =>
  cn('flex-1 py-2 text-xs font-semibold cursor-pointer transition border-b-2',
    on ? 'border-[#0094eb] text-[#0094eb]' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300');

export default function YampiImport({ storeId, onClose, onImported }: Props) {
  const [phase, setPhase] = useState<'boot' | 'connect' | 'ready' | 'preview' | 'report'>('boot');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [alias, setAlias] = useState('');
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [products, setProducts] = useState<YampiProduct[]>([]);
  const [inactive, setInactive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [override, setOverride] = useState<Record<string, string>>({});
  const [existingCats, setExistingCats] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'main' | 'review'>('main');
  const [cat, setCat] = useState('all');
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<ImportSummary | null>(null);

  useEffect(() => {
    getYampiStatus(storeId)
      .then((s) => { setAlias(s.alias || ''); setPhase(s.connected ? 'ready' : 'connect'); })
      .catch(() => setPhase('connect'));
  }, [storeId]);

  const q = search.trim().toLowerCase();
  const base = useMemo(() => products.filter((p) => (inactive || p.active) && (!q || p.name.toLowerCase().includes(q))), [products, inactive, q]);
  const nMain = base.filter((p) => p.tier !== 'loose').length;
  const nReview = base.filter((p) => p.tier === 'loose').length;
  const pool = useMemo(
    () => base.filter((p) => (view === 'review' ? p.tier === 'loose' : p.tier !== 'loose' && (cat === 'all' || (p.category || 'Sem categoria') === cat))),
    [base, view, cat],
  );
  const mainCats = useMemo(
    () => Array.from(new Set(products.filter((p) => p.tier !== 'loose').map((p) => p.category || 'Sem categoria'))).sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const catOptions = useMemo(
    () => Array.from(new Set([...existingCats, ...products.map((p) => p.category).filter(Boolean)])).sort((a, b) => a.localeCompare(b)),
    [existingCats, products],
  );
  const nInactive = products.filter((p) => !p.active).length;
  const nVariants = products.filter((p) => selected.has(p.id)).reduce((a, p) => a + p.skus.length, 0);
  const pages = Math.max(1, Math.ceil(pool.length / size));
  const safePage = Math.min(page, pages);
  const pageRows = pool.slice((safePage - 1) * size, safePage * size);
  const allVisible = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id));

  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => { const n = new Set(prev); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });

  const toggleInactive = (on: boolean) => {
    setInactive(on);
    toggle(products.filter((p) => !p.active && p.tier !== 'loose').map((p) => p.id), on);
    setPage(1);
  };

  const connect = async () => {
    setBusy(true);
    try {
      await saveYampiCredentials(storeId, alias, token, secret);
      setToken(''); setSecret('');
      setPhase('ready');
      showSuccess('Yampi conectada.');
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const load = async () => {
    setBusy(true); setMsg('Buscando produtos na Yampi...');
    try {
      const [res, cats] = await Promise.all([fetchYampi(storeId), listCategories(storeId)]);
      setExistingCats(cats.map((c) => c.name));
      setProducts(res.products);
      setSelected(new Set(res.products.filter((p) => p.tier !== 'loose' && p.active).map((p) => p.id)));
      setInactive(false); setOverride({}); setSearch(''); setView('main'); setCat('all'); setPage(1);
      setPhase('preview');
      showSuccess(`${res.products.length} produtos encontrados.`);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false); setMsg('');
    }
  };

  const run = async () => {
    const chosen = products
      .filter((p) => selected.has(p.id))
      .map((p) => ({ ...p, category: p.tier === 'loose' ? override[p.id] || '' : p.category }));
    if (!chosen.length) return showError('Selecione ao menos um produto.');
    setBusy(true);
    try {
      const have = new Set(existingCats.map(normCat));
      const toCreate = new Map<string, string>();
      chosen.forEach((p) => { if (p.category && !have.has(normCat(p.category))) toCreate.set(normCat(p.category), p.category); });
      for (const n of toCreate.values()) { try { await addCategory(storeId, n); } catch { /* ja existe */ } }
      const summary = await importYampiProducts(storeId, chosen, (d, t) => setMsg(`Importando ${d} de ${t}...`));
      setReport(summary);
      setPhase('report');
      if (summary.imported > 0) showSuccess(`${summary.imported} produto(s) importado(s).`);
      else showError('Nenhum produto foi importado.');
      onImported();
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false); setMsg('');
    }
  };

  if (phase === 'boot') return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>;

  if (phase === 'connect') {
    return (
      <div className="p-6 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Informe as credenciais de API da Yampi (Alias, User-Token e User-Secret-Key). Elas ficam guardadas apenas no servidor.
        </p>
        <div><label className={labelCls}>Alias da loja</label><input value={alias} onChange={(e) => setAlias(e.target.value)} className={cn(inputCls, 'mt-2')} /></div>
        <div><label className={labelCls}>User-Token</label><input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" className={cn(inputCls, 'mt-2')} /></div>
        <div><label className={labelCls}>User-Secret-Key</label><input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" className={cn(inputCls, 'mt-2')} /></div>
        <button type="button" onClick={connect} disabled={busy} className={cn(primaryBtn, 'w-full')}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Validando...</> : 'Conectar Yampi'}
        </button>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-white">Yampi conectada: {alias}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Os produtos vêm com as variações (tamanho etc.) agrupadas e a categoria real de cada um.</p>
        <button type="button" onClick={load} disabled={busy} className={cn(primaryBtn, 'w-full')}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> {msg}</> : 'Buscar produtos da Yampi'}
        </button>
        <button type="button" onClick={() => setPhase('connect')} className="w-full text-xs font-semibold text-slate-400 underline cursor-pointer">Trocar credenciais</button>
      </div>
    );
  }

  if (phase === 'report' && report) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-[#0094eb]/10 p-4">
          <CheckCircle2 className="text-[#0094eb]" />
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{report.imported} produto(s) importado(s)</p>
        </div>
        {report.discarded.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-amber-600">{report.discarded.length} descartado(s)</p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.discarded.map((d, i) => (
                    <tr key={i}>
                      <td className="max-w-[300px] truncate px-3 py-2 font-semibold text-slate-700 dark:text-white">{d.name}</td>
                      <td className="px-3 py-2 text-slate-500">{d.sku || '-'}</td>
                      <td className="px-3 py-2 text-amber-600">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-end"><button type="button" onClick={onClose} className={primaryBtn}>Fechar</button></div>
      </div>
    );
  }

  const isReview = view === 'review';

  return (
    <div className="p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{products.length} produtos na Yampi</p>
          <p className="mt-0.5 text-xs font-semibold text-[#0094eb]">
            {selected.size > 0 ? `${selected.size} selecionados · ${nVariants} variações` : 'Nenhum selecionado'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" checked={inactive} onChange={(e) => toggleInactive(e.target.checked)} className="h-3.5 w-3.5" />
          Incluir inativos ({nInactive})
        </label>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => { setView('main'); setPage(1); }} className={viewCls(!isReview)}>Produtos ({nMain})</button>
        <button type="button" onClick={() => { setView('review'); setPage(1); }} className={viewCls(isReview)}>Revisar ({nReview})</button>
      </div>

      {isReview && (
        <p className="text-[11px] text-amber-600">Só têm categoria solta (ex.: ESTAMPADO). Não entram por padrão: marque os que quiser e escolha a categoria de destino.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input placeholder="Buscar produto..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className={cn(inputCls, '!w-48 !py-1.5 !text-xs')} />
        {!isReview && (
          <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className={cn(inputCls, '!w-auto !py-1.5 !text-xs cursor-pointer')}>
            <option value="all">Todas categorias</option>
            {mainCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} className={cn(inputCls, '!w-auto !py-1.5 !text-xs cursor-pointer ml-auto')}>
          <option value={10}>10 por pág.</option>
          <option value={50}>50 por pág.</option>
          <option value={100}>100 por pág.</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" checked={allVisible} onChange={(e) => toggle(pageRows.map((p) => p.id), e.target.checked)} className="h-3.5 w-3.5" />
          Selecionar visíveis
        </label>
        <button type="button" onClick={() => toggle(pool.map((p) => p.id), true)} className="text-[#0094eb] underline cursor-pointer">Selecionar todos ({pool.length})</button>
        <button type="button" onClick={() => setSelected(new Set())} className="text-slate-400 underline cursor-pointer">Limpar seleção</button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#111524] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2 font-semibold">Produto</th>
              <th className="px-3 py-2 font-semibold">Var.</th>
              <th className="px-3 py-2 font-semibold">Categoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageRows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-3 py-1.5">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} className="h-3.5 w-3.5" />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    {p.image
                      ? <img src={p.image} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-md object-cover" />
                      : <div className="h-8 w-8 shrink-0 rounded-md bg-slate-100 dark:bg-slate-800" />}
                    <div className="min-w-0">
                      <p className="max-w-[230px] truncate font-semibold text-slate-700 dark:text-white">
                        {p.name}{!p.active && <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-500">inativo</span>}
                      </p>
                      {isReview && <p className="text-[10px] text-slate-400">{p.loose.join(', ')}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{p.skus.length}</td>
                <td className="px-3 py-1.5">
                  {isReview ? (
                    <select value={override[p.id] || ''} onChange={(e) => setOverride((prev) => ({ ...prev, [p.id]: e.target.value }))} className={cn(inputCls, '!w-40 !py-1 !text-xs cursor-pointer')}>
                      <option value="">Sem categoria</option>
                      {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">{p.category || 'Sem categoria'}</span>
                  )}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">Nenhum produto com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="font-semibold text-[#0094eb] disabled:opacity-30 cursor-pointer">← Anterior</button>
          <span className="text-slate-400">{safePage} / {pages}</span>
          <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="font-semibold text-[#0094eb] disabled:opacity-30 cursor-pointer">Próximo →</button>
        </div>
      )}

      <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" disabled={busy} onClick={() => setPhase('ready')} className={cn(ghostBtn, 'flex-1')}>Voltar</button>
        <button type="button" onClick={run} disabled={busy || selected.size === 0} className={cn(primaryBtn, 'flex-1')}>
          {busy ? <><Loader2 size={14} className="animate-spin" /> {msg}</> : `Importar${selected.size ? ` (${selected.size})` : ''}`}
        </button>
      </div>
    </div>
  );
}