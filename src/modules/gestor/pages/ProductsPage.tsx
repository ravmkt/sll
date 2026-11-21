import { useSearchParams } from 'react-router-dom';
import { Boxes, Package, Tag } from 'lucide-react';
import type { ElementType } from 'react';
import ProductsCatalog from '@/components/products/ProductsCatalog';
import PageHeader from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { useGestorAccess } from '../hooks/useGestorAccess';
import StockPage from './StockPage';
import CategoriesPanel from '../components/CategoriesPanel';

type Aba = 'produtos' | 'estoque' | 'categorias';

const HEAD: Record<Aba, { icon: ElementType; title: string; subtitle: string }> = {
  produtos: { icon: Package, title: 'Produtos', subtitle: 'Cadastro central de produtos e variações, compartilhado com os módulos do SLL.' },
  estoque: { icon: Boxes, title: 'Estoque', subtitle: 'Saldos por variação, canais e depósitos. Cada alteração entra no histórico.' },
  categorias: { icon: Tag, title: 'Categorias', subtitle: 'Organize o catálogo e vincule as categorias dos canais de venda.' },
};

export default function ProductsPage() {
  const { can } = useGestorAccess();
  const [params, setParams] = useSearchParams();

  const tabs: { key: Aba; label: string; icon: ElementType; show: boolean }[] = [
    { key: 'produtos', label: 'Produtos', icon: Package, show: true },
    { key: 'estoque', label: 'Estoque', icon: Boxes, show: can('estoque', 'ver') },
    { key: 'categorias', label: 'Categorias', icon: Tag, show: can('produtos', 'ver') },
  ];
  const visible = tabs.filter((t) => t.show);
  const asked = params.get('aba') as Aba | null;
  const aba: Aba = visible.some((t) => t.key === asked) ? (asked as Aba) : 'produtos';
  const head = HEAD[aba];

  const go = (k: Aba) => setParams(k === 'produtos' ? {} : { aba: k }, { replace: true });

  return (
    <div className="space-y-6">
      <PageHeader icon={head.icon} title={head.title} subtitle={head.subtitle} />

      <div className="flex flex-wrap gap-2">
        {visible.map((t) => {
          const Icon = t.icon;
          const on = aba === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => go(t.key)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                on ? 'bg-[color:var(--sll-b-brand)] text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="[&_h1]:hidden [&_h1+p]:hidden">
        {aba === 'produtos' && (
          <ProductsCatalog
            mode="gestor"
            perms={{
              create: can('produtos', 'criar'),
              edit: can('produtos', 'editar'),
              remove: can('produtos', 'excluir'),
              stock: can('estoque', 'editar'),
              importar: can('produtos', 'criar'),
            }}
          />
        )}
        {aba === 'estoque' && <StockPage />}
        {aba === 'categorias' && <CategoriesPanel canEdit={can('produtos', 'editar')} />}
      </div>
    </div>
  );
}