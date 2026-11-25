import { supabase } from '@/lib/supabase';
import { showError } from '@/utils/toast';
import { getProposal } from './propostas';
import { printProposal } from './proposalPrint';

const sb: any = supabase;

/** Abre a janela antes do await (evita bloqueio de pop-up), carrega a proposta e imprime. */
export async function openProposalPrint(storeId: string, proposalId: string): Promise<void> {
  const w = window.open('', '_blank');
  if (!w) { showError('Libere os pop-ups do navegador para imprimir.'); return; }
  w.document.write('<p style="font-family:Arial;padding:24px">Preparando proposta...</p>');
  try {
    const { proposal, items } = await getProposal(proposalId);
    const sid = (proposal as any).seller_id as string | null;
    const [st, mem] = await Promise.all([
      sb.from('stores').select('*').eq('id', storeId).maybeSingle(),
      sid
        ? sb.from('store_members').select('display_name').eq('store_id', storeId).or(`user_id.eq.${sid},id.eq.${sid}`).limit(1)
        : Promise.resolve({ data: null }),
    ]);
    const storeName = String(st?.data?.name || st?.data?.store_name || '');
    const seller = String(mem?.data?.[0]?.display_name || '');
    printProposal(w, proposal, items, storeName, seller);
  } catch (e) {
    w.close();
    showError(e instanceof Error ? e.message : 'Erro ao preparar a impressao.');
  }
}