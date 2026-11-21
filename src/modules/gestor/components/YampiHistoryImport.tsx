import { useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sllBtnGhost } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';

type Resp = {
  processed: number; ok: number; failed: number; no_items: number; errors: string[];
  unknown_status: Record<string, number>; next_page: number; total_pages: number; total_orders: number; done: boolean;
};

async function call(storeId: string, from: number): Promise<Resp> {
  const { data, error } = await supabase.functions.invoke('yampi-import-orders', {
    body: { action: 'import', store_id: storeId, from_page: from, pages: 3 },
  });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context.json(); if (j?.error) msg = String(j.error); } catch { /* mantem */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data as Resp;
}

export default function YampiHistoryImport({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const run = async () => {
    if (!window.confirm('Importar todo o histórico de pedidos e clientes da Yampi? Pode levar alguns minutos. Pedidos já importados não são duplicados.')) return;
    setBusy(true);
    const sum = { processed: 0, ok: 0, failed: 0, no_items: 0 };
    const errors: string[] = [];
    const unknown: Record<string, number> = {};
    let page = 1;
    try {
      for (let guard = 0; guard < 400; guard++) {
        const r = await call(storeId, page);
        sum.processed += r.processed; sum.ok += r.ok; sum.failed += r.failed; sum.no_items += r.no_items;
        errors.push(...r.errors);
        for (const [k, v] of Object.entries(r.unknown_status)) unknown[k] = (unknown[k] || 0) + v;
        setInfo(`Página ${Math.min(r.next_page - 1, r.total_pages)} de ${r.total_pages} · ${sum.ok} pedido(s) gravado(s)`);
        if (r.done) break;
        page = r.next_page;
      }
      const extra = [
        sum.no_items ? `${sum.no_items} sem itens` : '',
        Object.keys(unknown).length ? `status novos: ${Object.entries(unknown).map(([k, v]) => `${k} (${v})`).join(', ')}` : '',
      ].filter(Boolean).join(' · ');
      showSuccess(`Histórico importado: ${sum.ok} de ${sum.processed} pedido(s).${extra ? ' ' + extra : ''}`);
      if (sum.failed) showError(`${sum.failed} falha(s). ${errors.slice(0, 2).join(' | ')}`);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
      setInfo('');
      onDone();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy} onClick={() => void run()} className={sllBtnGhost}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <History size={16} />}
        {busy ? 'Importando...' : 'Importar histórico da Yampi'}
      </button>
      {info && <span className="text-xs font-medium text-slate-500">{info}</span>}
    </div>
  );
}