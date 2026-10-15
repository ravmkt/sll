import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import {
  RESOURCE_LABEL, brl, deleteAddon, formatGrant, listAddons, saveAddon,
  type Addon, type AddonInput, type Resource,
} from '@/services/admin/addonsAdmin';

const sb: any = supabase;

const IN = 'w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-[15px] text-slate-100 outline-none focus:border-[#0094eb]';
const LBL = 'mb-1 block text-[13px] font-semibold uppercase tracking-wider text-slate-400';
const TH = 'px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500';

type Mod = { slug: string; name: string };

type Form = {
  name: string; description: string; scope: string; target_resource: Resource; amount: string; price: string;
  is_active: boolean; is_upsell: boolean; upsell_module_target: string; upsell_headline: string; billing_type: 'recurring' | 'one_time';
};

const EMPTY: Form = {
  name: '', description: '', scope: 'global', target_resource: 'storage_gb', amount: '', price: '',
  is_active: true, is_upsell: false, upsell_module_target: 'all', upsell_headline: '', billing_type: 'recurring',
};

const num = (v: string) => Number(v.trim().replace(/\./g, '').replace(',', '.'));

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[15px] text-slate-200">
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  );
}

export default function AddonsAdminTab() {
  const [list, setList] = useState<Addon[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try { setList(await listAddons()); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    sb.from('hub_modules').select('slug,name').order('sort_order').then(({ data }: any) => setMods((data || []) as Mod[]));
  }, []);

  const scopes = useMemo(() => [{ slug: 'global', name: 'Global (Ecossistema SLL)' }, ...mods], [mods]);
  const targets = useMemo(
    () => [{ slug: 'all', name: 'Em todos os checkouts' }, ...mods.map((m) => ({ slug: m.slug, name: `Apenas ${m.name}` }))],
    [mods],
  );
  const scopeName = (s: string) => (s === 'global' ? 'Global' : mods.find((m) => m.slug === s)?.name ?? s);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const openNew = () => { setEditId(null); setForm({ ...EMPTY }); };
  const openEdit = (a: Addon) => {
    setEditId(a.id);
    setForm({
      name: a.name, description: a.description ?? '', scope: a.scope, target_resource: a.target_resource,
      amount: String(a.resource_amount).replace('.', ','), price: String(a.price_monthly).replace('.', ','),
      is_active: a.is_active, is_upsell: a.is_upsell, billing_type: a.billing_type ?? 'recurring',
      upsell_module_target: a.upsell_module_target ?? 'all', upsell_headline: a.upsell_headline ?? '',
    });
  };

  const save = async () => {
    if (!form) return;
    const price = num(form.price || '0');
    const amount = form.target_resource === 'custom' ? num(form.amount || '0') : num(form.amount);
    if (form.name.trim().length < 3) return void toast.error('Informe o nome do add-on.');
    if (!Number.isFinite(price) || price < 0) return void toast.error('Preço mensal inválido.');
    if (!Number.isFinite(amount) || amount < 0 || (form.target_resource !== 'custom' && amount <= 0)) {
      return void toast.error('Informe a quantidade do recurso concedido.');
    }
    if (form.is_upsell) {
      if (form.upsell_headline.trim().length < 5) return void toast.error('Escreva a frase de destaque do upsell.');
      if (price <= 0) return void toast.error('Um upsell precisa ter preço maior que zero.');
    }
    const input: AddonInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_monthly: price,
      scope: form.scope,
      target_resource: form.target_resource,
      resource_amount: amount,
      is_upsell: form.is_upsell,
      upsell_headline: form.is_upsell ? form.upsell_headline.trim() : null,
      upsell_module_target: form.is_upsell ? form.upsell_module_target : null,
      is_active: form.is_active,
      billing_type: form.billing_type,
    };
    setBusy(true);
    try {
      await saveAddon(input, editId ?? undefined);
      toast.success('Add-on salvo.');
      setForm(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: Addon) => {
    if (!(await confirm({ title: 'Excluir add-on', message: `"${a.name}" será apagado.`, confirmLabel: 'Excluir' }))) return;
    try { await deleteAddon(a.id); toast.success('Add-on excluído.'); await load(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">Pacotes extras de recurso. Os marcados como upsell aparecem como Order Bump no checkout.</p>
        <button type="button" onClick={openNew} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-4 py-2 text-[13px] font-bold text-white">
          <Plus size={14} /> Novo Add-on
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111524]">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-800">
            <tr>
              <th className={TH}>Escopo / Chave</th><th className={TH}>Nome</th><th className={TH}>Recurso concedido</th>
              <th className={`${TH} text-center`}>Preço (R$)</th><th className={`${TH} text-center`}>Upsell</th>
              <th className={`${TH} text-center`}>Status</th><th className={`${TH} text-center`}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-[#fd8539]" /></td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhum add-on cadastrado.</td></tr>}
            {list.map((a) => (
              <tr key={a.id} className={a.is_active ? '' : 'opacity-50'}>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${a.scope === 'global' ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/15 text-sky-300'}`}>{scopeName(a.scope)}</span>
                  <p className="mt-1 font-mono text-xs text-slate-600">{a.slug}</p>
                </td>
                <td className="px-3 py-3 font-semibold text-slate-100">{a.name}</td>
                <td className="px-3 py-3 text-slate-300">{formatGrant(a)}</td>
                <td className="px-3 py-3 text-center font-bold text-white">{brl(a.price_monthly)}<span className="block text-xs font-normal text-slate-500">{a.billing_type === 'one_time' ? 'avulso' : '/mês'}</span></td>
                <td className="px-3 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${a.is_upsell ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-500/15 text-slate-400'}`}>{a.is_upsell ? 'Sim' : 'Não'}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${a.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>{a.is_active ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-center gap-1">
                    <button type="button" title="Editar" onClick={() => openEdit(a)} className="cursor-pointer rounded-lg p-2 text-slate-300 hover:bg-white/10"><Pencil size={15} /></button>
                    <button type="button" title="Excluir" onClick={() => remove(a)} className="cursor-pointer rounded-lg p-2 text-rose-400 hover:bg-white/10"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setForm(null)}>
          <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-[#0f1322] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">{editId ? 'Editar add-on' : 'Novo add-on'}</h3>
              <button type="button" aria-label="Fechar" onClick={() => setForm(null)} className="cursor-pointer text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <label className="block"><span className={LBL}>Nome</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={IN} placeholder="+10 GB de Armazenamento" autoFocus /></label>
            <label className="block"><span className={LBL}>Descrição (opcional)</span>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} className={IN} /></label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className={LBL}>Escopo</span>
                <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className={`${IN} cursor-pointer`}>
                  {scopes.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select></label>
              <label className="block"><span className={LBL}>{form.billing_type === 'one_time' ? 'Preço único (R$)' : 'Preço mensal (R$)'}</span>
                <input value={form.price} onChange={(e) => set('price', e.target.value)} className={IN} placeholder="19,90" inputMode="decimal" /></label>
              <label className="block"><span className={LBL}>Recurso incrementado</span>
                <select value={form.target_resource} onChange={(e) => set('target_resource', e.target.value as Resource)} className={`${IN} cursor-pointer`}>
                  {(Object.keys(RESOURCE_LABEL) as Resource[]).map((r) => <option key={r} value={r}>{RESOURCE_LABEL[r]}</option>)}
                </select></label>
              <label className="block"><span className={LBL}>Cobrança</span>
                <select value={form.billing_type} onChange={(e) => set('billing_type', e.target.value as 'recurring' | 'one_time')} className={`${IN} cursor-pointer`}>
                  <option value="recurring">Recorrente (mensal)</option>
                  <option value="one_time">Avulsa (pagamento único)</option>
                </select></label>
              <label className="block"><span className={LBL}>Quantidade concedida</span>
                <input value={form.amount} onChange={(e) => set('amount', e.target.value)} className={IN} placeholder="10 ou 15000" inputMode="decimal" /></label>
            </div>
            {form.target_resource === 'custom' && <p className="text-[13px] text-slate-500">Recurso personalizado não altera limites automaticamente.</p>}

            <Switch on={form.is_active} onChange={(v) => set('is_active', v)} label={form.is_active ? 'Ativo' : 'Inativo'} />

            <div className="space-y-3 rounded-xl border border-slate-800 p-4">
              <label className="flex cursor-pointer items-center gap-2 text-[15px] font-semibold text-slate-100">
                <input type="checkbox" checked={form.is_upsell} onChange={(e) => set('is_upsell', e.target.checked)} />
                Oferecer como Upsell / Order Bump no Checkout
              </label>
              {form.is_upsell && (
                <>
                  <label className="block"><span className={LBL}>Onde oferecer</span>
                    <select value={form.upsell_module_target} onChange={(e) => set('upsell_module_target', e.target.value)} className={`${IN} cursor-pointer`}>
                      {targets.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                    </select></label>
                  <label className="block"><span className={LBL}>Frase de destaque</span>
                    <input value={form.upsell_headline} onChange={(e) => set('upsell_headline', e.target.value)} className={IN}
                      placeholder="Oferta exclusiva: adicione 15.000 plays por apenas R$ 19,90/mês" /></label>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button type="button" disabled={busy} onClick={() => setForm(null)} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-[13px] font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
              <button type="button" disabled={busy} onClick={save} className="cursor-pointer rounded-lg bg-[#0094eb] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40">
                {busy ? 'Salvando...' : 'Salvar add-on'}
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}