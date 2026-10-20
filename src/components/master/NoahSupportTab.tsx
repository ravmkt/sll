import { useFxRate } from '../../hooks/admin/useFxRate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CloudDownload, Coins, ExternalLink, FileUp, Loader2, MessageSquare, Pencil, Plus, RefreshCw, Store, Trash2, X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';

const sb: any = supabase;

async function callAdmin(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await sb.functions.invoke('noah-admin', { body });
  if (error) {
    let msg = error.message;
    try {
      const j = await error.context?.json?.();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

type Mod = 'vidlytics' | 'sll-hub' | 'geral';
type Item = { id: string; module: Mod; title: string; content: string; is_active: boolean; updated_at: string };
type Row = { model: string; questions: number; prompt_tokens: number; completion_tokens: number; total_tokens: number };
type StoreRow = Row & { store_id: string | null; store_name: string | null };
type Settings = { ai_enabled: boolean; model: string; whatsapp_number: string; whatsapp_message: string; usd_brl: number };
type ModelRow = { model: string; label: string | null; input_usd: number; output_usd: number; price_checked_at: string | null };
type CostFn = (model: string, p: number, c: number) => number;

const MODULES: { key: Mod; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'sll-hub', label: 'SLL Hub' },
  { key: 'vidlytics', label: 'Vidlytics' },
];

const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
const usd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });

const card = 'rounded-2xl border border-slate-800 bg-[#111524] p-5';
const input = 'w-full rounded-xl border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#0094eb]';
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';

