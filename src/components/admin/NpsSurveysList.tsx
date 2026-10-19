import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  deleteNpsSurvey, listAdminStores, listNpsStats, listNpsSurveys, resetNpsStore, saveNpsSurvey,
  type AdminSurvey, type NpsStat,
} from '@/services/admin/npsSurveys';
import NpsSurveyEditor from '@/components/admin/NpsSurveyEditor';
import NpsResponses from '@/components/admin/NpsResponses';

const TH = 'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const ICONBTN = 'cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white';

const rule = (s: AdminSurvey) => {
  const when = s.min_days_after_signup > 0 ? `${s.min_days_after_signup} dia(s) após o cadastro` : 'Logo após o cadastro';
  const who = s.target === 'all' ? 'todas as lojas' : `${s.store_ids.length} loja(s)`;
  return `${when} · repete a cada ${s.cooldown_days} dias · volta em ${s.dismiss_days} dias se dispensar · ${who}`;
};

export default function NpsSurveysList() {
  const [surveys, setSurveys] = useState<AdminSurvey[]>([]);
  const [stats, setStats] = useState<Record<string, NpsStat>>({});
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ s: AdminSurvey | null } | null>(null);
  const [viewing, setViewing] = useState<AdminSurvey | null>(null);
  const [resetId, setResetId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSurveys(await listNpsSurveys());
      setStats(await listNpsStats().catch(() => ({})));
    } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar pesquisas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    listAdminStores().then(setStores).catch(() => { /* opcional */ });
  }, [load]);

  const toggle = async (s: AdminSurvey) => {
    setErr(''); setMsg('');
    try { await saveNpsSurvey({ ...s, enabled: !s.enabled }); await load(); setMsg(s.enabled ? 'Pesquisa desativada.' : 'Pesquisa ativada.'); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao atualizar'); }
  };

  const remove = async (s: AdminSurvey) => {
    if (!s.id || !window.confirm(`Excluir a pesquisa "${s.name}"? As perguntas serão apagadas; as respostas já enviadas continuam no histórico.`)) return;
    setErr(''); setMsg('');
    try { await deleteNpsSurvey(s.id); await load(); setMsg('Pesquisa excluída.'); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao excluir'); }
  };

  const reset = async () => {
    if (!resetId) { setErr('Escolha a loja que será resetada.'); return; }
    const nm = stores.find((s) => s.id === resetId)?.name ?? 'a loja';
    if (!window.confirm(`Resetar o NPS de "${nm}"? Respostas e dispensas dessa loja serão apagadas e o balão volta a aparecer.`)) return;
    setErr(''); setMsg('');
    try { await resetNpsStore(resetId); await load(); setMsg(`NPS de "${nm}" resetado. Recarregue a página dessa loja.`); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao resetar'); }
  };

  return (
    <section className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-100">Pesquisas NPS</h4>
        <button type="button" onClick={() => setEditing({ s: null })}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0094eb] px-3 py-2 text-xs font-black text-white hover:bg-[#0082d1]">
          <Plus className="h-4 w-4" /> Nova pesquisa
        </button>
      </div>
      {err && <p className="text-sm font-semibold text-rose-400">{err}</p>}
      {msg && !err && <p className="text-sm font-semibold text-emerald-400">{msg}</p>}

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-800/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-700/80">
              <tr>
                <th className={TH}>Pesquisa</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} text-center`}>Respostas</th>
                <th className={`${TH} text-center`}>Visualizações</th>
                <th className={`${TH} text-center`}>Fechamentos</th>
                <th className={TH}>Quando aparece</th>
                <th className={`${TH} text-center`}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {surveys.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhuma pesquisa criada.</td></tr>}
              {surveys.map((s) => {
                const st = stats[s.id ?? ''] ?? { views: 0, dismissals: 0 };
                return (
                  <tr key={s.id} onClick={() => setViewing(s)} className="cursor-pointer align-top hover:bg-white/5" title="Clique para ver as respostas">
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-100">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.questions.length} perguntas</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button type="button" onClick={(e) => { e.stopPropagation(); void toggle(s); }} title="Ativar/desativar"
                        className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                        {s.enabled ? 'Ativa' : 'Inativa'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-white">{s.responses_count ?? 0}</td>
                    <td className="px-3 py-3 text-center text-slate-300">{st.views}</td>
                    <td className="px-3 py-3 text-center text-slate-300">{st.dismissals}</td>
                    <td className="max-w-[320px] px-3 py-3 text-slate-400">{rule(s)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-1">
                        <button type="button" className={ICONBTN} onClick={(e) => { e.stopPropagation(); setEditing({ s }); }} title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button type="button" className={`${ICONBTN} hover:!text-rose-400`} onClick={(e) => { e.stopPropagation(); void remove(s); }} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/60 p-3">
        <span className="text-xs font-bold text-slate-200">Resetar para teste:</span>
        <select value={resetId} onChange={(e) => setResetId(e.target.value)}
          className="h-9 max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
          <option value="">Escolha a loja...</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" onClick={reset}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-3 py-2 text-xs font-black text-white hover:bg-[#e8742a]">
          <RotateCcw className="h-3.5 w-3.5" /> Resetar loja
        </button>
        <span className="text-[11px] text-slate-500">Apaga respostas e dispensas dessa loja para o balão voltar.</span>
      </div>

      <NpsSurveyEditor open={!!editing} survey={editing?.s ?? null} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setMsg('Pesquisa salva.'); void load(); }} />

      <Dialog open={!!viewing} onOpenChange={(v) => { if (!v) setViewing(null); }}>
        <DialogContent className="flex max-h-[88vh] max-w-6xl flex-col gap-3 overflow-hidden border-slate-700 bg-[#0f1322] p-5 text-slate-100 sm:rounded-2xl">
          <DialogTitle className="text-lg font-black text-white">Respostas · {viewing?.name}</DialogTitle>
          <DialogDescription className="sr-only">Todas as respostas desta pesquisa</DialogDescription>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
            {viewing && <NpsResponses days={365} surveyId={viewing.id} />}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}