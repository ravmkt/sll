import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Coins, Loader2, MessageSquare, Pencil, Plus, Trash2, X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';

const sb: any = supabase;

type Mod = 'vidlytics' | 'sll-hub' | 'geral';
type Item = { id: string; module: Mod; title: string; content: string; is_active: boolean; updated_at: string };
type Row = { model: string; questions: number; prompt_tokens: number; completion_tokens: number; total_tokens: number };
type Prices = { inUsd: number; outUsd: number; brl: number };

const MODULES: { key: Mod; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'sll-hub', label: 'SLL Hub' },
  { key: 'vidlytics', label: 'Vidlytics' },
];
const PRICES_KEY = 'noah_prices_v1';
const DEFAULT_PRICES: Prices = { inUsd: 0.1, outUsd: 0.4, brl: 5.5 };

const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
const usd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });

const card = 'rounded-2xl border border-slate-800 bg-[#111524] p-5';
const input = 'w-full rounded-xl border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#0094eb]';
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';

function loadPrices(): Prices {
  try {
    const p = JSON.parse(localStorage.getItem(PRICES_KEY) || '');
    if (p && [p.inUsd, p.outUsd, p.brl].every((x) => typeof x === 'number' && x >= 0)) return p;
  } catch { /* usa o padrao */ }
  return DEFAULT_PRICES;
}

