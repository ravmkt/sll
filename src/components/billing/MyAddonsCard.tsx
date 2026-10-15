import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

const MSG: Record<string, string> = {
  ADDON_AVULSO: 'Este complemento é de pagamento único e não renova.',
  AGUARDANDO_PRIMEIRO_PAGAMENTO: 'Disponível depois da confirmação do primeiro pagamento.',
  ASSINATURA_INDISPONIVEL: 'Sua assinatura não está ativa no momento.',
  VALOR_MINIMO: 'O valor da assinatura ficaria abaixo do mínimo. Fale com o suporte.',
  CICLO_ENCERRADO: 'Este complemento já foi encerrado.',
  VENCIMENTO_INDEFINIDO: 'Não foi possível identificar o próximo vencimento. Fale com o suporte.',
  NAO_AUTORIZADO: 'Você não tem permissão para esta ação.',
};

interface Row { id: string; quantity: number; cancel_at_period_end: boolean; ends_at: string | null; name: string; price: number }

export default function MyAddonsCard({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sas } = await sb.from('store_addons')
      .select('id, addon_id, quantity, cancel_at_period_end, ends_at')
      .eq('store_id', storeId).eq('status', 'active');
    const ids = Array.from(new Set((sas || []).map((s: any) => s.addon_id)));
    if (ids.length === 0) { setRows([]); return; }
    const { data: ads } = await sb.from('addons').select('id, name, price_monthly, billing_type').in('id', ids);
    const map = new Map<string, any>((ads || []).map((a: any) => [a.id, a]));
    setRows((sas || [])
      .filter((s: any) => map.get(s.addon_id)?.billing_type !== 'one_time')
      .map((s: any) => ({
        id: s.id, quantity: s.quantity, cancel_at_period_end: s.cancel_at_period_end, ends_at: s.ends_at,
        name: map.get(s.addon_id)?.name ?? 'Add-on', price: Number(map.get(s.addon_id)?.price_monthly ?? 0),
      })));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const run = async (r: Row, action: 'cancel' | 'keep') => {
    if (action === 'cancel' && !window.confirm(`Cancelar "${r.name}"? Você continua com o recurso até o fim do ciclo atual e a próxima fatura vem sem ele.`)) return;
    setBusy(r.id); setMsg(null);
    const { error } = await sb.functions.invoke('cancel-addon', { body: { store_addon_id: r.id, action } });
    if (error) {
      let code = '';
      try { code = (await error.context.json())?.error ?? ''; } catch { /* sem corpo */ }
      setMsg(MSG[code] ?? 'Não foi possível concluir agora. Tente novamente.');
    } else {
      setMsg(action === 'cancel' ? 'Cancelamento agendado. O complemento segue ativo até o fim do ciclo.' : 'Complemento mantido.');
      await load();
    }
    setBusy(null);
  };

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-black text-slate-900">Meus complementos</h3>
      <ul className="mt-3 divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{r.quantity > 1 ? `${r.quantity}× ` : ''}{r.name}</p>
              <p className="text-xs text-slate-500">
                {brl(r.price * r.quantity)}/mês
                {r.cancel_at_period_end && <span className="ml-2 font-semibold text-amber-700">Cancelado · ativo até {day(r.ends_at)}</span>}
              </p>
            </div>
            {r.cancel_at_period_end ? (
              <button type="button" disabled={busy === r.id} onClick={() => run(r, 'keep')}
                className="shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                Manter complemento
              </button>
            ) : (
              <button type="button" disabled={busy === r.id} onClick={() => run(r, 'cancel')}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Cancelar complemento
              </button>
            )}
          </li>
        ))}
      </ul>
      {msg && <p className="mt-3 text-xs font-semibold text-slate-700">{msg}</p>}
    </section>
  );
}