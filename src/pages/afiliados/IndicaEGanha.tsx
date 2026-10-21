import React, { useEffect, useState } from "react";
import { useLoja } from "@/contexts/LojaContext";
import {
  AffiliateDatabaseService,
  AffiliateSummary,
  ReferralDetail,
  AffiliateSettings,
  MyWithdrawal,
} from "@/services/AffiliateDatabaseService";
import { Copy, MessageCircle, TrendingUp, Hourglass, Wallet, Users, ScrollText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ClubeTermsModal } from "@/components/afiliados/ClubeTermsModal";
import { TERMS_VERSION } from "@/components/afiliados/clubeTerms";
import { showSuccess, showError } from "@/utils/toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReferralDetailsTable } from "@/components/afiliados/ReferralDetailsTable";
import { ReferralSimulator, REF_PLANS, REF_RATE, brl } from "@/components/afiliados/ReferralSimulator";
import { ReferralMilestones } from "@/components/afiliados/ReferralMilestones";
import { ReferralEarningsChart } from "@/components/afiliados/ReferralEarningsChart";
import { BLUE_BTN, CARD, ICON_BOX, LABEL, MUTED, TITLE } from "@/components/afiliados/clubeStyles";

const WD_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  paid: "Pago",
  rejected: "Rejeitado",
};

