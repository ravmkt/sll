import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { deleteCustomFieldDef, listCustomFieldDefs, saveCustomFieldDef } from '../productService';
import type { CustomFieldDef, CustomFieldType, ProductRow } from '../types';

const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const sel = 'h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700';
const TYPES: { v: CustomFieldType; l: string }[] = [
  { v: 'text', l: 'Texto' }, { v: 'number', l: 'Número' }, { v: 'date', l: 'Data' },
  { v: 'select', l: 'Lista de opções' }, { v: 'boolean', l: 'Sim/Não' },
];

interface Props { storeId: string; product: ProductRow; onChange: (patch: Partial<ProductRow>) => void }

export default function CustomFieldsTab({ storeId, product, onChange }: Props) {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [options, setOptions] = useState('');

  const load = useCallback(async () => {
    try { setDefs(await listCustomFieldDefs(storeId)); }
    catch { showError('Erro ao carregar campos extras.'); }
    finally { setLoading(false); }
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const values = product.extra_fields || {};
  const setVal = (key: string, v: string | number | boolean | null) =>
    onChange({ extra_fields: { ...values, [key]: v } });

  const add = async () => {
    if (!label.trim()) return showError('Informe o nome do campo.');
    try {
      await saveCustomFieldDef(storeId, {
        entity: 'product', key: label, label: label.trim(), field_type: type,
        options: type === 'select' ? options.split(',').map((o) => o.trim()).filter(Boolean) : [],
        sort_order: defs.length,
      });
      setLabel(''); setOptions(''); setType('text');
      await load();
      showSuccess('Campo criado.');
    } catch (e) { showError(e instanceof Error ? e.message : 'Erro ao criar campo.'); }
  };

  const remove = async (d: CustomFieldDef) => {
    if (!d.id) return;
    try { await deleteCustomFieldDef(storeId, d.id); await load(); }
    catch { showError('Erro ao remover campo.'); }
  };

  const render = (d: CustomFieldDef) => {
    const v = values[d.key];
    if (d.field_type === 'boolean')
      return <input type="checkbox" className="h-4 w-4" checked={!!v} onChange={(e) => setVal(d.key, e.target.checked)} />;
    if (d.field_type === 'select')
      return (
        <select className={sel} value={String(v ?? '')} onChange={(e) => setVal(d.key, e.target.value || null)}>
          <option value="">Selecione uma opção</option>
          {d.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    return (
      <Input
        type={d.field_type === 'number' ? 'number' : d.field_type === 'date' ? 'date' : 'text'}
        value={String(v ?? '')}
        onChange={(e) => setVal(d.key, d.field_type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
      />
    );
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {defs.length === 0 && <p className="text-sm text-slate-500">Nenhum campo extra ainda. Crie abaixo (ex.: Composição, Gênero, ML - Marca).</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {defs.map((d) => (
          <div key={d.key}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500">{d.label}</label>
              <button type="button" title="Remover campo (de todos os produtos)" onClick={() => remove(d)} className="text-slate-400 hover:text-rose-500"><Trash2 size={13} /></button>
            </div>
            {render(d)}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <p className="mb-3 text-sm font-semibold">Novo campo</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><label className={lbl}>Nome</label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: ML - Marca" /></div>
          <div>
            <label className={lbl}>Tipo</label>
            <select className={sel} value={type} onChange={(e) => setType(e.target.value as CustomFieldType)}>
              {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="flex items-end"><Button type="button" onClick={add} className="w-full"><Plus size={14} /> Criar</Button></div>
          {type === 'select' && (
            <div className="sm:col-span-4"><label className={lbl}>Opções (separadas por vírgula)</label><Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Verão, Inverno, Outono" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
