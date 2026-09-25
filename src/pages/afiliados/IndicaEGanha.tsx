import React, { useEffect, useState } from "react";
import { useLoja } from "@/context/LojaContext";
import {
  AffiliateDatabaseService,
  AffiliateSummary,
  AffiliateReferredDetail,
} from "@/services/AffiliateDatabaseService";
import { DollarSign, Users, Wallet, Copy, Share2 } from "lucide-react";
import { useToast } from "@/utils/toast";

const IndicaEGanha: React.FC = () => {
  const { storeId, store } = useLoja();
  const { toast } = useToast();

  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [referred, setReferred] = useState<AffiliateReferredDetail[]>([]);
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
      AffiliateDatabaseService.getReferredDetails(storeId),
    ]);
    setSummary(summaryData);
    setReferred(referredData);
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
    toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
  };

  const handleRequestWithdrawal = async () => {
    if (!storeId || !amount || !pixKey) return;
    const numericAmount = parseFloat(amount.replace(",", "."));

    if (!summary || numericAmount > summary.available_balance) {
      toast({ title: "Saldo insuficiente", variant: "destructive" });
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
      toast({ title: "Solicitação enviada!", description: "Seu saque será processado em breve." });
      setShowWithdrawModal(false);
      setAmount("");
      setPixKey("");
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao solicitar saque", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">Carregando dados de indicações...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Indica & Ganha</h1>
          <p className="text-sm text-slate-500">
            Indique lojistas e receba 10% de comissão recorrente sobre a assinatura.
          </p>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white text-sm font-bold transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copiar link de indicação
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Gerado</span>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(summary?.total_generated || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center border border-blue-100">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Saldo Disponível</span>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.available_balance || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Lojas Indicadas</span>
            <p className="text-2xl font-bold text-[#fd8539]">
              {summary?.total_referred_stores || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowWithdrawModal(true)}
        disabled={!summary || summary.available_balance <= 0}
        className="px-5 py-2.5 rounded-xl bg-[#fd8539] hover:bg-[#e5762f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
      >
        Solicitar Saque
      </button>

      {/* Tabela de indicados */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Suas Indicações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-[11px] uppercase border-b border-slate-100">
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Comissão</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {referred.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Você ainda não indicou nenhuma loja.
                  </td>
                </tr>
              ) : (
                referred.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{r.referred_store_name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.plan_price_cents ? formatCurrency(r.plan_price_cents / 100) : "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{r.period_reference}</td>
                    <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(r.commission_amount)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-600">
                        {r.status === "paid" ? "Pago" : r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Saque */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Solicitar Saque</h3>
            <p className="text-sm text-slate-500">
              Saldo disponível: <strong>{formatCurrency(summary?.available_balance || 0)}</strong>
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
                className="flex-1 py-2.5 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white text-sm font-bold disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Confirmar Saque"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicaEGanha;

