import { useCallback, useEffect, useState } from 'react';
import { Check, Info, Loader2, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listWarehouses, saveWarehouse } from '../lookups';
import type { Warehouse } from '../lookups';
import type { ProductRow } from '../types';
import { DecimalInput, Field, selectCls } from './uiHelpers';

interface Props {
  storeId: string;
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

export default function EstoqueTab({ storeId, product: p, onChange }: Props) {
  const [list, setList] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('physical');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try { setList(await listWarehouses(storeId)); setErr(null); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); await load(); setErr(null); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const add = () => run(async () => {
    if (!name.trim()) throw new Error('Informe o nome do depósito.');
    await saveWarehouse(storeId, name, kind, null, true);
    setName('');
  });

  const rename = (w: Warehouse) => run(async () => {
    await saveWarehouse(storeId, editName, w.kind, w.id, w.active);
    setEditId(null);
  });

  const toggle = (w: Warehouse) => run(() => saveWarehouse(storeId, w.name, w.kind, w.id, !w.active));

  const range = p.min_stock != null && p.max_stock != null && p.min_stock > p.max_stock;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Estoque mínimo" hint="Abaixo disso o produto entra em Estoque crítico.">
          <DecimalInput value={p.min_stock} onChange={(v) => onChange({ min_stock: v })} />
        </Field>
        <Field label="Estoque máximo" hint="Referência para compras.">
          <DecimalInput value={p.max_stock} onChange={(v) => onChange({ max_stock: v })} />
        </Field>
        <Field label="Localização" hint="Ex.: Corredor 3, prateleira B.">
          <Input value={p.stock_location ?? ''} onChange={(e) => onChange({ stock_location: e.target.value })} />
        </Field>
      </div>
      {range && <p className="text-xs font-semibold text-rose-500">O estoque mínimo não pode ser maior que o máximo.</p>}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Depósitos</p>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <ul className="divide-y rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {list.map((w) => (
              <li key={w.id} className="flex items-center gap-3 p-3">
                {editId === w.id ? (
                  <>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                    <button type="button" disabled={busy} onClick={() => void rename(w)} className="cursor-pointer text-emerald-600" title="Salvar"><Check size={16} /></button>
                    <button type="button" onClick={() => setEditId(null)} className="cursor-pointer text-slate-400" title="Cancelar"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${w.active ? '' : 'text-slate-400 line-through'}`}>{w.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {w.is_ecommerce ? 'Depósito do e-commerce (padrão)' : w.kind === 'physical' ? 'Loja física' : 'Outro'}
                      </p>
                    </div>
                    <button type="button" onClick={() => { setEditId(w.id); setEditName(w.name); }} className="cursor-pointer text-slate-400 hover:text-[#0094eb]" title="Renomear"><Pencil size={15} /></button>
                    {!w.is_ecommerce && (
                      <button
                        type="button" disabled={busy} onClick={() => void toggle(w)}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase ${w.active ? 'border-[#0094eb]/30 bg-[#0094eb]/10 text-[#0094eb]' : 'border-rose-200 bg-rose-50 text-rose-600'}`}
                      >
                        {w.active ? 'Ativo' : 'Inativo'}
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Novo depósito" className="min-w-[14rem] flex-1">
            <Input value={name} placeholder="Ex.: Loja Centro" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }} />
          </Field>
          <Field label="Tipo" className="w-40">
            <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="physical">Loja física</option>
              <option value="other">Outro</option>
            </select>
          </Field>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void add()}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
        </div>
        {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          O saldo não é editado aqui. Entradas, saídas, ajustes e transferências entre depósitos são feitos no <strong>Livro de estoque</strong>,
          que guarda o histórico. Em produtos com variação, o saldo é por variação.
        </p>
      </div>
    </div>
  );
}