import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, Link as LinkIcon, Loader2, Upload } from 'lucide-react';
import { ImportItem, ImportSummary, addCategory, categoryLeaf, importProducts, listCategories, normCat, normalizeSku } from '@/services/productsService';
import { fetchFeedText, getSavedCategoryField, listFeedCategories, parseXmlFeed, saveCategoryField, scanCategoryFields, type CategoryFieldInfo } from '@/lib/products/xmlFeed';
import { SHEET_TEMPLATE_CSV, parseSheet } from '@/lib/products/sheet';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Modal, errMsg, fileCls, ghostBtn, inputCls, labelCls, primaryBtn } from './Modal';

type Props = { storeId: string; onClose: () => void; onImported: () => void };

const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const tabCls = (on: boolean) =>
  cn('flex-1 py-3 text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition',
    on ? 'border-b-2 border-[#0094eb] text-[#0094eb]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300');

export default function ImportModal({ storeId, onClose, onImported }: Props) {
  const [tab, setTab] = useState<'xml' | 'sheet'>('xml');
  const [stage, setStage] = useState<'input' | 'preview' | 'report'>('input');
  const [url, setUrl] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<ImportSummary | null>(null);
  const [raw, setRaw] = useState('');
  const [fields, setFields] = useState<CategoryFieldInfo[]>([]);
  const [field, setField] = useState('');
  const [existingCats, setExistingCats] = useState<string[]>([]);
  const [skipCats, setSkipCats] = useState<Set<string>>(new Set());
  const [catsOpen, setCatsOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .map((it, i) => ({ it, i, sku: normalizeSku(it.sku) }))
      .filter((r) => (cat === 'all' || (r.it.category || 'Sem categoria') === cat) && (!q || r.it.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)));
  }, [items, search, cat]);
  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category || 'Sem categoria'))).sort(), [items]);
  const feedCats = useMemo(() => listFeedCategories(items), [items]);
  const existingSet = useMemo(() => new Set(existingCats.map(normCat)), [existingCats]);
  const nExist = feedCats.filter((c) => existingSet.has(normCat(c.name))).length;
  const nSkip = feedCats.filter((c) => !existingSet.has(normCat(c.name)) && skipCats.has(normCat(c.name))).length;
  const nCreate = feedCats.length - nExist - nSkip;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(page, pages);
  const pageRows = rows.slice((safePage - 1) * size, safePage * size);
  const allVisible = pageRows.length > 0 && pageRows.every((r) => selected.has(r.i));
  const withSku = items.map((it, i) => ({ i, ok: !!normalizeSku(it.sku) })).filter((r) => r.ok).map((r) => r.i);

  const setMany = (idx: number[], on: boolean) =>
    setSelected((prev) => { const n = new Set(prev); idx.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });

  const read = async () => {
    setBusy(true);
    try {
      let list: ImportItem[];
      if (tab === 'xml') {
        if (!url.trim() && !xmlFile) throw new Error('Informe a URL do feed ou escolha um arquivo XML.');
        setMsg('Lendo e interpretando o XML...');
        const text = xmlFile ? await xmlFile.text() : await fetchFeedText(url.trim());
            const found = scanCategoryFields(text);
            const saved = getSavedCategoryField(storeId);
            const chosenField = found.find((x) => x.field === saved)?.field || found[0]?.field || '';
            setRaw(text); setFields(found); setField(chosenField);
            list = parseXmlFeed(text, chosenField || undefined);
      } else {
        if (!sheetFile) throw new Error('Escolha um arquivo CSV ou XLSX.');
        setMsg('Lendo a planilha...');
        list = await parseSheet(sheetFile);
      }
      if (!list.length) throw new Error('Nenhum produto foi reconhecido.');
      setExistingCats((await listCategories(storeId)).map((c) => c.name)); setSkipCats(new Set()); setItems(list); setSelected(new Set()); setSearch(''); setCat('all'); setPage(1);
      setStage('preview');
      showSuccess(`${list.length} produtos encontrados.`);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false); setMsg('');
    }
  };

  const run = async () => {
    const chosen = items
      .filter((_, i) => selected.has(i))
      .map((it) => (skipCats.has(normCat(categoryLeaf(it.category || ''))) ? { ...it, category: '' } : it));
    if (!chosen.length) return showError('Selecione ao menos um produto.');
    setBusy(true);
    try {
      const toCreate = new Map<string, string>();
          chosen.forEach((it) => {
            const n = categoryLeaf(it.category || '');
            if (n && !existingSet.has(normCat(n))) toCreate.set(normCat(n), n);
          });
          for (const n of toCreate.values()) { try { await addCategory(storeId, n); } catch { /* ja existe */ } }
          if (tab === 'xml' && field) saveCategoryField(storeId, field);
          const summary = await importProducts(storeId, chosen, tab === 'xml' ? 'xml' : 'planilha', (d, t) => setMsg(`Importando ${d} de ${t}...`));
      setReport(summary);
      setStage('report');
      if (summary.imported > 0) showSuccess(`${summary.imported} produto(s) importado(s).`);
      else showError('Nenhum produto foi importado.');
      onImported();
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false); setMsg('');
    }
  };

  const template = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + SHEET_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }));
    a.download = 'modelo-produtos.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Modal title="Importar produtos" onClose={onClose} wide>
      {stage === 'input' && (
        <>
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setTab('xml')} className={tabCls(tab === 'xml')}><FileText size={14} /> XML</button>
            <button type="button" onClick={() => setTab('sheet')} className={tabCls(tab === 'sheet')}><Upload size={14} /> Planilha</button>
          </div>
          {tab === 'xml' ? (
            <div className="p-6 space-y-5">
              <div>
                <label className={labelCls}>URL do feed XML</label>
                <div className="relative mt-2">
                  <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sualoja.com/feed.xml" className={cn(inputCls, 'pl-10')} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                <span className="text-xs font-semibold uppercase text-slate-400">ou</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div>
                <label className={labelCls}>Arquivo XML</label>
                <input type="file" accept=".xml" onChange={(e) => setXmlFile(e.target.files?.[0] || null)} className={cn(fileCls, 'mt-2 block')} />
              </div>
              <button type="button" onClick={read} disabled={busy} className={cn(primaryBtn, 'w-full')}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> {msg}</> : 'Ler feed XML'}
              </button>
              <p className="text-xs text-slate-400">Somente produtos com SKU (campo mpn) são importados.</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div>
                <label className={labelCls}>Arquivo CSV ou XLSX</label>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setSheetFile(e.target.files?.[0] || null)} className={cn(fileCls, 'mt-2 block')} />
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111524] p-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-white">Baixar modelo</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Colunas: nome, sku, categoria, preco, link, imagem_url, descricao. O SKU é obrigatório.</p>
                <button type="button" onClick={template} className={cn(ghostBtn, 'mt-3 !py-1.5 !text-xs')}>Baixar modelo CSV</button>
              </div>
              <button type="button" onClick={read} disabled={busy || !sheetFile} className={cn(primaryBtn, 'w-full')}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> {msg}</> : 'Ler planilha'}
              </button>
            </div>
          )}
        </>
      )}

      {stage === 'preview' && (
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{items.length} produtos encontrados ({withSku.length} com SKU)</p>
              {selected.size > 0 && <p className="mt-0.5 text-xs font-semibold text-[#0094eb]">{selected.size} selecionados</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input placeholder="Buscar nome ou SKU..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className={cn(inputCls, '!w-48 !py-1.5 !text-xs')} />
              <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className={cn(inputCls, '!w-auto !py-1.5 !text-xs cursor-pointer')}>
                <option value="all">Todas categorias</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} className={cn(inputCls, '!w-auto !py-1.5 !text-xs cursor-pointer')}>
                <option value={10}>10 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
          </div>
          {tab === 'xml' && fields.length > 1 && (
                <div>
                  <label className={labelCls}>Campo do XML usado como categoria</label>
                  <select
                    value={field}
                    onChange={(e) => { setField(e.target.value); setItems(parseXmlFeed(raw, e.target.value)); setSkipCats(new Set()); setCat('all'); setPage(1); }}
                    className={cn(inputCls, 'mt-2 !py-1.5 !text-xs cursor-pointer')}
                  >
                    {fields.map((f) => <option key={f.field} value={f.field}>{f.field} ({f.distinct}) - ex.: {f.sample.join(' | ').slice(0, 60)}</option>)}
                  </select>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111524] px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-white">Categorias: {feedCats.length}</span>
                  <span className="text-slate-400">{nExist} já existem · {nCreate} serão criadas · {nSkip} ignoradas</span>
                  <button type="button" onClick={() => setCatsOpen((o) => !o)} className="ml-auto font-semibold text-[#0094eb] cursor-pointer">{catsOpen ? 'Ocultar' : 'Revisar'}</button>
                </div>
                {catsOpen && (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
                      <button type="button" onClick={() => setSkipCats(new Set(feedCats.filter((c) => !existingSet.has(normCat(c.name))).map((c) => normCat(c.name))))} className="text-amber-600 underline cursor-pointer">Ignorar novas</button>
                      <button type="button" onClick={() => setSkipCats(new Set())} className="text-[#0094eb] underline cursor-pointer">Criar novas</button>
                      <span className="ml-auto font-normal text-slate-400">Azul: criar · Cinza: já existe · Riscada: ignorada</span>
                    </div>
                    <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
                      {feedCats.map((c) => {
                        const k = normCat(c.name);
                        const exists = existingSet.has(k);
                        const skip = skipCats.has(k);
                        return (
                          <button
                            key={k}
                            type="button"
                            disabled={exists}
                            onClick={() => setSkipCats((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                            className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                              exists ? 'border-slate-200 text-slate-400' : skip ? 'border-amber-300 text-amber-600 line-through cursor-pointer' : 'border-[#0094eb]/40 text-[#0094eb] cursor-pointer')}
                          >
                            {c.name} · {c.count}
                          </button>
                        );
                      })}
                      {feedCats.length === 0 && <span className="text-xs text-slate-400">Nenhuma categoria no arquivo. Os produtos entram sem categoria.</span>}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={allVisible} onChange={(e) => setMany(pageRows.filter((r) => r.sku).map((r) => r.i), e.target.checked)} className="h-3.5 w-3.5" />
              Selecionar visíveis
            </label>
            <button type="button" onClick={() => setMany(withSku, true)} className="text-[#0094eb] underline cursor-pointer">Selecionar todos com SKU ({withSku.length})</button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-slate-400 underline cursor-pointer">Limpar seleção</button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#111524] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="w-8 px-3 py-2"></th>
                  <th className="px-3 py-2 font-semibold">Produto</th>
                  <th className="px-3 py-2 font-semibold">SKU</th>
                  <th className="px-3 py-2 font-semibold">Preço</th>
                  <th className="px-3 py-2 font-semibold">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageRows.map((r) => (
                  <tr key={r.i} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2">
                      <input type="checkbox" disabled={!r.sku} checked={selected.has(r.i)} onChange={(e) => setMany([r.i], e.target.checked)} className="h-3.5 w-3.5" />
                    </td>
                    <td className="max-w-[260px] truncate px-3 py-2 font-semibold text-slate-700 dark:text-white">{r.it.name}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{r.sku || <span className="font-semibold text-rose-500">sem SKU</span>}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{brl(r.it.price)}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{categoryLeaf(r.it.category || '') || 'Sem categoria'}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Nenhum produto com esses filtros.</td></tr>}
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
            <button type="button" disabled={busy} onClick={() => { setStage('input'); setItems([]); setSelected(new Set()); }} className={cn(ghostBtn, 'flex-1')}>Voltar</button>
            <button type="button" onClick={run} disabled={busy || selected.size === 0} className={cn(primaryBtn, 'flex-1')}>
              {busy ? <><Loader2 size={14} className="animate-spin" /> {msg}</> : `Importar${selected.size ? ` (${selected.size})` : ''}`}
            </button>
          </div>
        </div>
      )}

      {stage === 'report' && report && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#0094eb]/10 dark:bg-[#0094eb]/10 p-4">
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
      )}
    </Modal>
  );
}