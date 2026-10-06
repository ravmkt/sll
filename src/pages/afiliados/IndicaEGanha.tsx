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
import { CARD, GOLD_BG, GOLD_TEXT, ICON_BOX, LABEL } from "@/components/afiliados/clubeStyles";

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
        <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] p-8 text-white/50 text-sm">Carregando dados de indicações...</div>
      </DashboardLayout>
    );
  }

  const referredCount = summary?.total_referred_stores || 0;
  const payingRows = details.filter((d) => d.status === "paid").length;
  const toRelease = details.reduce((sum, d) => sum + d.commission_pending, 0);
  const refCommission = (REF_PLANS.find((p) => p.key === "pro")?.price ?? 99.9) * REF_RATE;
  const forecast12 = Math.max(payingRows, 1) * refCommission * 12;

  const modalInput =
    "w-full px-3 py-2 rounded-lg border border-[#D4AF37]/30 bg-black text-[#F3E2A9] text-sm placeholder:text-white/30";

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] p-6 space-y-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0A0A0A] to-[#141414] border border-[#D4AF37]/20 p-6 md:p-8 text-white shadow-[0_0_30px_-15px_#D4AF37] relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.25),transparent_70%)]" />
          <div className="relative flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
            <img src="/clube-sll-logo.png" alt="Clube SLL" className="h-20 md:h-[110px] w-auto object-contain" />
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              Cada loja que você indica te paga <span className={GOLD_TEXT}>todo mês.</span>
            </h1>
            <p className="text-sm md:text-base text-white/60">
              Receba 10% de comissão recorrente enquanto a loja indicada continuar assinando. Sem limite de indicações.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-full border border-[#D4AF37]/30 text-[#F3E2A9]">10% recorrente</span>
              <span className="px-3 py-1 rounded-full border border-[#D4AF37]/30 text-[#F3E2A9]">Sem limite de indicações</span>
              <span className="px-3 py-1 rounded-full border border-[#D4AF37]/30 text-[#F3E2A9]">Saque via PIX</span>
            </div>
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0 bg-black border border-[#D4AF37]/30 rounded-xl px-3 py-2.5 text-xs md:text-sm truncate text-[#F3E2A9] text-left">
                {referralLink || "Gerando seu link..."}
              </div>
              <button
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${GOLD_BG} text-black text-sm font-semibold hover:opacity-90 transition-opacity`}
              >
                <Copy className="w-4 h-4" /> Copiar link
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-green-400/40 bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className={`${CARD} p-5 flex items-start justify-between`}>
            <div className="space-y-1">
              <span className={LABEL}>Previsão em 12 meses</span>
              <p className={`text-2xl font-bold ${GOLD_TEXT}`}>{brl(forecast12)}</p>
              <p className="text-[11px] text-white/60">
                {payingRows > 0
                  ? `Com ${payingRows} ${payingRows === 1 ? "loja pagante" : "lojas pagantes"} (plano Pro de referência)`
                  : "Só com a sua 1ª indicação no plano Pro"}
              </p>
            </div>
            <div className={ICON_BOX}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className={`${CARD} p-5 flex items-start justify-between`}>
            <div className="space-y-1">
              <span className={LABEL}>Saldo a liberar</span>
              <p className="text-2xl font-bold text-[#FF6A1A]">{brl(toRelease)}</p>
              <p className="text-[11px] text-white/60">Liberado 15 dias após cada pagamento</p>
            </div>
            <div className={ICON_BOX}>
              <Hourglass className="w-4 h-4" />
            </div>
          </div>

          <div className={`${CARD} p-5 space-y-3`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={LABEL}>Saldo disponível</span>
                <p className={`text-2xl font-bold ${GOLD_TEXT}`}>{brl(summary?.available_balance || 0)}</p>
              </div>
              <div className={ICON_BOX}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!summary || summary.available_balance <= 0}
              className={`w-full py-2 rounded-xl ${GOLD_BG} text-black text-sm font-semibold hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity`}
            >
              Solicitar saque
            </button>
          </div>

          <div className={`${CARD} p-5 flex items-start justify-between`}>
            <div className="space-y-1">
              <span className={LABEL}>Lojas indicadas</span>
              <p className={`text-2xl font-bold ${GOLD_TEXT}`}>{referredCount}</p>
              <p className="text-[11px] text-white/60">
                {referredCount === 0 ? "Indique a primeira e comece agora" : "Continue indicando e ganhe mais"}
              </p>
            </div>
            <div className={ICON_BOX}>
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <ReferralEarningsChart storeId={storeId} />

        <ReferralSimulator />

        <ReferralMilestones count={referredCount} />

        <ReferralDetailsTable rows={details} />

        {/* Modal de Saque */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-[0_0_30px_-15px_#D4AF37]">
              <h3 className="font-bold text-lg text-white">Solicitar Saque</h3>
              <p className="text-sm text-white/60">
                Saldo disponível: <strong className="text-[#F3E2A9]">{brl(summary?.available_balance || 0)}</strong>
              </p>

              <div className="space-y-1">
                <label className={LABEL}>Valor</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className={modalInput}
                />
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Tipo de Chave PIX</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className={modalInput}
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Aleatória</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  className={modalInput}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/30 text-sm font-bold text-white/70 hover:border-[#D4AF37]/60"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestWithdrawal}
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl ${GOLD_BG} text-black text-sm font-semibold hover:opacity-90 disabled:opacity-25`}
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