import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { listNpsResponses, type NpsResponse } from '@/services/admin/npsAdmin';
import type { AdminSurvey } from '@/services/admin/npsSurveys';
import NpsResponses from '@/components/admin/NpsResponses';

const CARD = 'rounded-2xl border border-slate-700/80 bg-slate-800/60 p-4';

function Box({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={CARD} style={{ borderColor: `${color}55` }}>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-slate-300">{label}</div>
    </div>
  );
}

export default function NpsSurveyResults({ survey, onBack }: { survey: AdminSurvey; onBack: () => void }) {
  const [rows, setRows] = useState<NpsResponse[] | null>(null);

  useEffect(() => {
    setRows(null);
    listNpsResponses(365, survey.id).then(setRows).catch(() => setRows([]));
  }, [survey.id]);

  const st = useMemo(() => {
    const sc = (rows ?? []).map((r) => r.score as number | null).filter((s): s is number => s != null);
    const pro = sc.filter((s) => s >= 9).length;
    const pas = sc.filter((s) => s >= 7 && s <= 8).length;
    const det = sc.filter((s) => s <= 6).length;
    const nps = sc.length ? Math.round(((pro - det) / sc.length) * 100) : null;
    return { pro, pas, det, nps };
  }, [rows]);

  return (
    <section className="mt-2 space-y-4">
      <button type="button" onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-400">
        <ArrowLeft className="h-4 w-4" /> Voltar para as pesquisas
      </button>
      <div>
        <h3 className="text-lg font-black text-slate-100">{survey.name}</h3>
        <p className="text-xs text-slate-400">{survey.questions.length} perguntas · {survey.enabled ? 'Ativa' : 'Inativa'}</p>
      </div>
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Box label="NPS" value={st.nps ?? '—'} color="#f1f5f9" />
          <Box label="Respostas" value={rows.length} color="#38bdf8" />
          <Box label="Promotores (9-10)" value={st.pro} color="#10b981" />
          <Box label="Neutros (7-8)" value={st.pas} color="#f59e0b" />
          <Box label="Detratores (0-6)" value={st.det} color="#f43f5e" />
        </div>
      )}
      <NpsResponses days={365} surveyId={survey.id} />
    </section>
  );
}