import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Info = { url: string; status: string | null; has_key: boolean; last_at: string | null };
type Props = { storeId: string; call: (body: Record<string, unknown>) => Promise<any> };

const EVENTS = ['Estoque de produto atualizado', 'Produto atualizado', 'Pedido aprovado'];

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'agora há pouco';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

export default function YampiWebhookCard({ storeId, call }: Props) {
  const callRef = useRef(call);
  callRef.current = call;

  const [info, setInfo] = useState<Info | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await callRef.current({ action: 'webhook_info', store_id: storeId });
    if (r && !r.error) {
      setInfo(r as Info);
      return r as Info;
    }
    return null;
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg({ ok: false, text: 'Não foi possível copiar. Selecione a URL e copie manualmente.' });
    }
  };

  const save = async () => {
    const k = key.trim();
    if (!/^wh_[A-Za-z0-9]{16,}$/.test(k)) {
      setMsg({ ok: false, text: 'Chave inválida. Ela começa com wh_ e aparece na tela do webhook na Yampi.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await callRef.current({ action: 'save_webhook_key', store_id: storeId, webhook_key: k });
    if (!r || r.error) {
      setMsg({ ok: false, text: r?.error ?? 'Falha ao salvar a chave.' });
    } else {
      setKey('');
      setMsg({ ok: true, text: 'Chave salva. Clique em Testar depois de alterar um estoque na Yampi.' });
      await load();
    }
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMsg(null);
    const r = await load();
    setBusy(false);
    setMsg(
      r?.last_at
        ? { ok: true, text: `Último evento recebido ${ago(r.last_at)}.` }
        : { ok: false, text: 'Ainda não recebemos nenhum evento. Altere o estoque de um produto na Yampi, espere 30 s e clique em Testar de novo.' },
    );
  };

  const state = !info ? 'loading' : info.last_at ? 'green' : info.has_key ? 'yellow' : 'red';
  const badge = {
    loading: { cls: 'bg-muted text-muted-foreground', text: 'Carregando...' },
    green: { cls: 'bg-emerald-100 text-emerald-700', text: '🟢 Ativo' },
    yellow: { cls: 'bg-amber-100 text-amber-700', text: '🟡 Aguardando o primeiro evento' },
    red: { cls: 'bg-red-100 text-red-700', text: '🔴 Não configurado' },
  }[state];

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Ative a sincronização automática</h3>
          <p className="text-sm text-muted-foreground">
            Com o webhook, uma mudança de estoque na Yampi chega ao SLL em segundos. Sem ele, a atualização pode levar alguns minutos.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>{badge.text}</span>
      </div>

      <ol className="list-decimal space-y-3 pl-5 text-sm">
        <li>
          Na Yampi, abra <b>Configurações &gt; Webhooks &gt; Novo webhook</b> e use esta URL:
          <div className="mt-2 flex gap-2">
            <Input readOnly value={info?.url ?? ''} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copy} disabled={!info}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </li>
        <li>
          Marque os eventos:
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {EVENTS.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <span className="text-muted-foreground">Deixe o campo Produtos vazio, para valer para todos.</span>
        </li>
        <li>
          Salve o webhook na Yampi, copie a <b>Chave secreta</b> (começa com <code>wh_</code>) e cole aqui:
          <div className="mt-2 flex gap-2">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="wh_..." className="font-mono text-xs" />
            <Button type="button" onClick={save} disabled={busy || !key.trim()}>
              Salvar
            </Button>
          </div>
        </li>
        <li>
          Altere o estoque de um produto na Yampi e clique em Testar.
          <div className="mt-2">
            <Button type="button" variant="outline" onClick={test} disabled={busy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              Testar
            </Button>
          </div>
        </li>
      </ol>

      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  );
}
