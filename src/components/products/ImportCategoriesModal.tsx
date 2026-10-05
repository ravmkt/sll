import { useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { addCategory, normCat } from '@/services/productsService';
import {
  CategoryFieldInfo, fetchFeedText, listFeedCategories, parseXmlFeed, saveCategoryField, scanCategoryFields,
} from '@/lib/products/xmlFeed';

interface Props {
  storeId: string;
  existingNames: string[];
  onChanged: () => void;
  onClose: () => void;
}

export default function ImportCategoriesModal({ storeId, existingNames, onChanged, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [raw, setRaw] = useState('');
  const [fields, setFields] = useState<CategoryFieldInfo[]>([]);
  const [field, setField] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const existing = useMemo(() => new Set(existingNames.map(normCat)), [existingNames]);
  const cats = useMemo(() => (raw && field ? listFeedCategories(parseXmlFeed(raw, field)) : []), [raw, field]);

  const choose = (f: string, text: string) => {
    setField(f);
    const list = listFeedCategories(parseXmlFeed(text, f));
    setPicked(new Set(list.filter(c => !existing.has(normCat(c.name))).map(c => c.name)));
  };

  const load = async () => {
    setBusy(true);
    setMsg('');
    try {
      const text = file ? await file.text() : await fetchFeedText(url.trim());
      const found = scanCategoryFields(text);
      if (!found.length) throw new Error('Nenhum campo de categoria encontrado neste XML.');
      setRaw(text);
      setFields(found);
      choose(found[0].field, text);
    } catch (e: any) {
      setMsg(e?.message || 'Erro ao ler o XML.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (name: string) => {
    const next = new Set(picked);
    if (next.has(name)) next.delete(name); else next.add(name);
    setPicked(next);
  };

  const create = async () => {
    setBusy(true);
    setMsg('');
    let ok = 0;
    for (const name of Array.from(picked)) {
      try { await addCategory(storeId, name); ok++; } catch { /* ja existe */ }
    }
    saveCategoryField(storeId, field);
    onChanged();
    setBusy(false);
    setMsg(`${ok} categoria(s) criada(s). Agora importe os produtos.`);
    setPicked(new Set());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Importar categorias do XML</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4 text-sm">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={!!file}
            placeholder="URL do feed XML"
            className="w-full rounded-md border px-3 py-2 bg-transparent"
          />
          <input type="file" accept=".xml,text/xml" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-xs" />
          <button
            onClick={load}
            disabled={busy || (!file && !url.trim())}
            className="inline-flex items-center gap-2 rounded-md bg-[#0094eb] px-3 py-2 text-white hover:bg-[#007bc4] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Ler categorias
          </button>

          {fields.length > 0 && (
            <>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Campo do XML usado como categoria</label>
                <select value={field} onChange={e => choose(e.target.value, raw)} className="w-full rounded-md border px-3 py-2 bg-transparent">
                  {fields.map(f => (
                    <option key={f.field} value={f.field}>
                      {f.field} ({f.distinct}) — ex.: {f.sample.join(' | ').slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{cats.length} categoria(s) no feed</span>
                <button
                  className="text-[#0094eb] hover:underline"
                  onClick={() => setPicked(picked.size ? new Set() : new Set(cats.filter(c => !existing.has(normCat(c.name))).map(c => c.name)))}
                >
                  {picked.size ? 'Desmarcar todas' : 'Marcar novas'}
                </button>
              </div>

              <ul className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
                {cats.map(c => {
                  const exists = existing.has(normCat(c.name));
                  return (
                    <li key={c.name} className="flex items-center gap-2">
                      <input type="checkbox" disabled={exists} checked={picked.has(c.name)} onChange={() => toggle(c.name)} />
                      <span className={exists ? 'text-slate-400' : ''}>{c.name}</span>
                      <span className="ml-auto text-xs text-slate-400">{exists ? 'já existe' : `${c.count} produto(s)`}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {msg && <p className="rounded-md bg-[#0094eb]/10 px-3 py-2 text-xs">{msg}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-md border px-3 py-2 text-sm">Fechar</button>
          <button
            onClick={create}
            disabled={busy || picked.size === 0}
            className="rounded-md bg-[#0094eb] px-3 py-2 text-sm text-white hover:bg-[#007bc4] disabled:opacity-50"
          >
            Criar {picked.size} categoria(s)
          </button>
        </div>
      </div>
    </div>
  );
}