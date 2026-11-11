import StorageUsageCard from '@/components/billing/StorageUsageCard';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPage, deletePage, listPages } from '../services/pages';
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
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Landing Pages e Páginas de Produto</h1>
        <div className="flex gap-2">
          <button onClick={() => handleCreate('landing')} className="rounded-md bg-emerald-600 px-4 py-2 text-white">
            Nova Landing
          </button>
          <button onClick={() => handleCreate('product')} className="rounded-md bg-gray-800 px-4 py-2 text-white">
            Nova Página de Produto
          </button>
        </div>
      </div>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <div className="mb-4"><StorageUsageCard /></div>
      <ul className="divide-y rounded-md border">
        {pages.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-gray-500">{p.type} · {p.status} · /{p.slug}</p>
            </div>
            <div className="flex items-center gap-4">
                  <Link to={`/dashboard/modules/builder/${p.id}`} className="text-emerald-600 hover:underline">Editar</Link>
                  <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline">Excluir</button>
                </div>
          </li>
        ))}
        {pages.length === 0 && <li className="p-4 text-gray-500">Nenhuma página criada.</li>}
      </ul>
    </div>
  );
}

