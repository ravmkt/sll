import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AffiliateDatabaseService, type AffiliateSettings } from '@/services/AffiliateDatabaseService';
import { showError, showSuccess } from '@/utils/toast';
import { CARD, MUTED, TITLE } from '@/components/afiliados/clubeStyles';
import { ClubeRulesContent } from '@/components/afiliados/ClubeRulesContent';
import { TERMS_VERSION } from '@/components/afiliados/clubeTerms';

export default function ClubeRules() {
  const { storeId } = useLoja();
  const [settings, setSettings] = useState<AffiliateSettings>({ grace_days: 7, payout_day: 10, min_withdrawal: 50 });
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    Promise.all([
      AffiliateDatabaseService.getSettings(),
      AffiliateDatabaseService.getTermsAcceptance(storeId, TERMS_VERSION),
    ])
      .then(([s, a]) => {
        if (!alive) return;
        setSettings(s);
        setAcceptedAt(a ? a.accepted_at : null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [storeId]);

  const accept = async () => {
    if (!storeId) return;
    setBusy(true);
    try {
      await AffiliateDatabaseService.acceptTerms(storeId, TERMS_VERSION);
      setAcceptedAt(new Date().toISOString());
      showSuccess('Regras aceitas! Seu link de indicação está ativo.');
    } catch (e) {
      console.error(e);
      showError('Não foi possível registrar o aceite. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <Link to="/dashboard/afiliados" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0094eb] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Clube SLL
        </Link>

        <div className="space-y-1">
          <h1 className={`text-2xl ${TITLE}`}>Regras do Clube SLL</h1>
          <p className={`text-sm ${MUTED}`}>Versão {TERMS_VERSION}. Estas regras valem para todos os participantes do programa de indicação.</p>
        </div>

        <div className={`${CARD} p-5`}>
          {loading ? <p className={`text-sm ${MUTED}`}>Carregando...</p> : <ClubeRulesContent settings={settings} />}
        </div>

        {!loading && (
          <div className={`${CARD} space-y-3 p-5`}>
            {acceptedAt ? (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Você aceitou estas regras em {new Date(acceptedAt).toLocaleDateString('pt-BR')}.
                </p>
                <Link to="/dashboard/afiliados" className="inline-block rounded-xl bg-[#0094eb] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007fcc]">
                  Ir para o meu link
                </Link>
              </>
            ) : (
              <>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0094eb]" />
                  <span>Li e aceito as regras do Clube SLL.</span>
                </label>
                <button
                  type="button"
                  disabled={!checked || busy}
                  onClick={accept}
                  className="cursor-pointer rounded-xl bg-[#0094eb] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007fcc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Registrando...' : 'Aceitar e ativar meu link'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}