import { useEffect, useState } from 'react';
import { Search, X, Package, Loader2 } from 'lucide-react';
import { searchProducts, brl, type StoreProduct } from '../services/products';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (p: StoreProduct) => void;
}

export default function ProductPickerModal({ open, onClose, onSelect }: Props) {
  const [term, setTerm] = useState('');
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError('');
    const t = setTimeout(async () => {
      try {
        const r = await searchProducts(term);
        if (alive) setItems(r);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Erro ao carregar produtos');
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [term, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Escolher produto</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="border-b p-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por nome ou SKU"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <div className="flex justify-center p-6 text-gray-400"><Loader2 className="animate-spin" size={18} /></div>}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!loading && !error && items.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nenhum produto encontrado.</p>}
          {!loading && items.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); onClose(); }}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50"
            >
              {p.image ? (
                <img src={p.image} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-gray-400"><Package size={18} /></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.salePrice ? (<><span className="font-semibold text-emerald-600">{brl(p.salePrice)}</span> <s>{brl(p.price)}</s></>) : brl(p.price)}
                  {p.sku ? ` · ${p.sku}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
