import React, { useEffect, useState } from "react";
import { useLoja } from "@/contexts/LojaContext";
import {
  AffiliateDatabaseService,
  AffiliateSummary,
  ReferralDetail,
} from "@/services/AffiliateDatabaseService";
import { Copy, MessageCircle, TrendingUp, Hourglass, Wallet, Users, Sparkles } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReferralDetailsTable } from "@/components/afiliados/ReferralDetailsTable";
import { ReferralSimulator, REF_PLANS, REF_RATE, brl } from "@/components/afiliados/ReferralSimulator";
import { ReferralMilestones } from "@/components/afiliados/ReferralMilestones";

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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0a84ff] via-[#0057d9] to-[#0b2a8a] p-6 md:p-8 text-white shadow-xl shadow-blue-700/30 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-[#fd8539]/40 blur-3xl" />
          <div className="absolute -left-16 -bottom-20 w-64 h-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative space-y-4 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Clube SLL
            </span>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              Cada loja que você indica te paga <span className="text-amber-300">todo mês.</span>
            </h1>
            <p className="text-sm md:text-base text-white/90">
              Receba 10% de comissão recorrente enquanto a loja indicada continuar assinando. Sem limite de indicações.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">10% recorrente</span>
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Sem limite de indicações</span>
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Saque via PIX</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0 bg-white/15 border border-white/25 rounded-xl px-3 py-2.5 text-xs md:text-sm truncate">
                {referralLink || "Gerando seu link..."}
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0068a8] text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                <Copy className="w-4 h-4" /> Copiar link
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Previsão em 12 meses</span>
              <p className="text-2xl font-bold text-slate-800">{brl(forecast12)}</p>
              <p className="text-[11px] text-slate-500">
                {payingRows > 0
                  ? `Com ${payingRows} ${payingRows === 1 ? "loja pagante" : "lojas pagantes"} (plano Pro de referência)`
                  : "Só com a sua 1ª indicação no plano Pro"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center border border-blue-100 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Saldo a liberar</span>
              <p className="text-2xl font-bold text-amber-600">{brl(toRelease)}</p>
              <p className="text-[11px] text-slate-500">Liberado 15 dias após cada pagamento</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-green-200 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Saldo disponível</span>
                <p className="text-2xl font-bold text-green-600">{brl(summary?.available_balance || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!summary || summary.available_balance <= 0}
              className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
            >
              Solicitar saque
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Lojas indicadas</span>
              <p className="text-2xl font-bold text-[#fd8539]">{referredCount}</p>
              <p className="text-[11px] text-slate-500">
                {referredCount === 0 ? "Indique a primeira e comece agora" : "Continue indicando e ganhe mais"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <ReferralSimulator />

        <ReferralMilestones count={referredCount} />

        <ReferralDetailsTable rows={details} />

        {/* Modal de Saque */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-bold text-lg text-slate-800">Solicitar Saque</h3>
              <p className="text-sm text-slate-500">
                Saldo disponível: <strong>{brl(summary?.available_balance || 0)}</strong>
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Chave PIX</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Aleatória</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestWithdrawal}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50"
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