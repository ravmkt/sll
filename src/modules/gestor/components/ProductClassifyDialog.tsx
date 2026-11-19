import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import {
  Brand, Category, flattenTree, getProductCatalog, listBrands, listCategories, setProductCatalog,
} from '../services/catalogo';

interface Props {
  productId: string | null;
  productName: string;
  onClose: () => void;
  onSaved?: () => void;
}

const SELECT = 'h-9 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-900';

export default function ProductClassifyDialog({ productId, productName, onClose, onSaved }: Props) {
  const { storeId } = useLoja();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId || !storeId) return;
    setLoading(true);
    Promise.all([listCategories(storeId), listBrands(storeId), getProductCatalog(productId)])
      .then(([c, b, cur]) => {
        setCats(c);
        setBrands(b);
        setCategoryId(cur.category_id || '');
        setBrandId(cur.brand_id || '');
      })
      .catch((e) => { console.error('[Gestor]', e); showError('Erro ao carregar categorias e marcas.'); })
      .finally(() => setLoading(false));
  }, [productId, storeId]);

  const tree = useMemo(() => flattenTree(cats.filter((c) => c.active || c.id === categoryId)), [cats, categoryId]);
  const activeBrands = useMemo(() => brands.filter((b) => b.active || b.id === brandId), [brands, brandId]);

  async function save() {
    if (!productId) return;
    setSaving(true);
    try {
      await setProductCatalog(productId, categoryId || null, brandId || null);
      showSuccess('Produto classificado.');
      onSaved?.();
      onClose();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!productId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md bg-white text-slate-900 [&_label]:text-slate-700">
        <DialogHeader><DialogTitle>Categoria e marca</DialogTitle></DialogHeader>
        <p className="-mt-2 truncate text-sm text-muted-foreground">{productName}</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria</label>
              <select className={SELECT} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {tree.map(({ cat, depth }) => (
                  <option key={cat.id} value={cat.id}>{`${'— '.repeat(depth)}${cat.name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Marca</label>
              <select className={SELECT} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">Sem marca</option>
                {activeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {cats.length === 0 && brands.length === 0 && (
              <p className="text-xs text-muted-foreground">Cadastre categorias e marcas em Categorias e marcas, no menu do Gestor.</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}