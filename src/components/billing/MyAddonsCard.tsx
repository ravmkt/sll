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

interface Row { id: string; quantity: number; cancel_at_period_end: boolean; ends_at: string | null; name: string; price: number; videos: number }
interface Vid { id: string; title: string | null; thumbnail_url: string | null; active: boolean | null; paused_by_quota: boolean; keep_on_downgrade: boolean }

function VideoKeepPicker({ storeId, limit, onClose }: { storeId: string; limit: number; onClose: () => void }) {
  const [vids, setVids] = useState<Vid[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb.rpc('list_store_videos_cap', { p_store_id: storeId });
      const list = ((data || []) as Vid[]).filter((v) => v.active === true || v.paused_by_quota);
      setVids(list);
      const flagged = list.filter((v) => v.keep_on_downgrade).map((v) => v.id);
      setSel(new Set(flagged.length > 0 ? flagged : list.slice(0, limit).map((v) => v.id)));
    })();
  }, [storeId, limit]);

  const toggle = (id: string) => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else if (next.size < limit) next.add(id);
    setSel(next);
  };

  const save = async () => {
    setSaving(true); setErr(null);
    const { error } = await sb.rpc('set_videos_keep', { p_store_id: storeId, p_ids: Array.from(sel) });
    setSaving(false);
    if (error) { setErr('Não foi possível salvar. Tente novamente.'); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
        <h4 className="text-base font-black text-slate-900">Escolha quais vídeos manter ativos</h4>
        <p className="mt-1 text-xs text-slate-600">
          Seu plano passará a permitir {limit} vídeos ativos. Os demais serão apenas pausados, nada é excluído.
          Se você não escolher, mantemos os mais antigos.
        </p>
        <p className="mt-2 text-xs font-bold text-slate-800">{sel.size} de {limit} selecionados</p>
        <ul className="mt-2 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {vids.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-center gap-3 py-2">
                <input type="checkbox" checked={sel.has(v.id)} onChange={() => toggle(v.id)} />
                {v.thumbnail_url
                  ? <img src={v.thumbnail_url} alt="" className="h-10 w-8 rounded object-cover" />
                  : <span className="h-10 w-8 rounded bg-slate-200" />}
                <span className="truncate text-sm text-slate-800">{v.title || 'Sem título'}</span>
              </label>
            </li>
          ))}
        </ul>
        {err && <p className="mt-2 text-xs font-semibold text-rose-600">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">Agora não</button>
          <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-[#0091ff] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Salvar escolha</button>
        </div>
      </div>
    </div>
  );
}

export default function MyAddonsCard({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pickerLimit, setPickerLimit] = useState<number | null>(null);

  const load = useCallback(async (): Promise<Row[]> => {
    const { data: sas } = await sb.from('store_addons')
      .select('id, addon_id, quantity, cancel_at_period_end, ends_at')
      .eq('store_id', storeId).eq('status', 'active');
    const ids = Array.from(new Set((sas || []).map((s: any) => s.addon_id)));
    if (ids.length === 0) { setRows([]); return []; }
    const { data: ads } = await sb.from('addons').select('id, name, price_monthly, billing_type, target_resource, resource_amount').in('id', ids);
    const map = new Map<string, any>((ads || []).map((a: any) => [a.id, a]));
    const list: Row[] = (sas || [])
      .filter((s: any) => map.get(s.addon_id)?.billing_type !== 'one_time')
      .map((s: any) => {
        const a = map.get(s.addon_id);
        return {
          id: s.id, quantity: s.quantity, cancel_at_period_end: s.cancel_at_period_end, ends_at: s.ends_at,
          name: a?.name ?? 'Add-on', price: Number(a?.price_monthly ?? 0),
          videos: a?.target_resource === 'videos' ? Number(a.resource_amount ?? 0) * Number(s.quantity ?? 1) : 0,
        };
      });
    setRows(list);
    return list;
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const openPicker = async (list: Row[]) => {
    const { data: q } = await sb.rpc('check_store_quota', { p_store_id: storeId, p_kind: 'videos', p_extra: 0 });
    if (!q || q.limit == null) return;
    const dropping = list.filter((r) => r.cancel_at_period_end).reduce((s, r) => s + r.videos, 0);
    const after = Number(q.limit) - dropping;
    if (after >= 1 && Number(q.used) > after) setPickerLimit(after);
  };

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
      const fresh = await load();
      if (action === 'cancel' && r.videos > 0) await openPicker(fresh);
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
              {r.cancel_at_period_end && r.videos > 0 && (
                <button type="button" onClick={() => openPicker(rows)} className="mt-1 text-xs font-bold text-[#0091ff] hover:underline">
                  Escolher quais vídeos manter
                </button>
              )}
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
      {pickerLimit !== null && <VideoKeepPicker storeId={storeId} limit={pickerLimit} onClose={() => setPickerLimit(null)} />}
    </section>
  );
}