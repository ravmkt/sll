import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Package, Pencil, Search, SlidersHorizontal } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLoja } from '@/contexts/LojaContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { listStock } from '@/services/productVariantsService';
import {
  GProduct,
  GVariant,
  Movement,
  MoveType,
  listGestorProducts,
  listGestorVariants,
  moveStock,
  holdSync,
  pushStockToYampi,
  stockHistory,
  updateGestorProduct,
} from '../services/gestor';

const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TYPE_LABEL: Record<string, string> = {
  initial: 'Saldo inicial',
  purchase: 'Compra',
  sale: 'Venda',
  return: 'Devolução',
  adjustment: 'Ajuste',
  loss: 'Perda',
};

const MOVE_OPTIONS: { value: MoveType; label: string }[] = [
  { value: 'purchase', label: 'Compra (entrada)' },
  { value: 'return', label: 'Devolução (entrada)' },
  { value: 'sale', label: 'Venda manual (saída)' },
  { value: 'loss', label: 'Perda (saída)' },
  { value: 'adjustment', label: 'Ajuste para novo saldo' },
];

const selectCls = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900';

export default function GestorPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [products, setProducts] = useState<GProduct[]>([]);
  const [stock, setStock] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<Record<string, GVariant[]>>({});

  const [editing, setEditing] = useState<GProduct | null>(null);
  const [fPrice, setFPrice] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const [target, setTarget] = useState<{ product: GProduct; variant: GVariant } | null>(null);
  const [mType, setMType] = useState<MoveType>('purchase');
  const [mQty, setMQty] = useState('');
  const [mNote, setMNote] = useState('');
  const [moving, setMoving] = useState(false);
  const [history, setHistory] = useState<Movement[]>([]);

  const reload = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    try {
      const [p, st] = await Promise.all([
        listGestorProducts(storeId),
        listStock(storeId).catch(() => new Map<string, number>()),
      ]);
      setProducts(p);
      setStock(st);
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!lojaLoading) reload();
  }, [lojaLoading, reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }, [products, search]);

  async function loadVariants(productId: string) {
    try {
      const v = await listGestorVariants(productId);
      setVariants((s) => ({ ...s, [productId]: v }));
    } catch {
      showError('Erro ao carregar variações.');
    }
  }

  function toggle(p: GProduct) {
    const next = new Set(open);
    if (next.has(p.id)) next.delete(p.id);
    else {
      next.add(p.id);
      if (!variants[p.id]) loadVariants(p.id);
    }
    setOpen(next);
  }

  function openEdit(p: GProduct) {
    setEditing(p);
    setFPrice(String(p.price ?? 0).replace('.', ','));
    setFDesc(p.description || '');
  }

  async function saveEdit() {
    if (!storeId || !editing) return;
    const price = Number(fPrice.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) {
      showError('Preço inválido.');
      return;
    }
    setSaving(true);
    try {
      await updateGestorProduct(storeId, editing.id, { price, description: fDesc });
      showSuccess('Produto atualizado.');
      setEditing(null);
      await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function openStock(product: GProduct, variant: GVariant) {
    setTarget({ product, variant });
    setMType('purchase');
    setMQty('');
    setMNote('');
    setHistory([]);
    try {
      setHistory(await stockHistory(variant.id));
    } catch {
      showError('Erro ao carregar histórico.');
    }
  }

  async function confirmMove() {
    if (!target) return;
    const n = Math.floor(Number(mQty));
    if (!Number.isFinite(n) || (mType === 'adjustment' ? n < 0 : n <= 0)) {
      showError(mType === 'adjustment' ? 'Informe o novo saldo (0 ou mais).' : 'Informe uma quantidade maior que zero.');
      return;
    }
    const current = target.variant.stock || 0;
    let delta = n;
    if (mType === 'sale' || mType === 'loss') delta = -n;
    if (mType === 'adjustment') delta = n - current;
    if (delta === 0) {
      showError('O novo saldo é igual ao atual.');
      return;
    }
    if (current + delta < 0) {
      showError('O saldo não pode ficar negativo.');
      return;
    }
    setMoving(true);
    try {
      await holdSync(target.variant.id);
      const bal = await moveStock(target.variant.id, mType, delta, mNote);
      const yampi = await pushStockToYampi(storeId, target.variant.sku, bal);
      showSuccess(`Estoque atualizado. Saldo: ${bal}${yampi === 'ok' ? ' · enviado à Yampi' : yampi === 'erro' ? ' · ERP salvo, mas o envio à Yampi falhou' : ''}`);
      const updated = { ...target.variant, stock: bal };
      setTarget({ ...target, variant: updated });
      setMQty('');
      setMNote('');
      setHistory(await stockHistory(target.variant.id));
      await Promise.all([loadVariants(target.product.id), reload()]);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setMoving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestor</h1>
            <p className="text-sm text-muted-foreground">Produtos, estoque por variação e histórico de movimentos.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border p-10 text-center text-muted-foreground">Nenhum produto encontrado.</div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {filtered.map((p) => {
              const isOpen = open.has(p.id);
              const total = stock.get(p.id) ?? 0;
              return (
                <li key={p.id}>
                  <div className="flex items-center gap-3 p-3">
                    <button type="button" onClick={() => toggle(p)} className="text-muted-foreground" aria-label="Variações">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted"><Package className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku || 'Sem SKU'}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{brl(p.price)}</p>
                      <Badge variant={total > 0 ? 'secondary' : 'destructive'}>{total} un.</Badge>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  </div>

                  {isOpen && (
                    <div className="border-t bg-muted/30 px-4 py-2">
                      {!variants[p.id] ? (
                        <Loader2 className="my-2 h-4 w-4 animate-spin text-muted-foreground" />
                      ) : variants[p.id].length === 0 ? (
                        <p className="py-2 text-xs text-muted-foreground">Sem variações cadastradas.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground">
                              <th className="py-1 font-medium">Variação</th>
                              <th className="py-1 font-medium">SKU</th>
                              <th className="py-1 text-right font-medium">Preço</th>
                              <th className="py-1 text-right font-medium">Saldo</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {variants[p.id].map((v) => (
                              <tr key={v.id} className="border-t">
                                <td className="py-2">{v.title || [v.option_name, v.option_value].filter(Boolean).join(': ') || 'Padrão'}</td>
                                <td className="py-2 text-muted-foreground">{v.sku}</td>
                                <td className="py-2 text-right">{brl(v.sale_price ?? v.price)}</td>
                                <td className="py-2 text-right font-semibold">{v.stock}</td>
                                <td className="py-2 text-right">
                                  <Button size="sm" variant="outline" onClick={() => openStock(p, v)}>
                                    <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Estoque
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_label]:text-slate-700">
          <DialogHeader><DialogTitle>{editing?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Preço (R$)</label>
              <Input value={fPrice} onChange={(e) => setFPrice(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descrição</label>
              <Textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-lg bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_label]:text-slate-700">
          <DialogHeader>
            <DialogTitle>
              {target?.product.name}{target && (target.variant.title || target.variant.sku) !== target.product.name && <> &middot; {target.variant.title || target.variant.sku}</>}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">Saldo atual: <b>{target?.variant.stock ?? 0}</b></p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <select className={selectCls} value={mType} onChange={(e) => setMType(e.target.value as MoveType)}>
                {MOVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{mType === 'adjustment' ? 'Novo saldo' : 'Quantidade'}</label>
              <Input value={mQty} onChange={(e) => setMQty(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Observação</label>
              <Input value={mNote} onChange={(e) => setMNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmMove} disabled={moving}>{moving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar movimento</Button>
          </DialogFooter>

          <div>
            <p className="mb-1 text-sm font-medium">Histórico</p>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {history.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">Sem movimentos.</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {history.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="p-2 text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                        <td className="p-2">{TYPE_LABEL[m.type] || m.type}</td>
                        <td className={`p-2 text-right font-semibold ${m.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                        <td className="p-2 text-right text-muted-foreground">= {m.balance_after ?? '-'}</td>
                        <td className="p-2 text-muted-foreground">{m.note || m.channel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}