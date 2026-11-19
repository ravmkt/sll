import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Brand, Category, flattenTree, listBrands, listCategories, saveBrand, saveCategory } from '../services/catalogo';

type Edit = { kind: 'category' | 'brand'; id: string | null; name: string; parent: string; active: boolean };

const SELECT = 'h-9 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-900';

export default function CatalogPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const [c, b] = await Promise.all([listCategories(storeId), listBrands(storeId)]);
      setCats(c);
      setBrands(b);
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar categorias e marcas.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);

  const tree = useMemo(() => flattenTree(cats), [cats]);

  async function save() {
    if (!storeId || !edit) return;
    if (!edit.name.trim()) { showError('Informe o nome.'); return; }
    setSaving(true);
    try {
      if (edit.kind === 'category') await saveCategory(storeId, edit.id, edit.name, edit.parent || null, edit.active);
      else await saveBrand(storeId, edit.id, edit.name, edit.active);
      showSuccess('Salvo.');
      setEdit(null);
      await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const newCat = () => setEdit({ kind: 'category', id: null, name: '', parent: '', active: true });
  const newBrand = () => setEdit({ kind: 'brand', id: null, name: '', parent: '', active: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Categorias e marcas</h1>
        <p className="text-sm text-muted-foreground">Usadas para filtros, relatórios e pelos outros módulos do SLL.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border bg-white">
            <header className="flex items-center justify-between border-b p-3">
              <h2 className="text-sm font-semibold">Categorias <span className="text-muted-foreground">({cats.length})</span></h2>
              <Button size="sm" onClick={newCat}><Plus className="mr-1 h-4 w-4" /> Nova</Button>
            </header>
            {tree.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
            ) : (
              <ul className="divide-y">
                {tree.map(({ cat, depth }) => (
                  <li key={cat.id} className="flex items-center gap-2 p-3" style={{ paddingLeft: 12 + depth * 20 }}>
                    <span className="min-w-0 flex-1 truncate text-sm">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.products} prod.</span>
                    {!cat.active && <Badge variant="outline">Inativa</Badge>}
                    <Button size="icon" variant="ghost" aria-label="Editar"
                      onClick={() => setEdit({ kind: 'category', id: cat.id, name: cat.name, parent: cat.parent_id || '', active: cat.active })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border bg-white">
            <header className="flex items-center justify-between border-b p-3">
              <h2 className="text-sm font-semibold">Marcas <span className="text-muted-foreground">({brands.length})</span></h2>
              <Button size="sm" onClick={newBrand}><Plus className="mr-1 h-4 w-4" /> Nova</Button>
            </header>
            {brands.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma marca cadastrada.</p>
            ) : (
              <ul className="divide-y">
                {brands.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 p-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{b.name}</span>
                    <span className="text-xs text-muted-foreground">{b.products} prod.</span>
                    {!b.active && <Badge variant="outline">Inativa</Badge>}
                    <Button size="icon" variant="ghost" aria-label="Editar"
                      onClick={() => setEdit({ kind: 'brand', id: b.id, name: b.name, parent: '', active: b.active })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-md bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_label]:text-slate-700">
          <DialogHeader>
            <DialogTitle>
              {edit?.id ? 'Editar' : 'Nova'} {edit?.kind === 'category' ? 'categoria' : 'marca'}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome *</label>
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              {edit.kind === 'category' && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Categoria pai</label>
                  <select className={SELECT} value={edit.parent} onChange={(e) => setEdit({ ...edit, parent: e.target.value })}>
                    <option value="">Nenhuma (nível principal)</option>
                    {tree.filter(({ cat }) => cat.id !== edit.id).map(({ cat, depth }) => (
                      <option key={cat.id} value={cat.id}>{`${'— '.repeat(depth)}${cat.name}`}</option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Ativa
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}