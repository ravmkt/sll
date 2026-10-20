import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const brl = (cents: number) => ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MSG: Record<string, string> = {
  DADOS_FISCAIS_OBRIGATORIOS: 'Preencha seus dados de faturamento (CPF/CNPJ) em Configurações antes de comprar.',
  PACOTE_INVALIDO: 'Este pacote não está mais disponível.',
  LOJA_INVALIDA: 'Você não tem permissão para comprar nesta loja.',
};

interface Pack { id: string; key: string; name: string; qty: number; price_cents: number }

export default function NoahPackModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    sb.from('noah_credit_packs').select('id,key,name,qty,price_cents').eq('is_active', true).order('sort')
      .then(({ data }: any) => setPacks((data ?? []) as Pack[]));
  }, []);

  const buy = async (p: Pack) => {
    setBusy(p.key); setErr(null);
    const { data, error } = await sb.functions.invoke('noah-buy-pack', { body: { store_id: storeId, pack_key: p.key } });
    if (error) {
      const b = await (error as any).context?.json?.().catch(() => null);
      setErr(MSG[b?.error] ?? b?.message ?? 'Não foi possível gerar o pagamento. Tente novamente.');
    } else if (data?.invoice_url) {
      setUrl(data.invoice_url);
      window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    } else {
      setErr('Não foi possível gerar o pagamento. Tente novamente.');
    }
    setBusy(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Pacote extra de mensagens do Noah</h3>
            <p className="mt-1 text-xs text-slate-600">Pagamento único. As mensagens não expiram e são usadas depois da franquia do plano.</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {packs === null && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
          {packs?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nenhum pacote disponível no momento. Fale com o suporte.</p>}
          {packs?.map((p) => (
            <div key={p.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{p.qty.toLocaleString('pt-BR')} mensagens</p>
                <p className="text-xs text-slate-500">{brl(p.price_cents)}</p>
              </div>
              <button type="button" disabled={!!busy} onClick={() => void buy(p)}
                className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc] disabled:cursor-not-allowed disabled:opacity-50">
                {busy === p.key ? 'Gerando...' : 'Comprar'}
              </button>
            </div>
          ))}
        </div>

        {err && <p className="mt-3 text-xs font-semibold text-rose-600">{err}</p>}
        {url && (
          <p className="mt-3 text-xs text-slate-600">
            Pagamento gerado.{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#0094eb] underline">Abrir página de pagamento</a>.
            {' '}As mensagens são liberadas assim que o pagamento for confirmado.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}