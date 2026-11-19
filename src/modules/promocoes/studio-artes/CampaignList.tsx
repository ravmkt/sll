import { useEffect, useState } from 'react';
import { AlertCircle, Copy, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CampaignRow, deleteCampaign, listCampaigns } from './studioService';
import { templateByKey } from './templates';
import { fmtDate } from './lib';
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from './ui';

interface Props {
  storeId: string;
  onNew: () => void;
  onEdit: (c: CampaignRow) => void;
  onReuse: (c: CampaignRow) => void;
}

export default function CampaignList({ storeId, onNew, onEdit, onReuse }: Props) {
  const [items, setItems] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await listCampaigns(storeId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const remove = async (c: CampaignRow) => {
    if (!window.confirm(`Excluir a campanha "${c.name}"?`)) return;
    try {
      await deleteCampaign(c.id);
      toast.success('Campanha excluída');
      setItems((l) => l.filter((x) => x.id !== c.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className={CARD}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">Artes criadas</h2>
        <button className={BTN_PRIMARY} onClick={onNew}><Plus size={16} /> Nova arte</button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin text-[#0094eb]" /> Carregando campanhas...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Nenhuma campanha ainda. Clique em "Nova arte" para começar.</div>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3 text-left font-semibold">Campanha</th>
                <th className="p-3 text-left font-semibold">Template</th>
                <th className="p-3 text-right font-semibold">Produtos</th>
                <th className="p-3 text-right font-semibold">Canais</th>
                <th className="p-3 text-left font-semibold">Termina em</th>
                <th className="p-3 text-left font-semibold">Criada em</th>
                <th className="p-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{c.name}</td>
                  <td className="p-3 text-slate-600">{templateByKey(c.template_key).label}</td>
                  <td className="p-3 text-right text-slate-600">{c.items_count}</td>
                  <td className="p-3 text-right text-slate-600">{c.channels.length}</td>
                  <td className="p-3 text-slate-600">{c.ends_at ? fmtDate(c.ends_at) : '—'}</td>
                  <td className="p-3 text-slate-600">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className={BTN_SECONDARY} onClick={() => onEdit(c)}><Pencil size={14} /> Editar</button>
                      <button className={BTN_SECONDARY} onClick={() => onReuse(c)}><Copy size={14} /> Reaproveitar</button>
                      <button className={BTN_SECONDARY} onClick={() => remove(c)} aria-label="Excluir"><Trash2 size={14} className="text-red-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}