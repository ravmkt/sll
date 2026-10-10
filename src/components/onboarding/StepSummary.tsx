import { useEffect, useState } from 'react';
import { ArrowRight, Check, Circle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validateManager, validateStore, type WizardData } from './shared';

const sb: any = supabase;
const MODULE_NAMES: Record<string, string> = { vidlytics: 'Vidlytics', live_commerce: 'Live Commerce' };

function Row({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
        {ok ? <Check size={12} /> : <Circle size={8} />}
      </span>
      <span className="text-sm text-slate-700">
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
    </li>
  );
}

export function StepSummary({ data, storeId, busy, onFinish }: { data: WizardData; storeId: string; busy: boolean; onFinish: () => void }) {
  const [mods, setMods] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    sb.rpc('get_store_active_modules', { p_store_id: storeId }).then(({ data: m, error }: any) => {
      if (alive) setMods(!error && Array.isArray(m) ? m : []);
    });
    return () => { alive = false; };
  }, [storeId]);

  const storeOk = !validateStore(data);
  const managerOk = !validateManager(data);

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        <Row ok={storeOk} label="Dados da loja" hint={storeOk ? `${data.store_url} · ${data.store_niche}` : 'Preencha o passo 1'} />
        <Row ok={!!data.brand.logo_url} label="Logo da loja" hint={data.brand.logo_url ? undefined : 'Opcional, pode enviar depois.'} />
        <Row ok={managerOk} label="Dados do gestor" hint={managerOk ? data.manager_name : 'Preencha o passo 2'} />
        <Row ok={data.script_verified} label={data.script_verified ? 'Script conectado' : 'Script ainda não verificado'} hint={data.script_verified ? undefined : 'Você pode concluir agora e instalar depois.'} />
      </ul>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Seus módulos</p>
        {mods === null ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          : mods.length === 0 ? <p className="text-xs text-slate-400">Nenhum módulo contratado no momento.</p>
          : (
            <ul className="space-y-2">
              {mods.map((m) => (
                <li key={m} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5">
                  <span className="text-sm font-bold text-slate-800">{MODULE_NAMES[m] ?? m}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Pronto para ativar</span>
                </li>
              ))}
            </ul>
          )}
        <p className="mt-2 text-[11px] text-slate-400">Cada módulo tem a própria configuração no primeiro uso.</p>
      </div>

      <button type="button" disabled={busy} onClick={onFinish}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#0094eb]/30 disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : null}
        Finalizar e acessar o SLL Hub <ArrowRight size={16} />
      </button>
    </div>
  );
}