import { useCallback, useEffect, useState } from 'react';
import { Edit3, Loader2, Package, Plus, Trash2, User } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useLoja } from '@/contexts/LojaContext';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import ProductsTabs from '@/components/products/ProductsTabs';
import { Modal, inputCls, primaryBtn, ghostBtn, labelCls, errMsg } from '@/components/products/Modal';
import { showError, showSuccess } from '@/utils/toast';
import { logPanelActivity } from '@/lib/activityLog';
import { MeasureModel, ModelMeasure, ModelType, deleteModel, listModels, saveModel } from '@/services/sizingModelsService';

type Extra = { id: string; name: string; value: string };
type FormState = { type: ModelType; name: string; height: string; width: string; length: string; weight: string; extras: Extra[] };

const EMPTY: FormState = { type: 'humano', name: '', height: '', width: '', length: '', weight: '', extras: [] };
const BASE = ['altura', 'largura', 'comprimento', 'peso'];
const uid = () => crypto.randomUUID();

function validate(f: FormState): string[] {
  const errs: string[] = [];
  if (!f.name.trim()) errs.push(f.type === 'humano' ? 'Nome do modelo é obrigatório.' : 'Nome do objeto é obrigatório.');
  const num = (v: string, label: string, required: boolean) => {
    if (!v.trim()) { if (required) errs.push(`${label} é obrigatória.`); return; }
    if (isNaN(Number(v))) errs.push(`${label} deve ser um número válido.`);
    else if (Number(v) <= 0) errs.push(`${label} deve ser maior que zero.`);
  };
  num(f.height, 'Altura', f.type === 'humano');
  num(f.weight, 'Peso', false);
  if (f.type === 'objeto') { num(f.width, 'Largura', false); num(f.length, 'Comprimento', false); }
  f.extras.forEach((m, i) => {
    if (m.name.trim() && !m.value.trim()) errs.push(`Valor do campo "${m.name}" é obrigatório.`);
    if (!m.name.trim() && m.value.trim()) errs.push(`Nome do campo ${i + 1} é obrigatório.`);
  });
  return errs;
}

