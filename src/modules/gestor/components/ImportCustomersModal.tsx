import { useEffect, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Plug, Upload, UploadCloud } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import {
  IMPORT_MAX_MB, IMPORT_MAX_ROWS, PLATFORM, downloadCustomersTemplate, downloadImportErrors,
  importCustomersRows, importPlatformHistory, probePlatform, readCustomerSheet,
} from '../services/clientes-import';
import type { ImportError } from '../services/clientes-import';

type Stage = 'pick' | 'confirm' | 'running' | 'result';
type Probe = { state: 'loading' | 'ok' | 'none' | 'error'; total?: number; msg?: string };
type ResultView = { ok: number; okLabel: string; fail: number; lines: string[]; warn?: string; warnTone?: 'rose' | 'amber'; errors: ImportError[] };

const tabCls = (on: boolean) =>
  cn('inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-3 text-sm font-semibold transition',
    on ? 'border-b-2 border-[color:var(--sll-b-brand)] text-[color:var(--sll-b-brand)]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300');

type Props = { storeId: string; onClose: () => void; onDone: () => void };

export default function ImportCustomersModal({ storeId, onClose, onDone }: Props) {
  const [tab, setTab] = useState<'platform' | 'file'>('platform');
  const [stage, setStage] = useState<Stage>('pick');
  const [probe, setProbe] = useState<Probe>({ state: 'loading' });
  const [progress, setProgress] = useState({ pct: 0, label: '' });
  const [result, setResult] = useState<ResultView | null>(null);
  const [mode, setMode] = useState<'platform' | 'file'>('platform');
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const [tplBusy, setTplBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const stopRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    probePlatform(storeId)
      .then((total) => { if (alive) setProbe({ state: 'ok', total }); })
      .catch((e: Error) => {
        if (!alive) return;
        setProbe(/n[aã]o conectada/i.test(e.message) ? { state: 'none' } : { state: 'error', msg: e.message });
      });
    return () => { alive = false; };
  }, [storeId]);

  const running = stage === 'running';
  const close = () => { if (!running) onClose(); };

  const runPlatform = async () => {
    stopRef.current = false;
    setMode('platform');
    setStage('running');
    setProgress({ pct: 0, label: 'Iniciando a importação...' });
    const r = await importPlatformHistory(
      storeId,
      (p) => setProgress({ pct: p.total ? Math.round((p.page / p.total) * 100) : 0, label: `Página ${p.page} de ${p.total} · ${p.ok} pedido(s) gravado(s)` }),
      () => stopRef.current,
    );
    const lines = [`${r.newCustomers} cliente(s) novo(s) cadastrado(s).`, `${r.processed} pedido(s) lido(s) na ${PLATFORM.label}.`];
    if (r.no_items) lines.push(`${r.no_items} pedido(s) vieram sem itens.`);
    const unk = Object.entries(r.unknown);
    if (unk.length) lines.push(`Status novos da plataforma: ${unk.map(([k, v]) => `${k} (${v})`).join(', ')}.`);
    setResult({
      ok: r.ok, okLabel: 'pedido(s) importado(s)', fail: r.failed, lines, errors: r.errors,
      warn: r.fatal ? `A importação parou: ${r.fatal} O que já entrou foi mantido; rode de novo para continuar.`
        : r.stopped ? 'Importação interrompida por você. Rode de novo para continuar: o que já entrou não é duplicado.' : undefined,
      warnTone: r.fatal ? 'rose' : 'amber',
    });
    setShowErrors(false);
    setStage('result');
    onDone();
  };

  const runFile = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setErr('Formato não aceito. Use um arquivo .xlsx, .xls ou .csv.'); return; }
    if (file.size > IMPORT_MAX_MB * 1024 * 1024) { setErr(`Arquivo muito grande. O máximo é ${IMPORT_MAX_MB} MB.`); return; }
    setErr('');
    setMode('file');
    setStage('running');
    setProgress({ pct: 0, label: 'Lendo a planilha...' });
    try {
      const parsed = await readCustomerSheet(file);
      const r = await importCustomersRows(storeId, parsed, (d, t) =>
        setProgress({ pct: t ? Math.round((d / t) * 100) : 100, label: `Gravando ${d} de ${t}...` }));
      const lines = [`${r.created} cliente(s) novo(s).`, `${r.updated} cliente(s) existente(s) atualizado(s) (só campos vazios).`];
      if (r.unchanged) lines.push(`${r.unchanged} cliente(s) já estavam completos (sem mudança).`);
      if (r.blank) lines.push(`${r.blank} linha(s) em branco ignorada(s).`);
      setResult({ ok: r.created + r.updated, okLabel: 'cliente(s) importado(s)', fail: r.errors.length, lines, errors: r.errors });
      setShowErrors(false);
      setStage('result');
      onDone();
    } catch (e) {
      setErr((e as Error).message || 'Não consegui ler a planilha.');
      setStage('pick');
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length > 1) { setErr('Envie um arquivo por vez.'); return; }
    void runFile(e.dataTransfer.files[0]);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); }
  };
  const template = async () => {
    setTplBusy(true);
    try { await downloadCustomersTemplate(); } catch { showError('Não foi possível gerar a planilha modelo.'); }
    finally { setTplBusy(false); }
  };

  let title = 'Importar clientes';
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (stage === 'pick') {
    footer = tab === 'platform' ? (
      <>
        <button type="button" onClick={onClose} className={sllBtnGhost}>Cancelar</button>
        <button type="button" disabled={probe.state !== 'ok'} onClick={() => setStage('confirm')} className={sllBtnPrimary}>Importar histórico</button>
      </>
    ) : (
      <button type="button" onClick={onClose} className={sllBtnGhost}>Cancelar</button>
    );
    body = (
      <div className="-mx-6 -my-5">
        <div className="flex border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => { setTab('platform'); setErr(''); }} className={tabCls(tab === 'platform')}><Plug size={15} /> Plataforma</button>
          <button type="button" onClick={() => { setTab('file'); setErr(''); }} className={tabCls(tab === 'file')}><Upload size={15} /> Arquivo</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {tab === 'platform' ? (
            <>
              {probe.state === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin text-[color:var(--sll-b-brand)]" /> Verificando a plataforma conectada...
                </div>
              )}
              {probe.state === 'ok' && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">E-commerce conectado</p>
                  <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{PLATFORM.label}</p>
                  <p className="text-sm text-slate-500">{(probe.total ?? 0).toLocaleString('pt-BR')} pedido(s) encontrado(s) na plataforma.</p>
                </div>
              )}
              {probe.state === 'none' && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Nenhuma plataforma conectada. Conecte o seu e-commerce em Integrações para importar o histórico.</p>
              )}
              {probe.state === 'error' && (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">Não foi possível falar com a plataforma: {probe.msg}</p>
              )}
              <ul className="space-y-1 text-[12px] text-slate-500">
                <li>Importa o histórico de <strong>pedidos</strong>, <strong>clientes</strong> e <strong>itens comprados</strong>.</li>
                <li>Pedidos já importados não são duplicados e dados já preenchidos não são alterados.</li>
                <li>O aceite de marketing dos clientes não é alterado.</li>
              </ul>
            </>
          ) : (
            <>
              <div
                role="button" tabIndex={0}
                onClick={() => inputRef.current?.click()} onKeyDown={onKey}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
                  over ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)]' : 'border-slate-300 bg-slate-50 hover:border-[color:var(--sll-b-brand)] dark:border-slate-700 dark:bg-slate-800/50',
                )}
              >
                <UploadCloud size={32} className="text-[color:var(--sll-b-brand)]" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Clique para escolher o arquivo ou arraste e solte aqui</p>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => void runFile(e.target.files?.[0])} />
              </div>
              {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">{err}</p>}
              <ul className="space-y-1 text-[12px] text-slate-500">
                <li>Formatos: <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong> (um arquivo por vez).</li>
                <li>Tamanho máximo: <strong>{IMPORT_MAX_MB} MB</strong> e até <strong>{IMPORT_MAX_ROWS.toLocaleString('pt-BR')} linhas</strong>.</li>
                <li>Obrigatório: <strong>Nome</strong> e <strong>E-mail</strong> ou <strong>Documento</strong>.</li>
                <li>Quem já existe não é duplicado: só campos vazios são preenchidos. O aceite de marketing não é alterado.</li>
              </ul>
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <button type="button" disabled={tplBusy} onClick={() => void template()} className={sllBtnGhost}>
                  {tplBusy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-[color:var(--sll-b-brand)]" />}
                  <FileSpreadsheet size={15} className="text-[color:var(--sll-b-brand)]" /> Baixar planilha modelo
                </button>
              </div>
            </>
          )}
          {tab === 'platform' && err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">{err}</p>}
        </div>
      </div>
    );
  } else if (stage === 'confirm') {
    title = `Importar histórico da ${PLATFORM.label}?`;
    footer = (
      <>
        <button type="button" onClick={() => setStage('pick')} className={sllBtnGhost}>Voltar</button>
        <button type="button" onClick={() => void runPlatform()} className={sllBtnPrimary}>Confirmar importação</button>
      </>
    );
    body = (
      <div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300">
        <p>Vamos trazer todo o histórico de <strong>pedidos</strong> e <strong>clientes</strong> da {PLATFORM.label}, com os itens comprados.</p>
        <p>Pode levar alguns minutos. Você acompanha o andamento aqui e pode interromper quando quiser.</p>
        <p>Pedidos já importados não são duplicados.</p>
      </div>
    );
  } else if (stage === 'running') {
    title = mode === 'platform' ? `Importando da ${PLATFORM.label}...` : 'Importando planilha...';
    footer = mode === 'platform' ? (
      <button type="button" onClick={() => { stopRef.current = true; setProgress((p) => ({ ...p, label: p.label + ' · finalizando o lote atual...' })); }} className={sllBtnGhost}>Parar importação</button>
    ) : undefined;
    body = (
      <div className="space-y-4 py-6 text-center">
        <Loader2 size={32} className="mx-auto animate-spin text-[color:var(--sll-b-brand)]" />
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-[color:var(--sll-b-brand)] transition-all" style={{ width: `${progress.pct}%` }} />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{progress.label}</p>
        <p className="text-xs text-slate-400">Não feche esta janela até terminar.</p>
      </div>
    );
  } else if (result) {
    title = 'Resultado da importação';
    footer = (
      <>
        {result.errors.length > 0 && (
          <button type="button" onClick={() => void downloadImportErrors(result.errors)} className={sllBtnGhost}>
            <Download size={15} className="text-[color:var(--sll-b-brand)]" /> Baixar lista com erros
          </button>
        )}
        <button type="button" onClick={onClose} className={sllBtnPrimary}>Fechar</button>
      </>
    );
    body = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
            <p className="text-3xl font-extrabold text-emerald-600">{result.ok}</p>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{result.okLabel}</p>
          </div>
          <div className={cn('rounded-xl p-4 text-center', result.fail ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-100 dark:bg-slate-800')}>
            <p className={cn('text-3xl font-extrabold', result.fail ? 'text-rose-600' : 'text-slate-400')}>{result.fail}</p>
            <p className={cn('text-xs font-semibold', result.fail ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400')}>com erro</p>
          </div>
        </div>
        {result.warn && (
          <div className={cn('flex items-start gap-2 rounded-xl p-3 text-xs font-medium', result.warnTone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800')}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <p>{result.warn}</p>
          </div>
        )}
        <ul className="space-y-1 text-xs text-slate-500">{result.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        {result.errors.length > 0 && (
          <div className="space-y-2">
            <button type="button" onClick={() => setShowErrors((v) => !v)} className={sllBtnGhost}>
              {showErrors ? 'Ocultar erros' : `Ver os ${result.errors.length} erro(s)`}
            </button>
            {showErrors && (
              <div className="max-h-[35vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-700">
                  {result.errors.slice(0, 200).map((e, i) => (
                    <li key={i} className="px-3 py-2">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{e.ref}</p>
                      <p className="font-medium text-rose-500">{e.msg}</p>
                    </li>
                  ))}
                </ul>
                {result.errors.length > 200 && <p className="px-3 py-2 text-[11px] text-slate-400">Mostrando 200 de {result.errors.length}. Baixe a lista para ver todos.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <SllModal open onOpenChange={(v) => { if (!v) close(); }} title={title} size="md" footer={footer}>
      {body}
    </SllModal>
  );
}