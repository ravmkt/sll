import { useState } from 'react';
import { CheckCircle2, Copy, Loader2, Plug, Star, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { INPUT, LABEL, sllSnippet, type Method, type StepProps } from './shared';

const sb: any = supabase;

export function StepConnection({ data, storeId, onChange }: StepProps) {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const snippet = sllSnippet(storeId);
  const method = data.connection_method;

  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setMsg({ ok: false, text: 'Não foi possível copiar. Selecione o texto e copie manualmente.' }); }
  };
  const test = async () => {
    setTesting(true); setMsg(null);
    const { data: ok, error } = await sb.rpc('verify_script_connection', { p_store_id: storeId });
    setTesting(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    onChange({ script_verified: ok === true });
    setMsg(ok === true
      ? { ok: true, text: 'Conexão confirmada: já recebemos eventos da sua loja.' }
      : { ok: false, text: 'Ainda não recebemos eventos. Publique o contêiner, abra sua loja em outra aba e teste de novo.' });
  };
  const pick = (m: Method) => { setMsg(null); onChange({ connection_method: m }); };
  const card = (m: Method) =>
    `w-full cursor-pointer rounded-2xl border p-4 text-left transition ${method === m ? 'border-[#0094eb] bg-[#0094eb]/5' : 'border-slate-200 hover:border-slate-300'}`;
  const key = (m: Method) => (e: React.KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) pick(m); };

  const snippetBox = (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 pr-24 text-[11px] leading-relaxed text-emerald-300">{snippet}</pre>
      <button type="button" onClick={copy} className="absolute right-2 top-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20">
        <Copy size={12} /> {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
  const testBox = (
    <div className="space-y-2">
      <button type="button" onClick={test} disabled={testing} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} Testar conexão
      </button>
      {data.script_verified && !msg && <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Script já verificado.</p>}
      {msg && (
        <p className={`flex items-start gap-1.5 text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
          {msg.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}{msg.text}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Um único script serve para todos os módulos. Escolha como instalar:</p>

      <div className={card('gtm')} role="button" tabIndex={0} onClick={() => pick('gtm')} onKeyDown={key('gtm')}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900">Google Tag Manager</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fd8539] px-2 py-0.5 text-[10px] font-black uppercase text-white"><Star size={10} /> Recomendado</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Funciona em qualquer plataforma, sem mexer no tema.</p>
        {method === 'gtm' && (
          <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            {snippetBox}
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
              <li>No GTM, crie uma <b>Tag</b> do tipo <b>HTML personalizado</b> e cole o código acima.</li>
              <li>Defina o acionador <b>All Pages</b> (Todas as páginas).</li>
              <li>Salve, clique em <b>Enviar</b> para publicar e use o teste abaixo.</li>
            </ol>
            {testBox}
          </div>
        )}
      </div>

      <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 opacity-80" aria-disabled="true">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-700">Yampi</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">Em breve</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><span className={LABEL}>Alias</span><input disabled className={`${INPUT} cursor-not-allowed bg-slate-100`} placeholder="minha-loja" /></div>
          <div><span className={LABEL}>API Token</span><input disabled type="password" className={`${INPUT} cursor-not-allowed bg-slate-100`} placeholder="••••••••" /></div>
        </div>
      </div>

      <div className={card('manual')} role="button" tabIndex={0} onClick={() => pick('manual')} onKeyDown={key('manual')}>
        <span className="text-sm font-black text-slate-900">Inserção manual no tema</span>
        <p className="mt-0.5 text-xs text-slate-500">Para quem edita o código do tema diretamente.</p>
        {method === 'manual' && (
          <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-slate-600">Cole o código abaixo <b>imediatamente antes da tag <code>&lt;/head&gt;</code></b> do arquivo principal do tema (ex.: <code>theme.liquid</code>).</p>
            {snippetBox}
            {testBox}
          </div>
        )}
      </div>
    </div>
  );
}