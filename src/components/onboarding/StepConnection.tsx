import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Loader2, PlayCircle, Plug, Star, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getYampiStatus, saveYampiCredentials } from '@/services/yampiService';
import { registerYampiWebhook } from '@/services/yampiSyncService';
import { Field } from './Field';
import { INPUT, LABEL, sllSnippet, youtubeId, type Method, type StepProps } from './shared';

const sb: any = supabase;
const GTM_VIDEO = youtubeId((import.meta.env.VITE_ONBOARDING_GTM_VIDEO as string | undefined) || '');
const GTM_STEPS: [string, string][] = [
  ['Abra o Google Tag Manager', 'Use o botão acima (abre em nova aba) e entre no contêiner da sua loja.'],
  ['Crie uma nova Tag', 'No menu Tags, clique em Nova.'],
  ['Escolha o tipo', 'Em Configuração da tag, selecione HTML personalizado.'],
  ['Cole o código', 'Cole o código do SLL (caixa acima) no campo HTML.'],
  ['Defina o acionador', 'Em Acionamento, escolha All Pages (Todas as páginas), dê um nome à tag e salve.'],
  ['Publique', 'Clique em Enviar e depois em Publicar. Em seguida, volte aqui e use o botão Testar conexão.'],
];

function YampiBox({ storeId }: { storeId: string }) {
  const [connected, setConnected] = useState(false);
  const [alias, setAlias] = useState('');
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getYampiStatus(storeId).then((s) => { if (!alive) return; setConnected(!!s.connected); if (s.alias) setAlias(s.alias); }).catch(() => { /* sem status */ });
    return () => { alive = false; };
  }, [storeId]);

  const connect = async () => {
    if (!alias.trim() || !token.trim() || !secret.trim()) { setErr('Preencha Alias, User-Token e User-Secret-Key.'); return; }
    setBusy(true); setErr(null);
    try {
      await saveYampiCredentials(storeId, alias.trim(), token.trim(), secret.trim());
      setConnected(true); setToken(''); setSecret('');
      registerYampiWebhook(storeId).catch(() => { /* o cron cobre */ });
    } catch (e: any) { setErr(e?.message || 'Não foi possível conectar a Yampi.'); }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <img src="/assets/platforms/yampi.svg" alt="Yampi" className="h-6 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <span className="text-sm font-black text-slate-900">Yampi</span>
        {connected && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 size={11} /> Conectada</span>}
      </div>
      <p className="mt-1 text-xs text-slate-500">Importe produtos e sincronize pedidos. Use as credenciais de API do painel da Yampi.</p>
      {!connected && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Alias"><input value={alias} onChange={(e) => setAlias(e.target.value)} className={INPUT} placeholder="minha-loja" /></Field>
            <Field label="User-Token"><input type="password" value={token} onChange={(e) => setToken(e.target.value)} className={INPUT} placeholder="••••••••" /></Field>
            <Field label="User-Secret-Key"><input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className={INPUT} placeholder="••••••••" /></Field>
          </div>
          <button type="button" onClick={connect} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null} Conectar Yampi
          </button>
          {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
        </div>
      )}
    </div>
  );
}

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

            <a href="https://tagmanager.google.com/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Abrir o Google Tag Manager <ExternalLink size={14} />
            </a>

            {GTM_VIDEO ? (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe src={`https://www.youtube-nocookie.com/embed/${GTM_VIDEO}?rel=0`} title="Como instalar pelo GTM" className="h-full w-full"
                  allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <PlayCircle size={32} />
                <span className="text-xs font-semibold">Vídeo tutorial em breve</span>
              </div>
            )}

            <ol className="space-y-3">
              {GTM_STEPS.map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0094eb] text-[11px] font-black text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500">{text}</p>
                    <img src={`/assets/onboarding/gtm-${i + 1}.png`} alt={title} loading="lazy" className="mt-2 w-full rounded-lg border border-slate-200"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                </li>
              ))}
            </ol>
            {testBox}
          </div>
        )}
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

      <div className="pt-3">
        <span className={LABEL}>Integrações</span>
        <YampiBox storeId={storeId} />
      </div>
    </div>
  );
}