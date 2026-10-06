import React, { useEffect, useState } from "react";
import { useLoja } from "@/contexts/LojaContext";
import {
  AffiliateDatabaseService,
  AffiliateSummary,
  ReferralDetail,
} from "@/services/AffiliateDatabaseService";
import { Copy, MessageCircle, TrendingUp, Hourglass, Wallet, Users } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReferralDetailsTable } from "@/components/afiliados/ReferralDetailsTable";
import { ReferralSimulator, REF_PLANS, REF_RATE, brl } from "@/components/afiliados/ReferralSimulator";
import { ReferralMilestones } from "@/components/afiliados/ReferralMilestones";
import { ReferralEarningsChart } from "@/components/afiliados/ReferralEarningsChart";
import { BLUE_BTN, CARD, ICON_BOX, LABEL, MUTED, TITLE } from "@/components/afiliados/clubeStyles";

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

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    const [summaryData, referredData] = await Promise.all([
      AffiliateDatabaseService.getSummary(storeId),
      AffiliateDatabaseService.getReferralDetails(storeId),
    ]);
    setSummary(summaryData);
    setDetails(referredData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const referralLink = store?.referral_code
    ? `${window.location.origin}/?ref=${store.referral_code}`
    : "";

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
    } catch (err) {
      console.error(err);
      showError("Erro ao solicitar saque");
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
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0 bg-white/15 border border-white/25 rounded-xl px-3 py-2.5 text-xs md:text-sm truncate text-left">
                  {referralLink || "Gerando seu link..."}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0073c7] text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" /> Copiar link
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

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
              <p className={`text-[10px] ${MUTED}`}>Liberado 15 dias após o pagamento</p>
            </div>
            <div className={ICON_BOX}>
              <Hourglass className="w-4 h-4" />
            </div>
          </div>

          <div className={`${CARD} p-4 space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className={LABEL}>Saldo disponível</span>
                <p className="text-xl font-bold text-green-600">{brl(summary?.available_balance || 0)}</p>
              </div>
              <div className={ICON_BOX}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!summary || summary.available_balance <= 0}
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

        {/* Modal de Saque */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#111524] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <h3 className={`text-lg ${TITLE}`}>Solicitar Saque</h3>
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