export default function Medidas() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [models, setModels] = useState<MeasureModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickOpen, setPickOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MeasureModel | null>(null);
  const [del, setDel] = useState<MeasureModel | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const reload = useCallback(async () => {
    if (!storeId) { setModels([]); setLoading(false); return; }
    try {
      setModels(await listModels(storeId));
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);

  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY); };

  const pick = (type: ModelType) => { setForm({ ...EMPTY, type }); setPickOpen(false); setFormOpen(true); };

  const openEdit = (m: MeasureModel) => {
    const get = (n: string) => String(m.measures.find((x) => String(x.name).toLowerCase() === n)?.value ?? '');
    const base = m.type === 'objeto' ? BASE : ['altura', 'peso'];
    setEditing(m);
    setForm({
      type: m.type,
      name: m.name,
      height: get('altura'),
      width: get('largura'),
      length: get('comprimento'),
      weight: get('peso'),
      extras: m.measures
        .filter((x) => !base.includes(String(x.name).toLowerCase()))
        .map((x) => ({ id: uid(), name: x.name, value: String(x.value) })),
    });
    setFormOpen(true);
  };

  const setExtra = (id: string, field: 'name' | 'value', v: string) =>
    setForm((p) => ({ ...p, extras: p.extras.map((e) => (e.id === id ? { ...e, [field]: v } : e)) }));

  const submit = async () => {
    if (!storeId) { showError('Não foi possível identificar a loja atual.'); return; }
    const errs = validate(form);
    if (errs.length) { errs.forEach((e) => showError(e)); return; }

    const measures: ModelMeasure[] = [];
    const push = (name: string, v: string, unit: 'cm' | 'g' = 'cm') => { if (v.trim()) measures.push({ name, value: Number(v), unit }); };
    push('Altura', form.height);
    if (form.type === 'objeto') { push('Largura', form.width); push('Comprimento', form.length); }
    push('Peso', form.weight, 'g');
    form.extras.filter((e) => e.name.trim() && e.value.trim()).forEach((e) => {
      const raw = e.value.trim();
      const n = Number(raw);
      measures.push({ name: e.name.trim(), value: isNaN(n) ? raw : n, unit: '' });
    });

    try {
      setSaving(true);
      await saveModel({ id: editing?.id, store_id: storeId, name: form.name.trim(), type: form.type, measures });
      logPanelActivity(editing ? 'model.updated' : 'model.created', form.name.trim(), storeId);
      showSuccess(editing ? 'Medida atualizada com sucesso!' : 'Medida criada com sucesso!');
      closeForm();
      await reload();
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!del || !storeId) return;
    try {
      await deleteModel(del.id, storeId);
      logPanelActivity('model.deleted', del.name, storeId);
      showSuccess('Medida removida com sucesso.');
      setDel(null);
      await reload();
    } catch (e) {
      showError(errMsg(e));
    }
  };

  const isObj = form.type === 'objeto';
  const unitInput = (value: string, onChange: (v: string) => void, ph: string, unit = 'cm') => (
    <div className="relative">
      <input type="number" min="0" step="1" placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-10`} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <ProductsTabs />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medidas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cadastre as medidas para exibição interativa nos vídeos.</p>
          </div>
          <button type="button" disabled={!storeId || lojaLoading} onClick={() => { setEditing(null); setForm(EMPTY); setPickOpen(true); }} className={primaryBtn}>
            <Plus size={16} /> Novo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0094eb]" /></div>
        ) : models.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <Package size={40} className="mx-auto mb-3 text-slate-400" />
            <p className="font-bold">Nenhum perfil de medidas cadastrado.</p>
            <p className="mt-1 text-xs text-slate-500">Clique em "Novo" para criar o primeiro perfil da sua loja.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] p-6 shadow-sm transition hover:shadow-lg">
                <div className="mb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0094eb] text-white">
                      {m.type === 'objeto' ? <Package size={18} /> : <User size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black uppercase tracking-tight">{m.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {m.type === 'objeto' ? 'Dimensões do Objeto' : 'Perfil do Humano'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" title="Editar medidas" onClick={() => openEdit(m)} className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0094eb]">
                      <Edit3 size={16} />
                    </button>
                    <button type="button" title="Excluir perfil" onClick={() => setDel(m)} className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {m.measures.length === 0 && <p className="py-4 text-center text-xs font-semibold text-slate-400">Nenhuma medida cadastrada.</p>}
                  {m.measures.map((x, i) => (
                    <div key={`${m.id}-${x.name}-${i}`} className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111524] p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0094eb]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{x.name}</span>
                      </div>
                      <span className="rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] px-2.5 py-1 font-mono text-xs font-black">
                        {x.value}{x.unit ? ` ${x.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickOpen && (
        <Modal title="O que você deseja cadastrar?" onClose={() => setPickOpen(false)}>
          <div className="space-y-4 p-5">
            {([
              { t: 'humano' as ModelType, icon: User, title: 'Perfil Humano', desc: 'Ideal para roupas, calçados e provador de modelos.' },
              { t: 'objeto' as ModelType, icon: Package, title: 'Dimensões do Objeto', desc: 'Ideal para canecas, eletrônicos, móveis ou embalagens.' },
            ]).map(({ t, icon: Icon, title, desc }) => (
              <button key={t} type="button" onClick={() => pick(t)} className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111524]/40 p-5 text-left transition hover:border-[#0094eb]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-[#0094eb]"><Icon size={24} /></div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">{title}</h4>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              </button>
            ))}
            <button type="button" onClick={() => setPickOpen(false)} className={`${ghostBtn} w-full`}>Cancelar</button>
          </div>
        </Modal>
      )}

      {formOpen && (
        <Modal title={`${editing ? 'Editar' : 'Novo'} ${isObj ? 'Objeto' : 'Humano'}`} onClose={closeForm}>
          <div className="space-y-5 p-5">
            <div className="space-y-2">
              <label className={labelCls}>{isObj ? 'Nome do objeto' : 'Nome do modelo'} <span className="text-rose-500">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isObj ? 'Ex: Caneca Cerâmica 350ml' : 'Ex: Modelo Padrão Feminino'} className={inputCls} />
            </div>

            {isObj ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><label className={labelCls}>Altura</label>{unitInput(form.height, (v) => setForm({ ...form, height: v }), 'Ex: 50')}</div>
                <div className="space-y-2"><label className={labelCls}>Largura</label>{unitInput(form.width, (v) => setForm({ ...form, width: v }), 'Ex: 30')}</div>
                <div className="space-y-2"><label className={labelCls}>Comprimento</label>{unitInput(form.length, (v) => setForm({ ...form, length: v }), 'Ex: 20')}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className={labelCls}>Altura em cm <span className="text-rose-500">*</span></label>
                {unitInput(form.height, (v) => setForm({ ...form, height: v }), 'Ex: 170')}
              </div>
            )}

            <div className="space-y-2">
              <label className={labelCls}>Peso em gramas <span className="text-xs font-normal text-slate-400">(opcional)</span></label>
              {unitInput(form.weight, (v) => setForm({ ...form, weight: v }), 'Ex: 450', 'g')}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Campos adicionais</label>
                <button type="button" onClick={() => setForm((p) => ({ ...p, extras: [...p.extras, { id: uid(), name: '', value: '' }] }))} className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-[#0094eb]/10 px-3 py-1.5 text-xs font-black text-[#0094eb] transition hover:bg-[#0094eb] hover:text-white">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
              {form.extras.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111524] py-4 text-center text-sm text-slate-400">
                  Nenhum campo adicional. Clique em "Adicionar" para incluir.
                </p>
              ) : (
                form.extras.map((x, i) => (
                  <div key={x.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111524] p-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                    <div className="flex-1 space-y-2">
                      <input value={x.name} onChange={(e) => setExtra(x.id, 'name', e.target.value)} placeholder={isObj ? 'Nome, ex: Peso ou Volume' : 'Nome, ex: Busto ou Peso'} className={inputCls} />
                      <input value={x.value} onChange={(e) => setExtra(x.id, 'value', e.target.value)} placeholder={isObj ? 'Valor, ex: 2kg ou 350ml' : 'Valor, ex: 85cm ou 65kg'} className={inputCls} />
                    </div>
                    <button type="button" title="Remover campo" onClick={() => setForm((p) => ({ ...p, extras: p.extras.filter((e) => e.id !== x.id) }))} className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} className={`${ghostBtn} flex-1`}>Cancelar</button>
              <button type="button" onClick={submit} disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null} {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDeleteDialog isOpen={!!del} title="EXCLUIR PERFIL" itemName={del?.name} onConfirm={confirmDelete} onCancel={() => setDel(null)} />
    </DashboardLayout>
  );
}