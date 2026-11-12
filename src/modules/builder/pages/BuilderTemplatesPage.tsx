import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ImagePlus, LayoutTemplate } from 'lucide-react';
import { createPageFromContent } from '../services/pages';
import { listTemplates } from '../services/templates';
import { PRESETS } from '../templates/presets';
import { PRESETS_MEDIA } from '../templates/presets-media';
import type { PageContent } from '../types';

type Item = {
  id: string; name: string; category: string | null; type: 'landing' | 'product';
  swatch?: string[]; getContent: () => PageContent;
};

const T_SUB = 'Comece de um modelo pronto e personalize no editor.';
const T_LOADING = 'Carregando modelos...';
const T_NAME = 'Nome da nova p\u00e1gina';
const T_IMG = 'Caminho ou URL da imagem (ex.: /assets/templates/arquivo.jpg). Vazio = padr\u00e3o.';
const KEY = 'sll-builder-tpl-thumbs';

const readThumbs = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};
const defaultThumb = (id: string) => `/assets/templates/${id.replace('preset:', '')}.jpg`;

const presetItems: Item[] = [...PRESETS, ...PRESETS_MEDIA].map((p) => ({
  id: p.id, name: p.name, category: p.category, type: p.type, swatch: p.swatch, getContent: p.build,
}));

function Card({ t, thumb, busy, onUse, onThumb }: { t: Item; thumb: string; busy: boolean; onUse: () => void; onThumb: () => void }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [thumb]);
  const [c1, c2, c3] = t.swatch ?? ['#0f172a', '#0094eb', '#1e293b'];
  return (
    <div className="group flex flex-col gap-2">
      <p className="truncate text-sm font-bold text-slate-700">{t.name}</p>
      <button type="button" onClick={onUse} disabled={busy}
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
        {failed ? (
          <div className="flex h-full w-full items-center justify-center transition-transform duration-500 ease-out group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c3})` }}>
            <span className="px-4 text-center text-lg font-extrabold" style={{ color: c2 }}>{t.name}</span>
          </div>
        ) : (
          <img src={thumb} alt={t.name} loading="lazy" onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-bold text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          {busy ? 'Criando...' : 'Usar este modelo'}
        </span>
      </button>
      <div className="flex items-center justify-center gap-5 text-xs font-semibold text-slate-400">
        <button type="button" onClick={onUse} className="flex items-center gap-1 hover:text-[#0094eb]"><Eye className="h-4 w-4" /> Usar</button>
        <button type="button" onClick={onThumb} className="flex items-center gap-1 hover:text-[#0094eb]"><ImagePlus className="h-4 w-4" /> Imagem</button>
      </div>
    </div>
  );
}

export default function BuilderTemplatesPage() {
  const navigate = useNavigate();
  const [db, setDb] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>(readThumbs);

  useEffect(() => {
    listTemplates()
      .then((rows) => setDb(rows.map((t) => ({ id: t.id, name: t.name, category: t.category, type: t.type, getContent: () => t.content }))))
      .catch((e) => { setError((e as Error).message); setDb([]); });
  }, []);

  function setThumb(t: Item) {
    const cur = thumbs[t.id] || defaultThumb(t.id);
    const v = window.prompt(T_IMG, cur);
    if (v === null) return;
    const next = { ...thumbs };
    if (v.trim()) next[t.id] = v.trim(); else delete next[t.id];
    localStorage.setItem(KEY, JSON.stringify(next));
    setThumbs(next);
  }

  async function use(t: Item) {
    const title = window.prompt(T_NAME, t.name);
    if (!title) return;
    setBusy(t.id);
    try {
      const page = await createPageFromContent(title, t.type, t.getContent());
      navigate(`/dashboard/modules/builder/${page.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const items = [...presetItems, ...(db ?? [])];

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0094eb]/10"><LayoutTemplate className="h-7 w-7 text-[#0094eb]" /></div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Templates</h1>
          <p className="text-sm text-slate-500">{T_SUB}</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {db === null && <p className="text-sm text-slate-500">{T_LOADING}</p>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id} t={t} thumb={thumbs[t.id] || defaultThumb(t.id)} busy={busy === t.id}
            onUse={() => use(t)} onThumb={() => setThumb(t)} />
        ))}
      </div>
    </div>
  );
}