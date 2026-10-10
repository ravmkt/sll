import { useCallback, useEffect, useState } from 'react';
import {
  getStoreModules,
  setModuleAccess,
  type ModuleKey,
  type StoreModule,
} from '@/services/admin/moduleAccess';

const LABELS: Record<ModuleKey, string> = {
  vidlytics: 'Vidlytics',
  live_commerce: 'Live Commerce',
};

const STATE_TEXT: Record<StoreModule['state'], string> = {
  off: 'Desativado',
  manual: 'Liberado pelo admin',
  paid: 'Assinatura paga',
  plan: 'Incluído no plano',
};

const STATE_STYLE: Record<StoreModule['state'], string> = {
  off: 'bg-slate-100 text-slate-600',
  manual: 'bg-violet-100 text-violet-700',
  paid: 'bg-emerald-100 text-emerald-700',
  plan: 'bg-sky-100 text-sky-700',
};

export function ModuleAccessPanel({ storeId }: { storeId: string }) {
  const [mods, setMods] = useState<StoreModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ModuleKey | null>(null);
  const [days, setDays] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setMods(await getStoreModules(storeId));
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    setMsg(null);
    load();
  }, [load]);

  async function toggle(m: StoreModule) {
    const enable = m.state === 'off';
    setBusy(m.module_key);
    setMsg(null);
    try {
      const r = await setModuleAccess(storeId, m.module_key, enable, enable && days ? Number(days.replace('t', '')) : null, enable && days.startsWith('t'));
      if (r.result === 'noop') setMsg({ type: 'info', text: r.message ?? 'Nenhuma alteração.' });
      else setMsg({ type: 'ok', text: enable ? 'Módulo liberado.' : 'Módulo desativado.' });
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const msgStyle = {
    ok: 'bg-emerald-50 text-emerald-700',
    err: 'bg-red-50 text-red-700',
    info: 'bg-amber-50 text-amber-700',
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Módulos da loja</h3>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Prazo ao liberar
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Sem prazo</option>
            <option value="t7">Teste de 7 dias</option><option value="t14">Teste de 14 dias</option><option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="365">365 dias</option>
          </select>
        </label>
      </div>

      {msg && <p className={`mb-3 rounded-md px-3 py-2 text-xs ${msgStyle[msg.type]}`}>{msg.text}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {mods.map((m) => {
            const locked = m.state === 'plan' || m.state === 'paid';
            return (
              <li key={m.module_key} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{LABELS[m.module_key]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLE[m.state]}`}>
                    {STATE_TEXT[m.state]}{m.status === 'trialing' ? ' (teste)' : ''}
                  </span>
                  {m.ends_at && (
                    <span className="text-xs text-slate-500">
                      até {new Date(m.ends_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={locked || busy === m.module_key}
                  onClick={() => toggle(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                    m.state === 'off' ? 'bg-[#0094eb]' : 'bg-red-600'
                  }`}
                >
                  {busy === m.module_key ? '...' : m.state === 'off' ? 'Ativar' : 'Desativar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ModuleAccessPanel;