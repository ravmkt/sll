import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { VariantsPanel } from '@/components/products/ProductVariants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductRow } from '../types';
import { DecimalInput } from './uiHelpers';

const sb: any = supabase;

interface Props { storeId: string; productId?: string | null; product: ProductRow }
interface Existing { id: string; sku: string; option_name: string | null; option_value: string | null; price: number | null; sale_price: number | null; stock: number; dirty?: boolean }
interface Group { name: string; values: string[]; draft: string }
interface NewRow { key: string; option_name: string; option_value: string; sku: string; price: number | null; sale_price: number | null; stock: number }

const CARD = 'rounded-2xl border border-slate-200 p-5 dark:border-slate-800';
const TITLE = 'mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500';
const TH = 'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400';
const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function VariationsTab({ storeId, productId, product }: Props) {
  const [existing, setExisting] = useState<Existing[]>([]);
  const [groups, setGroups] = useState<Group[]>([{ name: '', values: [], draft: '' }]);
  const [rows, setRows] = useState<NewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    const { data, error } = await sb.from('product_variants')
      .select('id,sku,option_name,option_value,price,sale_price,stock').eq('product_id', productId).order('position');
    if (error) setErr(error.message);
    setExisting(((data ?? []) as Existing[]).map((v) => ({ ...v, stock: Number(v.stock || 0) })));
    setLoading(false);
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  if (!productId) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Clique em <strong>Salvar e criar variações</strong> para gravar o produto. Em seguida o construtor de variações abre aqui.
      </p>
    );
  }
  if (product.origin === 'yampi') {
    return <VariantsPanel storeId={storeId} product={{ id: productId, name: product.name, origin: 'yampi' }} onChanged={() => void load()} />;
  }

  const setGroup = (i: number, patch: Partial<Group>) => setGroups((g) => g.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addValues = (i: number) => {
    const g = groups[i];
    const next = g.draft.split(',').map((v) => v.trim()).filter(Boolean);
    setGroup(i, { values: Array.from(new Set([...g.values, ...next])), draft: '' });
  };

  const generate = () => {
    setErr(null); setOk(null);
    const valid = groups.filter((g) => g.name.trim() && g.values.length);
    if (!valid.length) { setErr('Informe o nome da variação (ex.: Cor) e ao menos um valor.'); return; }
    let combos: string[][] = [[]];
    for (const g of valid) combos = combos.flatMap((c) => g.values.map((v) => [...c, v]));
    const optName = valid.map((g) => g.name.trim()).join(' / ');
    const baseSku = product.sku?.trim() || slug(product.name);
    const made: NewRow[] = combos
      .map((c) => ({ c, value: c.join(' / ') }))
      .filter(({ value }) => !existing.some((e) => e.option_value === value))
      .map(({ c, value }) => ({
        key: value, option_name: optName, option_value: value,
        sku: `${baseSku}-${c.map(slug).join('-')}`, price: product.price ?? null, sale_price: null, stock: 0,
      }));
    if (!made.length) { setErr('Todas essas combinações já existem.'); return; }
    setRows(made);
  };

  const patchRow = (i: number, p: Partial<NewRow>) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const skuProblem = (skus: string[]) => {
    if (skus.some((s) => !s)) return 'Todas as variações precisam de SKU.';
    if (new Set(skus).size !== skus.length) return 'Há SKUs repetidos.';
    return null;
  };

  const saveNew = async () => {
    setErr(null); setOk(null);
    const skus = rows.map((r) => r.sku.trim());
    const p = skuProblem([...skus, ...existing.map((e) => e.sku)]);
    if (p) { setErr(p); return; }
    setBusy(true);
    try {
      const dup = await sb.from('product_variants').select('sku').eq('store_id', storeId).in('sku', skus);
      if (dup.error) throw new Error(dup.error.message);
      if (dup.data?.length) throw new Error(`SKU já usado na loja: ${dup.data.map((d: { sku: string }) => d.sku).join(', ')}`);
      const { error } = await sb.from('product_variants').insert(rows.map((r, i) => ({
        store_id: storeId, product_id: productId, sku: r.sku.trim(),
        title: `${product.name} - ${r.option_value}`, option_name: r.option_name, option_value: r.option_value,
        price: r.price ?? 0, sale_price: r.sale_price, stock: Math.max(0, Math.floor(r.stock) || 0), position: existing.length + i,
      })));
      if (error) throw new Error(error.message);
      setOk(`${rows.length} variação(ões) criada(s).`);
      setRows([]); setGroups([{ name: '', values: [], draft: '' }]);
      await load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const patchExisting = (id: string, p: Partial<Existing>) =>
    setExisting((l) => l.map((x) => (x.id === id ? { ...x, ...p, dirty: true } : x)));

  const saveExisting = async () => {
    setErr(null); setOk(null);
    const prob = skuProblem(existing.map((e) => e.sku.trim()));
    if (prob) { setErr(prob); return; }
    setBusy(true);
    try {
      for (const v of existing.filter((x) => x.dirty)) {
        const { error } = await sb.from('product_variants').update({
          sku: v.sku.trim(), price: v.price ?? 0, sale_price: v.sale_price, title: `${product.name} - ${v.option_value ?? ''}`,
        }).eq('id', v.id);
        if (error) throw new Error(error.message);
      }
      setOk('Alterações salvas.');
      await load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const remove = async (v: Existing) => {
    const msg = v.stock > 0 ? `A variação ${v.option_value} tem ${v.stock} un. em estoque. Excluir mesmo assim?` : `Excluir a variação ${v.option_value}?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    const { error } = await sb.from('product_variants').delete().eq('id', v.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    await load();
  };

  const dirty = existing.some((e) => e.dirty);

  return (
    <div className="space-y-5">
      <section className={CARD}>
        <h3 className={TITLE}>Variações cadastradas ({existing.length})</h3>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#0094eb]" /></div>
        ) : existing.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma variação ainda. Monte abaixo.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#111524]"><tr>
                <th className={TH}>Variação</th><th className={TH}>SKU</th><th className={TH}>Preço</th><th className={TH}>Promocional</th><th className={`${TH} text-right`}>Estoque</th><th className="w-10" />
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {existing.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2"><p className="font-semibold">{v.option_value || '—'}</p>{v.option_name && <p className="text-[10px] text-slate-400">{v.option_name}</p>}</td>
                    <td className="px-3 py-2"><Input className="h-8 w-44 font-mono text-xs" value={v.sku} onChange={(e) => patchExisting(v.id, { sku: e.target.value })} /></td>
                    <td className="px-3 py-2"><div className="w-28"><DecimalInput value={v.price} onChange={(x) => patchExisting(v.id, { price: x })} /></div></td>
                    <td className="px-3 py-2"><div className="w-28"><DecimalInput value={v.sale_price} onChange={(x) => patchExisting(v.id, { sale_price: x })} /></div></td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${v.stock > 0 ? '' : 'text-rose-600'}`}>{v.stock}</td>
                    <td className="px-3 py-2"><button type="button" disabled={busy} onClick={() => void remove(v)} className="cursor-pointer text-slate-400 hover:text-rose-500" title="Excluir"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {existing.length > 0 && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">O saldo de estoque muda pelo Livro de estoque, que guarda o histórico.</p>
            <Button type="button" disabled={!dirty || busy} onClick={() => void saveExisting()} className="rounded-xl bg-[#0094eb] font-bold uppercase text-white hover:bg-[#007bc4]">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações
            </Button>
          </div>
        )}
      </section>

      <section className={CARD}>
        <h3 className={TITLE}>Criar variações</h3>
        <p className="mb-4 text-xs text-slate-500">Defina o tipo (ex.: Cor, Tamanho) e digite os valores separados por vírgula. Com dois tipos, o sistema cruza as combinações.</p>
        <div className="space-y-3">
          {groups.map((g, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-[#111524]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_1fr_auto]">
                <Input placeholder="Tipo (ex.: Cor)" value={g.name} onChange={(e) => setGroup(i, { name: e.target.value })} />
                <Input placeholder="Valores: Azul, Preto, Branco" value={g.draft}
                  onChange={(e) => setGroup(i, { draft: e.target.value })}
                  onBlur={() => addValues(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addValues(i); } }} />
                {groups.length > 1 && <button type="button" onClick={() => setGroups((x) => x.filter((_, idx) => idx !== i))} className="cursor-pointer text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>}
              </div>
              {g.values.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.values.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#0094eb] px-3 py-1 text-xs font-bold text-white">
                      {v}<button type="button" onClick={() => setGroup(i, { values: g.values.filter((x) => x !== v) })} className="cursor-pointer opacity-80 hover:opacity-100"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {groups.length < 3 && <Button type="button" variant="outline" className="rounded-xl" onClick={() => setGroups((g) => [...g, { name: '', values: [], draft: '' }])}><Plus className="mr-1 h-4 w-4" />Outro tipo</Button>}
          <Button type="button" onClick={generate} className="rounded-xl bg-[#0094eb] font-bold uppercase text-white hover:bg-[#007bc4]">Gerar combinações</Button>
        </div>

        {rows.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#111524]"><tr>
                  <th className={TH}>Variação</th><th className={TH}>SKU</th><th className={TH}>Preço</th><th className={TH}>Promocional</th><th className={TH}>Estoque inicial</th><th className="w-10" />
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((r, i) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2 font-semibold">{r.option_value}</td>
                      <td className="px-3 py-2"><Input className="h-8 w-48 font-mono text-xs" value={r.sku} onChange={(e) => patchRow(i, { sku: e.target.value })} /></td>
                      <td className="px-3 py-2"><div className="w-28"><DecimalInput value={r.price} onChange={(v) => patchRow(i, { price: v })} /></div></td>
                      <td className="px-3 py-2"><div className="w-28"><DecimalInput value={r.sale_price} onChange={(v) => patchRow(i, { sale_price: v })} /></div></td>
                      <td className="px-3 py-2"><Input type="number" min={0} className="h-8 w-24" value={r.stock} onChange={(e) => patchRow(i, { stock: Number(e.target.value) })} /></td>
                      <td className="px-3 py-2"><button type="button" onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))} className="cursor-pointer text-slate-400 hover:text-rose-500"><X size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button type="button" disabled={busy} onClick={() => void saveNew()} className="rounded-xl bg-[#0094eb] font-bold uppercase text-white hover:bg-[#007bc4]">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar {rows.length} variação(ões)
              </Button>
            </div>
          </div>
        )}
      </section>

      {err && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
      {ok && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{ok}</p>}
    </div>
  );
}