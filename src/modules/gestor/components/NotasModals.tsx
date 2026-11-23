import { useEffect, useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { showError, showSuccess } from '@/utils/toast';
import {
  NF_MIN_REASON, NF_STATUS_CLS, NF_STATUS_LABEL, TAX_REGIMES, accessKeyDvOk, brl, canCancel, cancelNota,
  fmtDateTime, fmtDoc, fmtNumber, formatAccessKey, getNota, getSettings, inutilizar, listInutilizadas,
  onlyDigits, registerManual, saveSettings, settingsToForm, validateAccessKey, validateReason,
} from '../services/notas';
import type { NfDetail, NfInutilizada, NfItem, NfManualForm, NfSettingsForm, NfStatus } from '../services/notas';
import {
  isStoredXml, nfXmlDownloadUrl, parseNfeXml, removeNfXml, uploadNfXml, validateXmlFile,
} from '../services/notasXml';

/** Data do dia (sem fuso): usa os 10 primeiros caracteres. */
export const fmtDay = (v: string | null | undefined) => {
  if (!v) return '-';
  const [y, m, d] = v.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '-';
};

const today = () => new Date().toLocaleDateString('sv-SE');
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Erro inesperado.');

export const StatusBadge = ({ s }: { s: NfStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${NF_STATUS_CLS[s]}`}>{NF_STATUS_LABEL[s]}</span>
);

const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{children || '-'}</div>
  </div>
);

const Spinner = () => <Loader2 className="mx-auto h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" />;

const xmlLinkCls = 'cursor-pointer text-[color:var(--sll-b-brand)] hover:underline';

function XmlLink({ url }: { url: string }) {
  const [busy, setBusy] = useState(false);
  if (!isStoredXml(url)) {
    return <a href={url} target="_blank" rel="noreferrer" className={xmlLinkCls}>Abrir XML</a>;
  }
  const download = async () => {
    setBusy(true);
    try {
      const u = await nfXmlDownloadUrl(url);
      const a = document.createElement('a');
      a.href = u;
      a.download = 'nota-fiscal.xml';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };
  return (
    <button type="button" disabled={busy} onClick={() => void download()} className={xmlLinkCls}>
      {busy ? 'Gerando link...' : 'Baixar XML'}
    </button>
  );
}

// ---------------- Detalhe ----------------
export function NotaDetailModal({ notaId, canEdit, onClose, onChanged }: {
  notaId: string; canEdit: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [d, setD] = useState<NfDetail | null>(null);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    getNota(notaId).then((r) => { if (on) setD(r); }).catch((e) => { showError(msg(e)); onClose(); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notaId]);

  const n = d?.nota;
  const reasonErr = reason ? validateReason(reason) : null;

  const doCancel = async () => {
    const err = validateReason(reason);
    if (err) { showError(err); return; }
    setBusy(true);
    try {
      await cancelNota(notaId, reason);
      showSuccess('Nota cancelada.');
      onChanged();
      onClose();
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  const itemCols: SllColumn<NfItem>[] = [
    { key: 'sku', header: 'SKU', render: (i) => <span className="font-mono">{i.sku || '-'}</span> },
    { key: 'desc', header: 'Descrição', align: 'left', render: (i) => i.description },
    { key: 'ncm', header: 'NCM', render: (i) => i.ncm || '-' },
    { key: 'cfop', header: 'CFOP', render: (i) => i.cfop || '-' },
    { key: 'qty', header: 'Qtd', render: (i) => i.qty },
    { key: 'unit', header: 'Unitário', render: (i) => brl(i.unit_price) },
    { key: 'total', header: 'Total', render: (i) => <b>{brl(i.total)}</b> },
  ];

  return (
    <SllModal
      open
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      size="xl"
      title={n ? `Nota ${fmtNumber(n)}` : 'Nota fiscal'}
      footer={
        <>
          <button type="button" className={sllBtnGhost} disabled={busy} onClick={onClose}>Fechar</button>
          {n && canEdit && canCancel(n) && !cancel && (
            <button type="button" onClick={() => setCancel(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">
              Cancelar nota
            </button>
          )}
          {cancel && (
            <button type="button" disabled={busy || !!validateReason(reason)} onClick={() => void doCancel()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <Loader2 size={15} className="animate-spin" />}Confirmar cancelamento
            </button>
          )}
        </>
      }
    >
      {!d || !n ? <div className="py-10"><Spinner /></div> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50 md:grid-cols-4">
            <Info label="Situação"><StatusBadge s={n.status} /></Info>
            <Info label="Emissão">{fmtDay(n.issued_at)}</Info>
            <Info label="Valor">{brl(n.total)}</Info>
            <Info label="Canal">{n.channel}</Info>
            <Info label="Destinatário">{n.recipient_name}</Info>
            <Info label="Documento">{n.recipient_document ? fmtDoc(n.recipient_document) : ''}</Info>
            <Info label="Protocolo">{n.protocol}</Info>
            <Info label="Registrada em">{fmtDateTime(n.created_at)}</Info>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <Info label="Chave de acesso">
              {n.access_key ? <span className="font-mono text-xs">{formatAccessKey(n.access_key)}</span> : ''}
            </Info>
            {n.access_key && !accessKeyDvOk(n.access_key) && (
              <p className="mt-2 text-xs font-semibold text-amber-600">Aviso: o dígito verificador da chave não confere. Confira com o XML.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
              {n.xml_url && <XmlLink url={n.xml_url} />}
              {n.danfe_url && <a href={n.danfe_url} target="_blank" rel="noreferrer" className="text-[color:var(--sll-b-brand)] hover:underline">Abrir DANFE</a>}
            </div>
            {n.reject_reason && <p className="mt-3 text-sm font-semibold text-red-600">Rejeição: {n.reject_reason}</p>}
            {n.cancel_reason && <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancelamento: {n.cancel_reason}</p>}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">Itens</h3>
            <SllTable columns={itemCols} rows={d.items} rowKey={(i) => i.id} empty="Nenhum item registrado nesta nota." minWidth="40rem" />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">Histórico</h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/50">
              {d.events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <span><b className="capitalize">{e.type}</b>{e.message ? ` — ${e.message}` : ''}</span>
                  <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(e.created_at)}</span>
                </li>
              ))}
              {d.events.length === 0 && <li className="px-4 py-6 text-center text-slate-500">Sem eventos.</li>}
            </ul>
          </div>

          {cancel && (
            <div className="rounded-xl border border-red-300 bg-white p-4 dark:border-red-500/50 dark:bg-slate-800/50">
              <SllField label={`Justificativa do cancelamento (mínimo ${NF_MIN_REASON} caracteres)`}>
                <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={sllFieldCls} />
              </SllField>
              <p className={`mt-1 text-xs font-semibold ${reasonErr ? 'text-red-600' : 'text-slate-500'}`}>{reason.trim().length}/{NF_MIN_REASON}</p>
            </div>
          )}
        </div>
      )}
    </SllModal>
  );
}

// ---------------- Registrar manual ----------------
export type NfOrderPrefill = { id: string; label: string; name: string; document: string; total: number; channel: string };

export function NotaRegisterModal({ storeId, onClose, onSaved, order, step, onNext, onSkip }: {
  storeId: string; onClose: () => void; onSaved: () => void;
  order?: NfOrderPrefill; step?: string; onNext?: () => void; onSkip?: () => void;
}) {
  const [f, setF] = useState<NfManualForm>({
    order_id: order?.id ?? null, serie: '1', number: '', access_key: '', xml_url: '', issued: today(),
    recipient_name: order?.name ?? '', recipient_document: order?.document ?? '',
    total: order ? String(order.total).replace('.', ',') : '', channel: order?.channel ?? '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof NfManualForm, v: string) => setF((s) => ({ ...s, [k]: v }));

  const pickFile = async (picked: File | undefined) => {
    if (!picked) return;
    const bad = validateXmlFile(picked);
    if (bad) { showError(bad); return; }
    try {
      const info = parseNfeXml(await picked.text());
      setFile(picked);
      if (!info) { showError('Não consegui ler os dados deste XML. Preencha os campos manualmente.'); return; }
      setF((s) => ({
        ...s,
        xml_url: '',
        serie: info.serie || s.serie,
        number: info.number || s.number,
        access_key: info.accessKey || s.access_key,
        issued: info.issued || s.issued,
        recipient_name: info.recipientName || s.recipient_name,
        recipient_document: info.recipientDocument || s.recipient_document,
        total: info.total || s.total,
      }));
      showSuccess('XML lido. Confira os campos preenchidos antes de registrar.');
    } catch (e) { showError(msg(e)); }
  };
  const keyErr = validateAccessKey(f.access_key);
  const dvWarn = !keyErr && onlyDigits(f.access_key).length === 44 && !accessKeyDvOk(f.access_key);

  const save = async () => {
    setBusy(true);
    try {
      let uploaded: string | null = null;
      let xmlRef = f.xml_url;
      if (file) { uploaded = await uploadNfXml(storeId, file); xmlRef = uploaded; }
      try {
        await registerManual(storeId, { ...f, xml_url: xmlRef });
      } catch (e) {
        if (uploaded) await removeNfXml(uploaded);
        throw e;
      }
      showSuccess('Nota registrada.');
      onSaved();
      if (onNext) onNext(); else onClose();
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  return (
    <SllModal
      open
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      title={order ? `Registrar nota do pedido ${order.label}` : 'Registrar nota emitida'}
      footer={
        <>
          <button type="button" className={sllBtnGhost} disabled={busy} onClick={onClose}>Cancelar</button>
          {onSkip && <button type="button" className={sllBtnGhost} disabled={busy} onClick={onSkip}>Pular pedido</button>}
          <button type="button" className={sllBtnPrimary} disabled={busy || !f.number.trim() || !!keyErr} onClick={() => void save()}>
            {busy && <Loader2 size={15} className="animate-spin" />}Registrar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {step && <p className="text-xs font-bold text-[color:var(--sll-b-brand)]">{step}</p>}
        <p className="text-xs text-slate-500">Use para notas já emitidas fora do SLL (contador, emissor da prefeitura ou da SEFAZ).</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SllField label="Série"><input value={f.serie} onChange={(e) => set('serie', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Número da nota *"><input value={f.number} onChange={(e) => set('number', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Data de emissão"><input type="date" value={f.issued} onChange={(e) => set('issued', e.target.value)} className={sllFieldCls} /></SllField>
        </div>
        <SllField label="Chave de acesso (44 números)">
          <input value={f.access_key} onChange={(e) => set('access_key', e.target.value)} className={sllFieldCls} />
        </SllField>
        {keyErr && <p className="text-xs font-semibold text-red-600">{keyErr}</p>}
        {dvWarn && <p className="text-xs font-semibold text-amber-600">O dígito verificador não confere. Você pode registrar mesmo assim, mas confira a chave.</p>}
        <div className="space-y-2">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Arquivo XML da nota</span>
          {file ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <FileUp size={16} className="shrink-0 text-[color:var(--sll-b-brand)]" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs font-normal text-slate-400">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
              </span>
              <button type="button" disabled={busy} title="Remover arquivo" onClick={() => setFile(null)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-5 text-sm font-semibold text-slate-600 transition hover:border-[color:var(--sll-b-brand)] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <FileUp size={16} className="text-[color:var(--sll-b-brand)]" /> Escolher arquivo .xml (até 2 MB)
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                className="hidden"
                onChange={(e) => { const p = e.target.files?.[0]; e.target.value = ''; void pickFile(p); }}
              />
            </label>
          )}
          <p className="text-[11px] text-slate-500">Ao enviar, o sistema lê o XML e preenche número, série, chave, data, destinatário e valor. Confira antes de registrar.</p>
          {!file && (
            <SllField label="Ou informe o link do XML"><input value={f.xml_url} onChange={(e) => set('xml_url', e.target.value)} className={sllFieldCls} /></SllField>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SllField label="Destinatário"><input value={f.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="CPF/CNPJ"><input value={f.recipient_document} onChange={(e) => set('recipient_document', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Valor total (R$)"><input value={f.total} onChange={(e) => set('total', e.target.value)} placeholder="0,00" className={sllFieldCls} /></SllField>
          <SllField label="Canal"><input value={f.channel} onChange={(e) => set('channel', e.target.value)} placeholder="Ex.: yampi" className={sllFieldCls} /></SllField>
        </div>
      </div>
    </SllModal>
  );
}

// ---------------- Inutilizar ----------------
export function NotaInutilizarModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => void }) {
  const [serie, setSerie] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [hist, setHist] = useState<NfInutilizada[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadHist = () => listInutilizadas(storeId).then(setHist).catch((e) => showError(msg(e)));
  useEffect(() => { void loadHist(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const reasonErr = reason ? validateReason(reason) : null;

  const save = async () => {
    setBusy(true);
    try {
      await inutilizar(storeId, serie, from, to || from, reason);
      showSuccess('Numeração inutilizada.');
      setFrom(''); setTo(''); setReason('');
      onSaved();
      await loadHist();
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  const cols: SllColumn<NfInutilizada>[] = [
    { key: 'serie', header: 'Série', render: (i) => i.serie },
    { key: 'range', header: 'Faixa', render: (i) => (i.number_from === i.number_to ? i.number_from : `${i.number_from} a ${i.number_to}`) },
    { key: 'reason', header: 'Justificativa', align: 'left', render: (i) => i.reason },
    { key: 'at', header: 'Data', render: (i) => fmtDateTime(i.created_at) },
  ];

  return (
    <SllModal
      open
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      size="lg"
      title="Inutilizar numeração"
      footer={
        <>
          <button type="button" className={sllBtnGhost} disabled={busy} onClick={onClose}>Fechar</button>
          <button type="button" className={sllBtnPrimary} disabled={busy || !from.trim() || !!validateReason(reason)} onClick={() => void save()}>
            {busy && <Loader2 size={15} className="animate-spin" />}Inutilizar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SllField label="Série"><input value={serie} onChange={(e) => setSerie(e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Número inicial *"><input value={from} onChange={(e) => setFrom(e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Número final"><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Igual ao inicial" className={sllFieldCls} /></SllField>
        </div>
        <SllField label={`Justificativa (mínimo ${NF_MIN_REASON} caracteres)`}>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={sllFieldCls} />
        </SllField>
        <p className={`-mt-3 text-xs font-semibold ${reasonErr ? 'text-red-600' : 'text-slate-500'}`}>{reason.trim().length}/{NF_MIN_REASON}</p>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">Faixas já inutilizadas</h3>
          <SllTable columns={cols} rows={hist ?? []} rowKey={(i) => i.id} loading={hist === null} empty="Nenhuma faixa inutilizada." minWidth="30rem" />
        </div>
      </div>
    </SllModal>
  );
}

// ---------------- Configuração fiscal ----------------
export function NotaSettingsModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [f, setF] = useState<NfSettingsForm | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    getSettings(storeId).then((s) => { if (on) setF(settingsToForm(s)); }).catch((e) => { showError(msg(e)); onClose(); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const set = (k: keyof NfSettingsForm, v: string) => setF((s) => (s ? { ...s, [k]: v } : s));

  const save = async () => {
    if (!f) return;
    setBusy(true);
    try {
      await saveSettings(storeId, f);
      showSuccess('Configuração salva.');
      onClose();
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  return (
    <SllModal
      open
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      title="Configuração fiscal"
      footer={
        <>
          <button type="button" className={sllBtnGhost} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="button" className={sllBtnPrimary} disabled={busy || !f} onClick={() => void save()}>
            {busy && <Loader2 size={15} className="animate-spin" />}Salvar
          </button>
        </>
      }
    >
      {!f ? <div className="py-10"><Spinner /></div> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SllField label="Modo de emissão">
            <select value={f.mode} onChange={(e) => set('mode', e.target.value)} className={sllFieldCls}>
              <option value="manual">Manual (registro de notas emitidas fora)</option>
              <option value="provedor" disabled>Provedor de emissão (em breve)</option>
            </select>
          </SllField>
          <SllField label="Ambiente">
            <select value={f.environment} onChange={(e) => set('environment', e.target.value)} className={sllFieldCls}>
              <option value="homologacao">Homologação</option>
              <option value="producao">Produção</option>
            </select>
          </SllField>
          <SllField label="Regime tributário">
            <select value={f.tax_regime} onChange={(e) => set('tax_regime', e.target.value)} className={sllFieldCls}>
              <option value="">Não informado</option>
              {TAX_REGIMES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </SllField>
          <SllField label="Provedor"><input value={f.provider} onChange={(e) => set('provider', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="CNPJ"><input value={f.cnpj} onChange={(e) => set('cnpj', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Inscrição estadual"><input value={f.ie} onChange={(e) => set('ie', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Série padrão"><input value={f.serie} onChange={(e) => set('serie', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="Próximo número"><input value={f.next_number} onChange={(e) => set('next_number', e.target.value)} className={sllFieldCls} /></SllField>
          <SllField label="CFOP padrão"><input value={f.default_cfop} onChange={(e) => set('default_cfop', e.target.value)} className={sllFieldCls} /></SllField>
        </div>
      )}
    </SllModal>
  );
}