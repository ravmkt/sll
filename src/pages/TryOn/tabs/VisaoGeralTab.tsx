import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, Palette, Code2, RefreshCw } from 'lucide-react';
import { getOverview, getSettings, type TryOnOverview, type TryOnSettings } from '../services/tryonAdmin';

const LABELS: Record<string, string> = {
  generations_month: 'Geracoes no mes',
  generations_total: 'Geracoes no total',
  total_results: 'Resultados',
  done: 'Concluidas',
  failed: 'Falhas',
  success_rate: 'Taxa de sucesso',
  products: 'Produtos',
  ready_products: 'Produtos liberados',
  clicks: 'Cliques no botao',
  opens: 'Aberturas do provador',
  limit: 'Limite do plano',
  monthly_limit: 'Limite do plano',
  used: 'Usado no mes',
  usage: 'Usado no mes',
};

const LABELS_FIX: Record<string, string> = {
  'Geracoes no mes': 'Gerações no mês',
  'Geracoes no total': 'Gerações no total',
  'Concluidas': 'Concluídas',
  'Falhas': 'Falhas',
  'Cliques no botao': 'Cliques no botão',
  'Aberturas do provador': 'Aberturas do provador',
};

function label(key: string) {
  const l = LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return LABELS_FIX[l] ?? l;
}

function fmt(key: string, v: number) {
  if (/rate|pct|percent/i.test(key)) return `${(v <= 1 ? v * 100 : v).toFixed(1).replace('.', ',')}%`;
  return v.toLocaleString('pt-BR');
}

interface Props {
  storeId: string;
  onGoTab: (tab: string) => void;
}

export default function VisaoGeralTab({ storeId, onGoTab }: Props) {
  const [overview, setOverview] = useState<TryOnOverview | null>(null);
  const [settings, setSettings] = useState<TryOnSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, s] = await Promise.all([getOverview(storeId), getSettings(storeId)]);
      setOverview(o);
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const metrics = Object.entries(overview ?? {}).filter(([, v]) => typeof v === 'number') as [string, number][];
  const enabled = settings && 'enabled' in settings ? Boolean(settings.enabled) : null;
  const buttonText = settings && typeof settings.button_text === 'string' ? settings.button_text : null;

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Não foi possível carregar a Visão Geral</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0094eb]/10 text-[#0094eb]">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Provador virtual</p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              {enabled === null ? (
                'Status indisponível'
              ) : enabled ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Ativo na loja
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Desativado
                </>
              )}
              {buttonText ? ` · Botão: "${buttonText}"` : ''}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label(k)}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(k, v)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Ainda não há dados de uso. As métricas aparecem após as primeiras gerações.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => onGoTab('aparencia')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#0094eb]">
          <Palette className="h-5 w-5 text-[#0094eb]" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Personalizar o botão</p>
            <p className="text-xs text-slate-500">Cores, texto e formato com a identidade da loja</p>
          </div>
        </button>
        <button type="button" onClick={() => onGoTab('instalacao')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#0094eb]">
          <Code2 className="h-5 w-5 text-[#0094eb]" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Instalar na loja</p>
            <p className="text-xs text-slate-500">Passo a passo via GTM ou script</p>
          </div>
        </button>
      </div>
    </div>
  );
}