const IndicaEGanha: React.FC = () => {
  const { storeId, store } = useLoja();

  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [details, setDetails] = useState<ReferralDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<AffiliateSettings>({ grace_days: 7, payout_day: 10, min_withdrawal: 50 });
  const [withdrawals, setWithdrawals] = useState<MyWithdrawal[]>([]);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    const [summaryData, referredData] = await Promise.all([
      AffiliateDatabaseService.getSummary(storeId),
      AffiliateDatabaseService.getReferralDetails(storeId),
    ]);
    setSummary(summaryData);
    setDetails(referredData);
    const [st, wd] = await Promise.all([
      AffiliateDatabaseService.getSettings(),
      AffiliateDatabaseService.getMyWithdrawals(storeId),
    ]);
    setSettings(st);
    setWithdrawals(wd);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    AffiliateDatabaseService.getTermsAcceptance(storeId, TERMS_VERSION).then((r) => {
      if (!alive) return;
      setTermsAccepted(!!r);
      if (!r) setShowTerms(true);
    });
    return () => {
      alive = false;
    };
  }, [storeId]);

  const referralLink = store?.referral_code
    ? `${window.location.origin}/?ref=${store.referral_code}`
    : "";

  const openProof = async (ref: string) => {
    const w = window.open("about:blank", "_blank");
    try {
      const url = await AffiliateDatabaseService.getProofUrl(ref);
      if (w) w.location.href = url;
    } catch {
      if (w) w.close();
      showError("Não foi possível abrir o comprovante.");
    }
  };

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showSuccess("Link copiado! Compartilhe com seus amigos.");
  };

  const handleWhatsApp = () => {
    if (!referralLink) return;
    const text = `Conheci o SLL Hub, uma plataforma com ferramentas para aumentar as vendas da sua loja virtual. Conheça pelo meu link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const handleRequestWithdrawal = async () => {
    if (!storeId || !amount || !pixKey) return;
    const numericAmount = parseFloat(amount.replace(",", "."));

    if (!(numericAmount > 0)) {
      showError("Informe um valor válido");
      return;
    }
    if (numericAmount < settings.min_withdrawal) {
      showError(`Valor mínimo para saque: ${brl(settings.min_withdrawal)}`);
      return;
    }
    if (!summary || numericAmount > summary.available_balance) {
      showError("Saldo insuficiente");
      return;
    }

    setSubmitting(true);
    try {
      await AffiliateDatabaseService.requestWithdrawal({
        storeId,
        amount: numericAmount,
        pixKey,
        pixKeyType,
      });
      showSuccess("Solicitação enviada! Seu saque será processado em breve.");
      setShowWithdrawModal(false);
      setAmount("");
      setPixKey("");
      loadData();
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || "").includes("Valor mínimo")) {
        showError(String(err.message));
      } else if (err?.code === "23514" || String(err?.message || "").includes("Saldo insuficiente")) {
        showError("Saldo insuficiente para este saque.");
      } else if (err?.code === "42501") {
        showError("Não foi possível registrar o saque. Verifique os dados e tente novamente.");
      } else {
        showError("Erro ao solicitar saque");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-slate-400 text-sm">Carregando dados de indicações...</div>
      </DashboardLayout>
    );
  }

  const referredCount = summary?.total_referred_stores || 0;
  const today = new Date();
  const nextPayout = new Date(
    today.getFullYear(),
    today.getMonth() + (today.getDate() < settings.payout_day ? 0 : 1),
    settings.payout_day,
  );
  const nextPayoutLabel = nextPayout.toLocaleDateString("pt-BR");
  const payingRows = details.filter((d) => d.status === "paid").length;
  const toRelease = details.reduce((sum, d) => sum + d.commission_pending, 0);
  const refCommission = (REF_PLANS.find((p) => p.key === "pro")?.price ?? 99.9) * REF_RATE;
  const forecast12 = Math.max(payingRows, 1) * refCommission * 12;

  const modalInput =
    "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b0e1a] text-slate-800 dark:text-white text-sm";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0094eb] via-[#0073c7] to-[#003f8f] p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(253,133,57,0.45),transparent_70%)]" />
          <div className="absolute -left-16 -bottom-20 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.3),transparent_70%)]" />
          <div className="relative flex flex-col md:flex-row items-center gap-5 md:gap-8">
            <div className="shrink-0 rounded-2xl bg-white p-2 shadow-md">
              <img src="/clube-sll-logo.png" alt="Clube SLL" className="h-24 md:h-28 w-auto object-contain" />
            </div>
            <div className="flex-1 min-w-0 w-full space-y-3 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-black leading-tight">
                Cada loja que você indica te paga{" "}
                <span className="bg-gradient-to-r from-[#ffc38f] to-[#fd8539] bg-clip-text text-transparent">todo mês.</span>
              </h1>
              <p className="text-sm text-white/80">
                Receba 10% de comissão recorrente enquanto a loja indicada continuar assinando. Sem limite de indicações.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">10% recorrente</span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">Sem limite de indicações</span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25">Saque via PIX</span>
                <Link
                  to="/dashboard/afiliados/regras"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fd8539] text-white hover:bg-[#e87420] transition-colors"
                >
                  <ScrollText className="w-3.5 h-3.5" /> Regras do Clube
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0 bg-white/15 border border-white/25 rounded-xl px-3 py-2.5 text-xs md:text-sm truncate text-left">
                  {termsAccepted ? referralLink || "Gerando seu link..." : "Link bloqueado até você aceitar as regras do Clube"}
                </div>
                <button
                  onClick={() => (termsAccepted ? handleCopyLink() : setShowTerms(true))}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0073c7] text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" /> Copiar link
                </button>
                <button
                  onClick={() => (termsAccepted ? handleWhatsApp() : setShowTerms(true))}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        {termsAccepted === false && (
          <div className="rounded-2xl border border-[#fd8539]/40 bg-[#fd8539]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#fd8539] shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm ${TITLE}`}>Ative o seu link de indicação</p>
                <p className={`text-xs ${MUTED}`}>Leia e aceite as regras do Clube SLL para começar a indicar e receber comissões.</p>
              </div>
            </div>
            <button
              onClick={() => setShowTerms(true)}
              className="px-4 py-2 rounded-xl bg-[#fd8539] hover:bg-[#e87420] text-white text-sm font-bold transition-colors cursor-pointer shrink-0"
            >
              Ler regras e ativar
            </button>
          </div>
        )}

        {/* Cards compactos */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className={`${CARD} p-4 flex items-start justify-between gap-2`}>
            <div className="space-y-0.5 min-w-0">
              <span className={LABEL}>Previsão 12 meses</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{brl(forecast12)}</p>
              <p className={`text-[10px] ${MUTED}`}>
                {payingRows > 0
                  ? `${payingRows} ${payingRows === 1 ? "loja pagante" : "lojas pagantes"} (Pro)`
                  : "Com a 1ª indicação no Pro"}
              </p>
            </div>
            <div className={ICON_BOX}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className={`${CARD} p-4 flex items-start justify-between gap-2`}>
            <div className="space-y-0.5 min-w-0">
              <span className={LABEL}>Saldo a liberar</span>
              <p className="text-xl font-bold text-[#fd8539]">{brl(toRelease)}</p>
              <p className={`text-[10px] ${MUTED}`}>Liberado {settings.grace_days} dias após o pagamento</p>
            </div>
            <div className={ICON_BOX}>
              <Hourglass className="w-4 h-4" />
            </div>
          </div>

          <div className={`${CARD} p-4 space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className={LABEL}>Saldo disponível</span>
                <p className={`text-xl font-bold ${(summary?.available_balance || 0) < 0 ? "text-red-600" : "text-green-600"}`}>{brl(summary?.available_balance || 0)}</p>
                {(summary?.available_balance || 0) < 0 && (
                  <p className={`text-[10px] ${MUTED}`}>Saldo devedor por estorno ou chargeback. Será abatido das próximas comissões.</p>
                )}
              </div>
              <div className={ICON_BOX}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!termsAccepted || !summary || summary.available_balance < settings.min_withdrawal}
              className={`w-full py-1.5 rounded-lg ${BLUE_BTN} text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer`}
            >
              Solicitar saque
            </button>
          </div>

          <div className={`${CARD} p-4 flex items-start justify-between gap-2`}>
            <div className="space-y-0.5 min-w-0">
              <span className={LABEL}>Lojas indicadas</span>
              <p className="text-xl font-bold text-[#0094eb]">{referredCount}</p>
              <p className={`text-[10px] ${MUTED}`}>
                {referredCount === 0 ? "Indique a primeira agora" : "Continue indicando"}
              </p>
            </div>
            <div className={ICON_BOX}>
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <ReferralDetailsTable rows={details} />

        <ReferralEarningsChart storeId={storeId} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <ReferralSimulator />
          <ReferralMilestones count={referredCount} />
        </div>

        {withdrawals.length > 0 && (
          <div className={`${CARD} p-4 space-y-2`}>
            <h3 className={`text-sm ${TITLE}`}>Meus saques</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{brl(w.amount)}</p>
                    <p className={`text-[11px] ${MUTED}`}>{new Date(w.requested_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {w.status === "paid" && w.proof_url && (
                      <button
                        onClick={() => openProof(w.proof_url as string)}
                        className="text-xs font-semibold text-[#0094eb] hover:underline cursor-pointer"
                      >
                        Ver comprovante
                      </button>
                    )}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{WD_LABEL[w.status] || w.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ClubeTermsModal
          open={showTerms && termsAccepted === false}
          storeId={storeId as string}
          settings={settings}
          onClose={() => setShowTerms(false)}
          onAccepted={() => {
            setTermsAccepted(true);
            setShowTerms(false);
          }}
        />

        {/* Modal de Saque */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#111524] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <h3 className={`text-lg ${TITLE}`}>Solicitar Saque</h3>
              <p className={`text-xs ${MUTED}`}>
                Mínimo de {brl(settings.min_withdrawal)}. Pagamos todo dia {settings.payout_day} os saques solicitados até o dia anterior. Próximo pagamento: {nextPayoutLabel}.
              </p>
              <p className={`text-sm ${MUTED}`}>
                Saldo disponível: <strong className="text-slate-800 dark:text-white">{brl(summary?.available_balance || 0)}</strong>
              </p>

              <div className="space-y-1">
                <label className={LABEL}>Valor</label>
                <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={modalInput} />
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Tipo de Chave PIX</label>
                <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} className={modalInput}>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Aleatória</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Chave PIX</label>
                <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Digite sua chave PIX" className={modalInput} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestWithdrawal}
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl ${BLUE_BTN} text-sm font-semibold disabled:opacity-40 cursor-pointer`}
                >
                  {submitting ? "Enviando..." : "Confirmar Saque"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default IndicaEGanha;