import { useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';

const sb: any = supabase;
type Row = { id: string; name: string; is_sandbox: boolean };

export default function SandboxStoreSelect() {
  const [rows, setRows] = useState<Row[]>([]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.rpc('admin_staging_list_stores');
      if (error) showError(error.message);
      else {
        const list = (data as Row[]) || [];
        setRows(list);
        setValue(list.find((r) => r.is_sandbox)?.id ?? '');
      }
      setLoading(false);
    })();
  }, []);

  const change = async (id: string) => {
    setSaving(true);
    const { error } = await sb.rpc('admin_set_sandbox_store', { p_store_id: id || null });
    setSaving(false);
    if (error) return showError(error.message);
    setValue(id);
    showSuccess(id ? 'Loja Teste definida.' : 'Loja Teste removida.');
  };

  return (
    <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#111524] p-5">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-[#fd8539]" />
        <h3 className="text-base font-bold text-white">Loja Oficial de Testes (Sandbox)</h3>
        {(loading || saving) && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
      </div>
      <p className="text-xs text-slate-400">Essa loja lê as configurações em teste. Todas as outras leem somente o que está publicado ao vivo.</p>
      <select
        value={value}
        disabled={loading || saving}
        onChange={(e) => change(e.target.value)}
        className="w-full cursor-pointer rounded-xl border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#0094eb]"
      >
        <option value="">Nenhuma</option>
        {rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
  );
}