import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Wand2 } from 'lucide-react';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { flattenTree, listCategories } from '../services/catalogo';
import type { Category } from '../services/catalogo';
import {
  ApplyResult, CategoryFiscalRow, FiscalForm, FiscalProfile,
  applyFiscalRules, listCategoryFiscal, listFiscalProfiles, saveFiscalProfile, setCategoryFiscal,
} from '../services/fiscalRegras';

const EMPTY: FiscalForm = { name: '', ncm: '', cest: '', cfop: '', description: '', active: true };
const digits = (s: string, n: number) => s.replace(/\D/g, '').slice(0, n);
const fmtNcm = (n: string) => n.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3');

type Props = { storeId: string; canEdit: boolean; onChanged: () => void; onClose: () => void };

export default function FiscalRulesDialog({ storeId, canEdit, onChanged, onClose }: Props) {
  const [tab, setTab] = useState<'cats' | 'rules'>('cats');
  const [profiles, setProfiles] = useState<FiscalProfile[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [rows, setRows] = useState<CategoryFiscalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<FiscalForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c, r] = await Promise.all([listFiscalProfiles(storeId), listCategories(storeId), listCategoryFiscal(storeId)]);
      setProfiles(p); setCats(c); setRows(r);
    } catch (e) { showError((e as Error).message); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const profById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const tree = useMemo(() => flattenTree(cats), [cats]);
  const activeProfiles = profiles.filter((p) => p.active);

  const inherited = (id: string): FiscalProfile | null => {
    let cur = byId.get(id)?.parent_id ?? null;
    for (let i = 0; cur && i < 10; i++) {
      const r = byId.get(cur);
      const p = r?.fiscal_profile_id ? profById.get(r.fiscal_profile_id) : undefined;
      if (p && p.active) return p;
      cur = r?.parent_id ?? null;
    }
    return null;
  };

  async function choose(catId: string, value: string) {
    setBusy(catId);
    try {
      await setCategoryFiscal(storeId, catId, value || null);
      setRows((prev) => prev.map((r) => (r.id === catId ? { ...r, fiscal_profile_id: value || null } : r)));
      onChanged();
    } catch (e) { showError((e as Error).message); }
    finally { setBusy(null); }
  }

  function openForm(p?: FiscalProfile) {
    setEditId(p?.id ?? null);
    setForm(p ? { name: p.name, ncm: p.ncm, cest: p.cest ?? '', cfop: p.cfop ?? '', description: p.description ?? '', active: p.active } : { ...EMPTY });
  }

  async function saveForm() {
    if (!form) return;
    if (!form.name.trim()) { showError('Informe o nome da regra.'); return; }
    if (form.ncm.length !== 8) { showError('NCM deve ter 8 dígitos.'); return; }
    if (form.cest && form.cest.length !== 7) { showError('CEST deve ter 7 dígitos.'); return; }
    if (form.cfop && form.cfop.length !== 4) { showError('CFOP deve ter 4 dígitos.'); return; }
    setBusy('form');
    try {
      await saveFiscalProfile(storeId, editId, form);
      showSuccess('Regra salva.');
      setForm(null);
      await load();
    } catch (e) { showError((e as Error).message); }
    finally { setBusy(null); }
  }

  async function apply() {
    setBusy('apply');
    try {
      const r = await applyFiscalRules(storeId);
      setResult(r);
      showSuccess(`${r.produtos_preenchidos} produto(s) preenchido(s).`);
      onChanged();
    } catch (e) { showError((e as Error).message); }
    finally { setBusy(null); }
  }

  const tabBtn = (k: 'cats' | 'rules', label: string) => (
    <button type="button" onClick={() => setTab(k)} className={cn('cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold',
      tab === k ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]' : 'border-slate-200 dark:border-slate-700')}>
      {label}
    </button>
  );

  return (
    <Modal wide title="Regras fiscais por categoria" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {tabBtn('cats', 'Vincular às categorias')}
              {tabBtn('rules', `Cadastro de regras (${profiles.length})`)}
              {canEdit && (
                <button type="button" disabled={busy !== null} onClick={() => void apply()}
                  className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-[color:var(--sll-b-brand)] disabled:opacity-50 dark:border-slate-700">
                  {busy === 'apply' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} className="text-[color:var(--sll-b-brand)]" />}
                  Aplicar regras aos produtos
                </button>
              )}
            </div>

            {result && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                <b>{result.produtos_preenchidos}</b> produto(s) preenchido(s) · <b>{result.produtos_sem_ncm}</b> produto(s) ainda sem NCM
                ({result.variacoes_sem_ncm} variações) · <b>{result.produtos_sem_categoria}</b> sem categoria. Quem não tem categoria ou cuja categoria não tem regra continua sem NCM.
              </div>
            )}

            {tab === 'cats' && (
              <>
                <p className="text-xs text-slate-500">Categoria sem regra própria herda a do pai. Produtos que já têm NCM não são alterados.</p>
                <div className="max-h-[50vh] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
                  {tree.map(({ cat, depth }) => {
                    const own = byId.get(cat.id)?.fiscal_profile_id ?? '';
                    const inh = own ? null : inherited(cat.id);
                    return (
                      <div key={cat.id} style={{ marginLeft: depth * 20 }}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="min-w-0 flex-1 break-words text-sm font-semibold">{cat.name}</span>
                        <select value={own} disabled={!canEdit || busy !== null} onChange={(e) => void choose(cat.id, e.target.value)}
                          className={inputCls + ' !w-64 !py-1.5 !text-xs cursor-pointer'}>
                          <option value="">{inh ? `Herdar do pai: ${inh.name}` : 'Sem regra'}</option>
                          {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.name} · {fmtNcm(p.ncm)}</option>)}
                        </select>
                        {busy === cat.id && <Loader2 size={14} className="animate-spin text-[color:var(--sll-b-brand)]" />}
                      </div>
                    );
                  })}
                  {tree.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma categoria cadastrada.</p>}
                </div>
              </>
            )}

            {tab === 'rules' && (
              <>
                {canEdit && !form && (
                  <button type="button" onClick={() => openForm()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--sll-b-brand-hover)]">
                    <Plus size={15} /> Nova regra
                  </button>
                )}

                {form && (
                  <div className="space-y-3 rounded-xl border border-[color:var(--sll-b-brand-border)] p-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <label className="block text-xs font-bold sm:col-span-4">Nome da regra *
                        <input className={inputCls + ' mt-1 font-normal'} value={form.name} placeholder="Ex.: Vestuário feminino" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </label>
                      <label className="block text-xs font-bold">NCM * (8 dígitos)
                        <input className={inputCls + ' mt-1 font-mono font-normal'} inputMode="numeric" value={form.ncm} onChange={(e) => setForm({ ...form, ncm: digits(e.target.value, 8) })} />
                      </label>
                      <label className="block text-xs font-bold">CEST (7 dígitos)
                        <input className={inputCls + ' mt-1 font-mono font-normal'} inputMode="numeric" value={form.cest} onChange={(e) => setForm({ ...form, cest: digits(e.target.value, 7) })} />
                      </label>
                      <label className="block text-xs font-bold">CFOP (4 dígitos)
                        <input className={inputCls + ' mt-1 font-mono font-normal'} inputMode="numeric" value={form.cfop} onChange={(e) => setForm({ ...form, cfop: digits(e.target.value, 4) })} />
                      </label>
                      <label className="flex items-end gap-2 pb-2 text-xs font-bold">
                        <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativa
                      </label>
                      <label className="block text-xs font-bold sm:col-span-4">Descrição
                        <input className={inputCls + ' mt-1 font-normal'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={busy !== null} onClick={() => setForm(null)} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancelar</button>
                      <button type="button" disabled={busy !== null} onClick={() => void saveForm()} className={primaryBtn + ' disabled:opacity-50'}>
                        {busy === 'form' && <Loader2 size={15} className="mr-2 inline animate-spin" />}Salvar regra
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {profiles.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-sm font-semibold', !p.active && 'text-slate-400 line-through')}>{p.name}</p>
                        <p className="text-[11px] text-slate-500">
                          NCM {fmtNcm(p.ncm)}{p.cest ? ` · CEST ${p.cest}` : ''}{p.cfop ? ` · CFOP ${p.cfop}` : ''} · {p.categories} categoria(s)
                        </p>
                      </div>
                      {canEdit && (
                        <button type="button" title="Editar" onClick={() => openForm(p)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800"><Pencil size={15} /></button>
                      )}
                    </div>
                  ))}
                  {profiles.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma regra cadastrada.</p>}
                </div>
              </>
            )}
          </>
        )}
        <div className="flex justify-end"><button type="button" onClick={onClose} className={primaryBtn}>Concluído</button></div>
      </div>
    </Modal>
  );
}