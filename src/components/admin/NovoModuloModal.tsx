import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createHubModule } from '@/services/admin/modulesService';
import { Modal } from '@/components/admin/StoreModals';
import { INPUT, STATUS_LABEL } from '@/components/admin/moduleUi';

const LBL = 'text-xs font-bold uppercase tracking-wider text-slate-500';
const slugify = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

export default function NovoModuloModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState('coming_soon');
  const [pub, setPub] = useState(false);
  const [busy, setBusy] = useState(false);

  const slugOk = /^[a-z][a-z0-9_]{1,39}$/.test(slug);
  const ok = name.trim().length >= 2 && slugOk;

  const onName = (v: string) => {
    setName(v);
    if (!touched) setSlug(slugify(v));
  };

  const submit = async () => {
    setBusy(true);
    try {
      await createHubModule(slug, name.trim(), status, status === 'active' && pub);
      toast.success('Módulo criado.');
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível criar o módulo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Novo módulo" onClose={onClose}>
      <label className="block space-y-1">
        <span className={LBL}>Nome</span>
        <input value={name} onChange={(e) => onName(e.target.value)} className={INPUT} placeholder="Ex.: Reviews de Clientes" autoFocus />
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Chave (slug)</span>
        <input value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase()); }} className={`${INPUT} font-mono ${slug && !slugOk ? 'border-rose-500' : ''}`} placeholder="reviews_clientes" />
        <span className={`block text-[13px] ${slug && !slugOk ? 'text-rose-400' : 'text-slate-500'}`}>
          Minúsculas, números e _, começando por letra. Não dá para mudar depois.
        </span>
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Status inicial</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
          <option value="coming_soon">{STATUS_LABEL.coming_soon}</option>
          <option value="hidden">{STATUS_LABEL.hidden}</option>
          <option value="active">{STATUS_LABEL.active}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px] text-slate-300">
        <input type="checkbox" checked={status === 'active' && pub} disabled={status !== 'active'} onChange={(e) => setPub(e.target.checked)} />
        À venda para os lojistas {status !== 'active' && <span className="text-slate-500">(só módulos ativos)</span>}
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] font-bold text-slate-300 hover:bg-white/10">Cancelar</button>
        <button type="button" disabled={!ok || busy} onClick={submit} className="flex items-center gap-2 rounded-lg bg-[#fd8539] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
          {busy && <Loader2 size={12} className="animate-spin" />} Criar módulo
        </button>
      </div>
    </Modal>
  );
}