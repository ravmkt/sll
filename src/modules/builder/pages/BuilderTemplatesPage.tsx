import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Package } from 'lucide-react';
import { createPageFromContent } from '../services/pages';
import { listTemplates } from '../services/templates';
import { PRESETS } from '../templates/presets';
import type { PageContent } from '../types';

type Item = {
  id: string; name: string; category: string | null; type: 'landing' | 'product';
  description?: string; swatch?: string[]; getContent: () => PageContent;
};

const T_TITLE = 'Comece de um modelo pronto e personalize no editor.';
const T_LOADING = 'Carregando modelos...';
const T_NAME = 'Nome da nova p\u00e1gina';
const T_PRODUCT = 'P\u00e1gina de produto';

const presetItems: Item[] = PRESETS.map((p) => ({
  id: p.id, name: p.name, category: p.category, type: p.type, description: p.description, swatch: p.swatch, getContent: p.build,
}));

export default function BuilderTemplatesPage() {
  const navigate = useNavigate();
  const [db, setDb] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then((rows) => setDb(rows.map((t) => ({ id: t.id, name: t.name, category: t.category, type: t.type, getContent: () => t.content }))))
      .catch((e) => { setError((e as Error).message); setDb([]); });
  }, []);

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
          <p className="text-sm text-slate-500">{T_TITLE}</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {db === null && <p className="text-sm text-slate-500">{T_LOADING}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <div key={t.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10">
                {t.type === 'landing' ? <LayoutTemplate className="h-5 w-5 text-[#0094eb]" /> : <Package className="h-5 w-5 text-[#0094eb]" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400">{t.type === 'landing' ? 'Landing' : T_PRODUCT}{t.category ? ` \u00b7 ${t.category}` : ''}</p>
                {t.description && <p className="mt-1 text-xs text-slate-500">{t.description}</p>}
              </div>
            </div>
            {t.swatch && (
              <div className="flex gap-1.5">
                {t.swatch.map((c, i) => (
                  <span key={i} className="h-5 w-5 rounded-full border border-slate-200" style={{ background: c }} />
                ))}
              </div>
            )}
            <button onClick={() => use(t)} disabled={busy === t.id}
              className="rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0083d1] disabled:opacity-50">
              {busy === t.id ? 'Criando...' : 'Usar este modelo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}