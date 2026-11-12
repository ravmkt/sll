import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Package } from 'lucide-react';
import { createPageFromContent } from '../services/pages';
import { listTemplates, type BuilderTemplate } from '../services/templates';

export default function BuilderTemplatesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BuilderTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listTemplates().then(setItems).catch((e) => { setError((e as Error).message); setItems([]); });
  }, []);

  async function use(t: BuilderTemplate) {
    const title = window.prompt('Nome da nova página', t.name);
    if (!title) return;
    setBusy(t.id);
    try {
      const page = await createPageFromContent(title, t.type, t.content);
      navigate(`/dashboard/modules/builder/${page.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0094eb]/10"><LayoutTemplate className="h-7 w-7 text-[#0094eb]" /></div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Templates</h1>
          <p className="text-sm text-slate-500">Comece de um modelo pronto e personalize no editor.</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {items === null ? (
        <p className="text-sm text-slate-500">Carregando modelos...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">Nenhum modelo disponível ainda.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <div key={t.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10">
                  {t.type === 'landing' ? <LayoutTemplate className="h-5 w-5 text-[#0094eb]" /> : <Package className="h-5 w-5 text-[#0094eb]" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.type === 'landing' ? 'Landing' : 'Página de produto'}{t.category ? ` · ${t.category}` : ''}</p>
                </div>
              </div>
              <button onClick={() => use(t)} disabled={busy === t.id}
                className="rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0083d1] disabled:opacity-50">
                {busy === t.id ? 'Criando...' : 'Usar este modelo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}