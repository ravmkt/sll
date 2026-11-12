import StorageUsageCard from '@/components/billing/StorageUsageCard';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, LayoutTemplate, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { createPage, deletePage, listPages } from '../services/pages';
import { getPublishedUrl } from '../services/publish';
import type { BuilderPage } from '../types';

export default function BuilderListPage() {
  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listPages().then(setPages).catch((e) => setError(e.message));
  }, []);

  async function handleDelete(p: BuilderPage) {
    if (!window.confirm(`Excluir a página "${p.title}"? Essa ação não pode ser desfeita e o link /${p.slug} sai do ar.`)) return;
    try {
      await deletePage(p.id);
      setPages((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleOpen(p: BuilderPage) {
    try {
      const url = await getPublishedUrl(p.id);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCreate(type: 'landing' | 'product') {
    const title = window.prompt('Nome da página');
    if (!title) return;
    try {
      const page = await createPage(title, type);
      navigate(`/dashboard/modules/builder/${page.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 font-sans text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0094eb]/10">
            <LayoutTemplate className="h-7 w-7 text-[#0094eb]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Landing Pages e Páginas de Produto</h1>
            <p className="text-sm text-slate-500">Crie e publique páginas de campanha no domínio da sua loja.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleCreate('landing')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0083d1]"
          >
            <Plus className="h-4 w-4" /> Nova Landing
          </button>
          <button
            onClick={() => handleCreate('product')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Package className="h-4 w-4" /> Nova Página de Produto
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <StorageUsageCard />

      <div className="space-y-3">
        {pages.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10">
                {p.type === 'landing' ? <LayoutTemplate className="h-5 w-5 text-[#0094eb]" /> : <Package className="h-5 w-5 text-[#0094eb]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-bold text-slate-900">{p.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      p.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.status === 'published' ? 'Publicada' : 'Rascunho'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {p.type === 'landing' ? 'Landing' : 'Página de produto'} · /{p.slug}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {p.status === 'published' && (
                <button
                  onClick={() => handleOpen(p)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </button>
              )}
              <Link
                to={`/dashboard/modules/builder/${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Link>
              <button onClick={() => handleDelete(p)} aria-label="Excluir" className="rounded-xl p-2 text-rose-500 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {pages.length === 0 && !error && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">Nenhuma página criada.</div>
        )}
      </div>
    </div>
  );
}