function Switch({ on, onClick, text }: { on: boolean; onClick: () => void; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={text} onClick={onClick}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function StoresModal({ range, cost, rate, onClose }: { range: { from: Date; to: Date }; cost: CostFn; rate: number; onClose: () => void }) {
  const [rows, setRows] = useState<StoreRow[] | null>(null);

  useEffect(() => {
    sb.rpc('admin_noah_metrics_by_store', { p_from: range.from.toISOString(), p_to: range.to.toISOString() }).then(({ data, error }: any) => {
      if (error) showError(error.message);
      setRows((data as StoreRow[]) || []);
    });
  }, [range]);

  const list = useMemo(() => {
    const map = new Map<string, { name: string; q: number; t: number; usd: number }>();
    for (const r of rows || []) {
      const key = r.store_id ?? 'sem-loja';
      const cur = map.get(key) ?? { name: r.store_name || 'Loja removida', q: 0, t: 0, usd: 0 };
      cur.q += Number(r.questions);
      cur.t += Number(r.total_tokens);
      cur.usd += cost(r.model, Number(r.prompt_tokens), Number(r.completion_tokens));
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.usd - a.usd || b.q - a.q);
  }, [rows, cost]);

  const total = list.reduce((a, x) => ({ q: a.q + x.q, t: a.t + x.t, usd: a.usd + x.usd }), { q: 0, t: 0, usd: 0 });
  const month = range.from.toLocaleDateString('pt-BR') + ' a ' + new Date(range.to.getTime() - 1).toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-[#111524] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Consumo por loja</h3>
            <p className="text-xs capitalize text-slate-400">{month}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {rows === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum consumo neste mês.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0e1a] text-slate-400">
                <tr><th className="px-3 py-2">Loja</th><th className="px-3 py-2 text-right">Perguntas</th><th className="px-3 py-2 text-right">Tokens</th><th className="px-3 py-2 text-right">Custo (R$)</th><th className="px-3 py-2 text-right">Custo (US$)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {list.map((x, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-semibold text-white">{x.name}</td>
                    <td className="px-3 py-2 text-right">{n0(x.q)}</td>
                    <td className="px-3 py-2 text-right">{n0(x.t)}</td>
                    <td className="px-3 py-2 text-right">{brl(x.usd * rate)}</td>
                    <td className="px-3 py-2 text-right">{usd(x.usd)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#0b0e1a] font-bold text-white">
                <tr><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right">{n0(total.q)}</td><td className="px-3 py-2 text-right">{n0(total.t)}</td><td className="px-3 py-2 text-right">{brl(total.usd * rate)}</td><td className="px-3 py-2 text-right">{usd(total.usd)}</td></tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NoahSupportTab({ range }: { range: { from: Date; to: Date } }) {
  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [storesOpen, setStoresOpen] = useState(false);
  const [nm, setNm] = useState({ model: '', inUsd: '', outUsd: '' });
  const [checking, setChecking] = useState<string | null>(null);
  const [found, setFound] = useState<Record<string, { input_usd: number; output_usd: number; url: string }>>({});
  const [listing, setListing] = useState(false);
  const [avail, setAvail] = useState<{ model: string; label: string }[]>([]);
  const [reading, setReading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [k, m, s, md] = await Promise.all([
      sb.from('noah_knowledge').select('*').order('module').order('title'),
      sb.rpc('admin_noah_metrics', { p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
      sb.from('noah_settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('noah_models').select('*').order('model'),
    ]);
    if (k.error) showError(k.error.message); else setItems((k.data as Item[]) || []);
    if (m.error) showError(m.error.message); else setRows((m.data as Row[]) || []);
    if (md.error) showError(md.error.message); else setModels((md.data as ModelRow[]) || []);
    if (s.error) showError(s.error.message);
    else if (s.data) {
      const d = { ...s.data, usd_brl: Number(s.data.usd_brl) } as Settings;
      setCfg(d);
      setForm((f) => f ?? d);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const priceMap = useMemo(() => new Map(models.map((x) => [x.model, x])), [models]);
  const cost: CostFn = useCallback((model, p, c) => {
    const x = priceMap.get(model);
    return x ? (p / 1e6) * Number(x.input_usd) + (c / 1e6) * Number(x.output_usd) : 0;
  }, [priceMap]);
  const { rate: fxRate } = useFxRate();
  const rate = fxRate ?? cfg?.usd_brl ?? 5.5;

  const t = useMemo(() => {
    const s = rows.reduce(
      (a, r) => ({
        q: a.q + Number(r.questions),
        p: a.p + Number(r.prompt_tokens),
        c: a.c + Number(r.completion_tokens),
        t: a.t + Number(r.total_tokens),
        usd: a.usd + cost(r.model, Number(r.prompt_tokens), Number(r.completion_tokens)),
      }),
      { q: 0, p: 0, c: 0, t: 0, usd: 0 },
    );
    return s;
  }, [rows, cost]);
  const unpriced = rows.filter((r) => !priceMap.has(r.model)).map((r) => r.model);

  const toggleAi = async () => {
    if (!cfg) return;
    const next = !cfg.ai_enabled;
    setCfg({ ...cfg, ai_enabled: next });
    setForm((f) => (f ? { ...f, ai_enabled: next } : f));
    const { error } = await sb.from('noah_settings').update({ ai_enabled: next }).eq('id', 1);
    if (error) { showError(error.message); void load(); return; }
    showSuccess(next ? 'Suporte por IA ativado.' : 'Suporte por IA desativado: o chat abrirá o WhatsApp.');
  };

  const saveCfg = async () => {
    if (!form) return;
    const num = form.whatsapp_number.replace(/\D/g, '');
    if (num.length < 10) return showError('Informe o WhatsApp com DDI e DDD.');
    if (!form.model) return showError('Escolha um modelo.');
    setSavingCfg(true);
    const { error } = await sb.from('noah_settings').update({
      model: form.model,
      whatsapp_number: num,
      whatsapp_message: form.whatsapp_message.trim(),
      usd_brl: Number(form.usd_brl) > 0 ? Number(form.usd_brl) : 5.5,
    }).eq('id', 1);
    setSavingCfg(false);
    if (error) return showError(error.message);
    showSuccess('Configurações salvas.');
    void load();
  };

  const updatePrice = async (model: string, field: 'input_usd' | 'output_usd', v: string) => {
    const num = Number(v.replace(',', '.'));
    if (!isFinite(num) || num < 0) return showError('Valor inválido.');
    const { error } = await sb.from('noah_models').update({ [field]: num, price_checked_at: new Date().toISOString() }).eq('model', model);
    if (error) return showError(error.message);
    void load();
  };

  const addModel = async () => {
    const id = nm.model.trim();
    const i = Number(nm.inUsd.replace(',', '.'));
    const o = Number(nm.outUsd.replace(',', '.'));
    if (!id || !isFinite(i) || !isFinite(o) || i < 0 || o < 0) return showError('Informe o ID do modelo e os dois preços.');
    const { error } = await sb.from('noah_models').insert({ model: id, label: id, input_usd: i, output_usd: o, price_checked_at: new Date().toISOString() });
    if (error) return showError(error.message);
    setNm({ model: '', inUsd: '', outUsd: '' });
    showSuccess('Modelo adicionado.');
    void load();
  };

  const checkPrice = async (model: string) => {
    setChecking(model);
    try {
      const r = await callAdmin({ action: 'check_price', model });
      setFound((f) => ({ ...f, [model]: { input_usd: Number(r.input_usd), output_usd: Number(r.output_usd), url: String(r.url) } }));
    } catch (e: any) {
      showError(e.message || 'Não foi possível conferir o preço.');
    }
    setChecking(null);
  };

  const applyPrice = async (model: string) => {
    const f = found[model];
    if (!f) return;
    const { error } = await sb.from('noah_models').update({ input_usd: f.input_usd, output_usd: f.output_usd, price_checked_at: new Date().toISOString() }).eq('model', model);
    if (error) return showError(error.message);
    setFound((x) => {
      const n = { ...x };
      delete n[model];
      return n;
    });
    showSuccess('Preço atualizado.');
    void load();
  };

  const listModels = async () => {
    setListing(true);
    try {
      const r = await callAdmin({ action: 'list_models' });
      const list = (r.models || []) as { model: string; label: string }[];
      const have = new Set(models.map((x) => x.model));
      setAvail(list.filter((x) => !have.has(x.model)));
      showSuccess(`${list.length} modelos encontrados na sua chave.`);
    } catch (e: any) {
      showError(e.message || 'Falha ao buscar modelos.');
    }
    setListing(false);
  };

  const addAvail = async (m: { model: string; label: string }) => {
    const { error } = await sb.from('noah_models').insert({ model: m.model, label: m.label, input_usd: 0, output_usd: 0 });
    if (error) return showError(error.message);
    setAvail((l) => l.filter((x) => x.model !== m.model));
    showSuccess('Modelo adicionado. Clique em "Conferir no Google" para trazer o preço.');
    void load();
  };

  const readDoc = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return showError('Arquivo acima de 8 MB.');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'docx', 'txt', 'md'].includes(ext)) return showError('Use PDF, DOCX, TXT ou MD.');
    setReading(true);
    try {
      let text = '';
      if (ext === 'txt' || ext === 'md') {
        text = await file.text();
      } else {
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...Array.from(buf.subarray(i, i + 0x8000)));
        const r = await callAdmin({ action: 'extract_doc', ext, data: btoa(bin) });
        text = String(r.text || '');
      }
      text = text.replace(/\r\n/g, '\n').trim();
      if (!text) throw new Error('Não encontrei texto neste documento.');
      setEditing({ module: 'geral', title: file.name.replace(/\.[^.]+$/, '').slice(0, 120), content: text.slice(0, 60000) });
      if (text.length > 60000) showError('Documento longo: mantive os primeiros 60.000 caracteres. Divida o restante em outro tópico.');
    } catch (e: any) {
      showError(e.message || 'Falha ao ler o documento.');
    }
    setReading(false);
  };

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
  const modelOptions = form && !models.some((m) => m.model === form.model) ? [...models, { model: form.model, label: form.model } as ModelRow] : models;

  return (
    <div className="space-y-6">

      {loading && !cfg ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={card}>
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#0094eb]" /><span className={label}>Perguntas no período</span></div>
              <p className="mt-2 text-3xl font-black text-white">{n0(t.q)}</p>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#fd8539]" /><span className={label}>Tokens consumidos</span></div>
              <p className="mt-2 text-3xl font-black text-white">{n0(t.t)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Entrada {n0(t.p)} · Saída {n0(t.c)}</p>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-emerald-400" /><span className={label}>Custo estimado</span></div>
              <p className="mt-2 text-3xl font-black text-white">{brl(t.usd * rate)}</p>
              <p className="mt-1 text-[11px] text-slate-500">{usd(t.usd)}</p>
            </div>
          </div>

          {unpriced.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
              Sem preço cadastrado para: {unpriced.join(', ')}. O custo deste(s) modelo(s) está zerado. Cadastre abaixo.
            </div>
          )}

          <button type="button" onClick={() => setStoresOpen(true)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-white/5">
            <Store className="h-4 w-4 text-[#0094eb]" /> Ver consumo por lojas
          </button>

          {form && (
            <div className={`${card} space-y-4`}>
              <div className="flex items-start gap-3">
                <Switch on={form.ai_enabled} onClick={toggleAi} text="Suporte por IA" />
                <div>
                  <p className="text-sm font-bold text-white">Suporte por IA {form.ai_enabled ? 'ativado' : 'desativado'}</p>
                  <p className="text-xs text-slate-400">Desativado, o balão do Noah abre direto o WhatsApp abaixo, com a mensagem pronta. A troca vale na hora.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={label}>Modelo de IA</label>
                  <select className={`${input} mt-1 cursor-pointer`} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}>
                    {modelOptions.map((m) => <option key={m.model} value={m.model}>{m.label || m.model}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>WhatsApp (DDI + DDD + número)</label>
                  <input className={`${input} mt-1`} value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Cotação reserva (R$ por US$)</label>
                  <input className={`${input} mt-1`} defaultValue={form.usd_brl} onBlur={(e) => setForm({ ...form, usd_brl: Number(e.target.value.replace(',', '.')) || 5.5 })} />
                </div>
              </div>
              <div>
                <label className={label}>Mensagem do WhatsApp (use {'{loja}'} e {'{id}'})</label>
                <textarea className={`${input} mt-1 min-h-[70px]`} maxLength={300} value={form.whatsapp_message} onChange={(e) => setForm({ ...form, whatsapp_message: e.target.value })} />
              </div>
              <button type="button" disabled={savingCfg} onClick={saveCfg} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0094eb] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007fcc] disabled:opacity-50">
                {savingCfg && <Loader2 className="h-4 w-4 animate-spin" />} Salvar configurações
              </button>
            </div>
          )}

          <div className={`${card} space-y-3`}>
            <p className="text-xs text-slate-400">Preços por 1M de tokens (US$). Confira na tabela de preços do Google. Ao editar, a data de conferência é atualizada.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0e1a] text-slate-400">
                  <tr><th className="px-3 py-2">Modelo</th><th className="px-3 py-2">Entrada</th><th className="px-3 py-2">Saída</th><th className="px-3 py-2">Conferido</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {models.map((m) => (
                    <tr key={m.model}>
                      <td className="px-3 py-2"><p className="font-semibold text-white">{m.label || m.model}</p><p className="text-[10px] text-slate-500">{m.model}</p></td>
                      <td className="px-3 py-2"><input key={`i${m.input_usd}`} className={`${input} !w-24 !py-1`} defaultValue={m.input_usd} onBlur={(e) => e.target.value !== String(m.input_usd) && updatePrice(m.model, 'input_usd', e.target.value)} /></td>
                      <td className="px-3 py-2"><input key={`o${m.output_usd}`} className={`${input} !w-24 !py-1`} defaultValue={m.output_usd} onBlur={(e) => e.target.value !== String(m.output_usd) && updatePrice(m.model, 'output_usd', e.target.value)} /></td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-400">{m.price_checked_at ? new Date(m.price_checked_at).toLocaleDateString('pt-BR') : 'nunca'}</span>
                          <button type="button" disabled={checking === m.model} onClick={() => checkPrice(m.model)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/5 disabled:opacity-50">
                            {checking === m.model ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 text-[#0094eb]" />} Conferir no Google
                          </button>
                        </div>
                        {found[m.model] && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-slate-300">Google: US$ {found[m.model].input_usd} / {found[m.model].output_usd}</span>
                            {Number(found[m.model].input_usd) === Number(m.input_usd) && Number(found[m.model].output_usd) === Number(m.output_usd) && <span className="font-semibold text-emerald-400">igual ao cadastrado</span>}
                            <button type="button" onClick={() => applyPrice(m.model)} className="cursor-pointer rounded-lg bg-emerald-600 px-2 py-0.5 font-bold text-white hover:bg-emerald-700">
                              {Number(found[m.model].input_usd) === Number(m.input_usd) && Number(found[m.model].output_usd) === Number(m.output_usd) ? 'Confirmar' : 'Aplicar'}
                            </button>
                            <a href={found[m.model].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[#0094eb] hover:underline">fonte <ExternalLink className="h-3 w-3" /></a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input className={`${input} sm:col-span-2`} placeholder="ID do modelo (ex.: gemini-2.5-pro)" value={nm.model} onChange={(e) => setNm({ ...nm, model: e.target.value })} />
              <input className={input} placeholder="US$ entrada" value={nm.inUsd} onChange={(e) => setNm({ ...nm, inUsd: e.target.value })} />
              <input className={input} placeholder="US$ saída" value={nm.outUsd} onChange={(e) => setNm({ ...nm, outUsd: e.target.value })} />
            </div>
            <button type="button" onClick={addModel} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-white/5"><Plus className="h-4 w-4" /> Adicionar modelo</button>
            <button type="button" disabled={listing} onClick={listModels} className="ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50">
              {listing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4 text-[#0094eb]" />} Buscar modelos do Google
            </button>
            {avail.length > 0 && (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#0b0e1a] p-2">
                {avail.map((a) => (
                  <div key={a.model} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{a.label}</p>
                      <p className="truncate text-[10px] text-slate-500">{a.model}</p>
                    </div>
                    <button type="button" onClick={() => addAvail(a)} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-[#0094eb] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#007fcc]"><Plus className="h-3 w-3" /> Adicionar</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#0094eb]" /><h3 className="text-base font-bold text-white">Base de conhecimento</h3></div>
                <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-white/5 ${reading ? 'pointer-events-none opacity-60' : ''}`}>
                  {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4 text-[#0094eb]" />} Enviar documento
                  <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readDoc(f); }} />
                </label>
                <span className="text-[11px] text-slate-500">≈ {n0(Math.min(150000, items.filter((i) => i.is_active).reduce((a, i) => a + Math.min(i.content.length, 60000), 0)) / 3.5)} tokens enviados a cada pergunta</span>
              </div>
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
                    <div className="mt-1"><Switch on={it.is_active} onClick={() => toggle(it)} text={it.is_active ? 'Desativar' : 'Ativar'} /></div>
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

      {storesOpen && <StoresModal range={range} cost={cost} rate={rate} onClose={() => setStoresOpen(false)} />}

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
              <textarea className={`${input} mt-1 min-h-[220px] font-mono text-xs`} maxLength={60000} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              <p className="mt-1 text-right text-[10px] text-slate-500">{(editing.content || '').length}/60000</p>
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