export default function NoahSupportTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Prices>(loadPrices);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [k, m] = await Promise.all([
      sb.from('noah_knowledge').select('*').order('module').order('title'),
      sb.rpc('admin_noah_metrics', { p_from: start.toISOString() }),
    ]);
    if (k.error) showError(k.error.message); else setItems((k.data as Item[]) || []);
    if (m.error) showError(m.error.message); else setRows((m.data as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setPrice = (key: keyof Prices, v: string) => {
    const num = Math.max(0, Number(v.replace(',', '.')) || 0);
    const next = { ...prices, [key]: num };
    setPrices(next);
    try { localStorage.setItem(PRICES_KEY, JSON.stringify(next)); } catch { /* ignora */ }
  };

  const t = useMemo(() => {
    const s = rows.reduce(
      (a, r) => ({
        q: a.q + Number(r.questions),
        p: a.p + Number(r.prompt_tokens),
        c: a.c + Number(r.completion_tokens),
        t: a.t + Number(r.total_tokens),
      }),
      { q: 0, p: 0, c: 0, t: 0 },
    );
    const costUsd = (s.p / 1e6) * prices.inUsd + (s.c / 1e6) * prices.outUsd;
    return { ...s, costUsd, costBrl: costUsd * prices.brl };
  }, [rows, prices]);

  const toggle = async (it: Item) => {
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, is_active: !it.is_active } : x)));
    const { error } = await sb.from('noah_knowledge').update({ is_active: !it.is_active }).eq('id', it.id);
    if (error) { showError(error.message); void load(); }
  };

  const save = async () => {
    if (!editing) return;
    const title = (editing.title || '').trim();
    const content = (editing.content || '').trim();
    if (!title || !content) return showError('Preencha título e conteúdo.');
    setSaving(true);
    const payload = { title, content, module: editing.module || 'geral' };
    const { error } = editing.id
      ? await sb.from('noah_knowledge').update(payload).eq('id', editing.id)
      : await sb.from('noah_knowledge').insert({ ...payload, is_active: true });
    setSaving(false);
    if (error) return showError(error.message);
    showSuccess(editing.id ? 'Tópico atualizado.' : 'Tópico criado.');
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await sb.from('noah_knowledge').delete().eq('id', id);
    setConfirmId(null);
    if (error) return showError(error.message);
    showSuccess('Tópico excluído.');
    void load();
  };

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Suporte Noah</h2>
        <p className="text-sm text-slate-400">Consumo da IA em {monthName} e base de conhecimento do assistente.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={card}>
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#0094eb]" /><span className={label}>Perguntas no mês</span></div>
              <p className="mt-2 text-3xl font-black text-white">{n0(t.q)}</p>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#fd8539]" /><span className={label}>Tokens consumidos</span></div>
              <p className="mt-2 text-3xl font-black text-white">{n0(t.t)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Entrada {n0(t.p)} · Saída {n0(t.c)}</p>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-emerald-400" /><span className={label}>Custo estimado</span></div>
              <p className="mt-2 text-3xl font-black text-white">{brl(t.costBrl)}</p>
              <p className="mt-1 text-[11px] text-slate-500">{usd(t.costUsd)}</p>
            </div>
          </div>

          <div className={`${card} space-y-3`}>
            <p className="text-xs text-slate-400">Parâmetros do cálculo. Confira os preços do modelo em uso na tabela de preços do Google e ajuste aqui.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div><label className={label}>US$ por 1M tokens (entrada)</label><input className={`${input} mt-1`} defaultValue={prices.inUsd} onBlur={(e) => setPrice('inUsd', e.target.value)} /></div>
              <div><label className={label}>US$ por 1M tokens (saída)</label><input className={`${input} mt-1`} defaultValue={prices.outUsd} onBlur={(e) => setPrice('outUsd', e.target.value)} /></div>
              <div><label className={label}>Cotação (R$ por US$)</label><input className={`${input} mt-1`} defaultValue={prices.brl} onBlur={(e) => setPrice('brl', e.target.value)} /></div>
            </div>
            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b0e1a] text-slate-400">
                    <tr><th className="px-3 py-2">Modelo</th><th className="px-3 py-2 text-right">Perguntas</th><th className="px-3 py-2 text-right">Entrada</th><th className="px-3 py-2 text-right">Saída</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {rows.map((r) => (
                      <tr key={r.model}>
                        <td className="px-3 py-2 font-semibold text-white">{r.model}</td>
                        <td className="px-3 py-2 text-right">{n0(Number(r.questions))}</td>
                        <td className="px-3 py-2 text-right">{n0(Number(r.prompt_tokens))}</td>
                        <td className="px-3 py-2 text-right">{n0(Number(r.completion_tokens))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#0094eb]" /><h3 className="text-base font-bold text-white">Base de conhecimento</h3></div>
              <button type="button" onClick={() => setEditing({ module: 'geral', title: '', content: '' })} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc]">
                <Plus className="h-4 w-4" /> Novo tópico
              </button>
            </div>

            {items.length === 0 ? (
              <div className={`${card} text-center text-sm text-slate-400`}>Nenhum tópico cadastrado. O Noah usa só o prompt padrão.</div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className={`${card} flex items-start gap-4 !p-4 ${it.is_active ? '' : 'opacity-60'}`}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={it.is_active}
                      aria-label={it.is_active ? 'Desativar' : 'Ativar'}
                      onClick={() => toggle(it)}
                      className={`relative mt-1 h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${it.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${it.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">{it.title}</p>
                        <span className="rounded-full bg-[#0094eb]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0094eb]">{MODULES.find((m) => m.key === it.module)?.label}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{it.content}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" aria-label="Editar" onClick={() => setEditing(it)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><Pencil className="h-4 w-4" /></button>
                      {confirmId === it.id ? (
                        <>
                          <button type="button" onClick={() => remove(it.id)} className="cursor-pointer rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700">Excluir</button>
                          <button type="button" onClick={() => setConfirmId(null)} className="cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white">Não</button>
                        </>
                      ) : (
                        <button type="button" aria-label="Excluir" onClick={() => setConfirmId(it.id)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-[#111524] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editing.id ? 'Editar tópico' : 'Novo tópico'}</h3>
              <button type="button" aria-label="Fechar" onClick={() => setEditing(null)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={label}>Título</label>
                <input className={`${input} mt-1`} maxLength={120} value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className={label}>Módulo</label>
                <select className={`${input} mt-1 cursor-pointer`} value={editing.module || 'geral'} onChange={(e) => setEditing({ ...editing, module: e.target.value as Mod })}>
                  {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Conteúdo (texto ou markdown)</label>
              <textarea className={`${input} mt-1 min-h-[220px] font-mono text-xs`} maxLength={4000} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              <p className="mt-1 text-right text-[10px] text-slate-500">{(editing.content || '').length}/4000</p>
            </div>
            <div className="flex gap-3 border-t border-slate-800 pt-4">
              <button type="button" disabled={saving} onClick={() => setEditing(null)} className="flex-1 cursor-pointer rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5">Cancelar</button>
              <button type="button" disabled={saving} onClick={save} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] py-2.5 text-sm font-bold text-white hover:bg-[#007fcc] disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}