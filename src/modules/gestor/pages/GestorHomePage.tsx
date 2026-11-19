import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { LowStockRow, listLowStock } from '../services/cadastros';

export default function GestorHomePage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lojaLoading) return;
    if (!storeId) { setLoading(false); return; }
    listLowStock(storeId)
      .then(setRows)
      .catch((e) => { console.error('[Gestor]', e); showError('Erro ao carregar estoque crítico.'); })
      .finally(() => setLoading(false));
  }, [storeId, lojaLoading]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Gestor</h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação.</p>
      </div>

      <section className="rounded-lg border bg-white">
        <header className="flex items-center gap-2 border-b p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold">Estoque crítico</h2>
          <Badge variant={rows.length ? 'destructive' : 'secondary'}>{rows.length}</Badge>
        </header>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma variação abaixo do mínimo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Produto</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 text-right font-medium">Saldo</th>
                <th className="p-3 text-right font-medium">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.variant_id} className="border-t">
                  <td className="p-3">{r.product_name}{r.title && r.title !== r.product_name ? ` · ${r.title}` : ''}</td>
                  <td className="p-3 text-muted-foreground">{r.sku}</td>
                  <td className={`p-3 text-right font-semibold ${r.stock <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>{r.stock}</td>
                  <td className="p-3 text-right text-muted-foreground">{r.min_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer className="border-t p-3 text-xs text-muted-foreground">
          Define-se o mínimo por variação. Sem mínimo (0), só aparecem variações zeradas.{' '}
          <Link to="/dashboard/modules/gestor/produtos" className="underline">Ir para Produtos</Link>
        </footer>
      </section>
    </div>
  );
}