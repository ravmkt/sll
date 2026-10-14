import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Mail, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { sendMasterEmail, logCommunication, getCancelPreview, type AdminSub, type CancelPreview, type PlanOption } from '@/services/admin/storesService';
import { ICON, INPUT, digits, modLabel } from '@/components/admin/storeUi';

const LBL = 'text-xs font-bold uppercase tracking-wider text-slate-500';
const BTN = 'rounded-lg px-4 py-2 text-[13px] font-bold disabled:opacity-40';
const PRIMARY = `${BTN} flex items-center gap-2 bg-[#fd8539] text-white`;
const GHOST = `${BTN} text-slate-300 hover:bg-white/10`;
const planTxt = (p: PlanOption) => `${p.name || 'Sem nome'}${p.is_active === false ? ' (inativo)' : ''}`;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#0b0f1c] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spin({ on }: { on: boolean }) {
  return on ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function EmailModal({ to, storeName, busy, onClose, onSend }: {
  to: string; storeName: string; busy: boolean; onClose: () => void; onSend: (to: string, s: string, m: string) => void;
}) {
  const [dest, setDest] = useState(to);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const destOk = EMAIL_RE.test(dest.trim());
  const subjOk = subject.trim().length >= 3;
  const msgOk = message.trim().length >= 10;
  const ok = destOk && subjOk && msgOk;
  const pend = [!destOk && 'e-mail do destinatário válido', !subjOk && 'assunto (mín. 3 caracteres)', !msgOk && 'mensagem (mín. 10 caracteres)'].filter(Boolean);
  return (
    <Modal title={`E-mail para ${storeName}`} onClose={onClose}>
      <label className="block space-y-1">
        <span className={LBL}>Destinatário</span>
        <input type="email" value={dest} onChange={(e) => setDest(e.target.value)} className={`${INPUT} ${dest && !destOk ? 'border-rose-500' : ''}`} placeholder="email@dominio.com" />
        {dest && !destOk && <span className="block text-[13px] text-rose-400">Informe um e-mail válido.</span>}
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Assunto</span>
        <input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} className={INPUT} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Mensagem</span>
        <textarea value={message} maxLength={10000} rows={7} onChange={(e) => setMessage(e.target.value)} className={INPUT} />
      </label>
      {pend.length > 0 && <p className="text-[13px] text-slate-500">Falta preencher: {pend.join(', ')}.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Cancelar</button>
        <button type="button" disabled={!ok || busy} onClick={() => onSend(dest.trim(), subject.trim(), message.trim())} className={PRIMARY}><Spin on={busy} /> Enviar E-mail</button>
      </div>
    </Modal>
  );
}
function WhatsAppModal({ phone, message, onClose, onSend }: {
  phone: string; message: string; onClose: () => void; onSend: (phone: string, msg: string) => void;
}) {
  const [num, setNum] = useState(phone);
  const [msg, setMsg] = useState(message);
  const numOk = digits(num).length >= 10;
  const msgOk = msg.trim().length >= 3;
  const pend = [!numOk && 'número com DDD', !msgOk && 'mensagem'].filter(Boolean);
  return (
    <Modal title="Enviar WhatsApp" onClose={onClose}>
      <label className="block space-y-1">
        <span className={LBL}>Número</span>
        <input value={num} onChange={(e) => setNum(e.target.value)} className={`${INPUT} ${num && !numOk ? 'border-rose-500' : ''}`} placeholder="(41) 99999-9999" />
        {num && !numOk && <span className="block text-[13px] text-rose-400">Informe o número com DDD.</span>}
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Mensagem</span>
        <textarea value={msg} maxLength={2000} rows={6} onChange={(e) => setMsg(e.target.value)} className={INPUT} />
      </label>
      {pend.length > 0 && <p className="text-[13px] text-slate-500">Falta preencher: {pend.join(', ')}.</p>}
      <p className="text-[13px] text-slate-500">O WhatsApp abre com a mensagem pronta. Você confirma o envio por lá.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Cancelar</button>
        <button type="button" disabled={!numOk || !msgOk} onClick={() => onSend(num, msg.trim())} className={PRIMARY}>Abrir WhatsApp</button>
      </div>
    </Modal>
  );
}

export function ContactActions({ storeId, storeName, contactName, whatsapp, email, variant = 'icons', onLogged }: {
  storeId: string; storeName?: string | null; contactName?: string | null; whatsapp?: string | null; email?: string | null;
  variant?: 'icons' | 'buttons'; onLogged?: () => void;
}) {
  const [mail, setMail] = useState(false);
  const [wa, setWa] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = storeName || 'sua loja';
  const first = (contactName || '').trim().split(/\s+/)[0];
  const defaultMsg = `Olá${first ? ` ${first}` : ''}, aqui é da equipe do SLL Hub. Estou entrando em contato referente à sua loja ${name}.`;

  const sendWa = (phone: string, message: string) => {
    let n = digits(phone);
    if (n.length <= 11 || !n.startsWith('55')) n = `55${n}`;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    setWa(false);
    logCommunication({ storeId, channel: 'whatsapp', recipient: n, message, status: 'opened' })
      .then(() => onLogged?.())
      .catch((e: any) => toast.error(e?.message || 'Não foi possível registrar no histórico.'));
  };

  const sendMail = async (to: string, subject: string, message: string) => {
    setBusy(true);
    try {
      const r = await sendMasterEmail(storeId, to, subject, message);
      await logCommunication({ storeId, channel: 'email', recipient: r?.to || to, subject, message, status: 'sent' }).catch(() => {});
      toast.success(`E-mail enviado para ${r?.to || to}.`);
      setMail(false);
      onLogged?.();
    } catch (e: any) {
      await logCommunication({ storeId, channel: 'email', recipient: to, subject, message, status: 'failed', error: e?.message || 'Erro ao enviar' }).catch(() => {});
      toast.error(e?.message || 'Erro ao enviar o e-mail.');
      onLogged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {variant === 'buttons' ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setWa(true)} className={`${BTN} flex items-center gap-2 bg-emerald-600 text-white`}><MessageCircle size={14} /> Enviar WhatsApp</button>
          <button type="button" onClick={() => setMail(true)} className={PRIMARY}><Mail size={14} /> Enviar E-mail</button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWa(true)} title="WhatsApp (suporte)" className="rounded-lg p-1.5 hover:bg-white/10">
            <MessageCircle size={18} className={whatsapp ? ICON : 'text-slate-700'} />
          </button>
          <button type="button" onClick={() => setMail(true)} title={email || 'Sem e-mail'} className="rounded-lg p-1.5 hover:bg-white/10">
            <Mail size={18} className={email ? ICON : 'text-slate-700'} />
          </button>
        </div>
      )}
      {mail && <EmailModal to={email || ''} storeName={name} busy={busy} onClose={() => setMail(false)} onSend={sendMail} />}
      {wa && <WhatsAppModal phone={whatsapp || ''} message={defaultMsg} onClose={() => setWa(false)} onSend={sendWa} />}
    </>
  );
}
export function CancelSubscriptionModal({ subscriptionId, onClose, onConfirm }: {
  subscriptionId: string; onClose: () => void; onConfirm: (refund: boolean) => void;
}) {
  const [info, setInfo] = useState<CancelPreview | null>(null);
  const [err, setErr] = useState('');
  const [refund, setRefund] = useState(false);

  useEffect(() => {
    let alive = true;
    getCancelPreview(subscriptionId)
      .then((i) => { if (alive) setInfo(i); })
      .catch((e: any) => { if (alive) setErr(e?.message || 'Não foi possível consultar a assinatura.'); });
    return () => { alive = false; };
  }, [subscriptionId]);

  const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
  const lp = info?.last_payment ?? null;
  const loading = !info && !err;
  const daysTxt = !info ? '' : info.days === 0 ? 'hoje' : `há ${info.days} ${info.days === 1 ? 'dia' : 'dias'}`;

  return (
    <Modal title="Cancelar assinatura" onClose={onClose}>
      {loading && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>}
      {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">{err} Você ainda pode cancelar sem estorno.</p>}

      {info && (
        <div className={`rounded-lg px-3 py-2 text-[13px] font-semibold ${info.within_guarantee ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
          Assinado {daysTxt} ·{' '}
          {info.within_guarantee
            ? `Dentro do prazo de ${info.guarantee_days} dias de garantia`
            : 'Fora do prazo de garantia'}
        </div>
      )}

      {info && (
        lp ? (
          <p className="text-[13px] text-slate-400">
            Última cobrança paga: <b className="text-white">{money(lp.value)}</b>
            {lp.date ? ` em ${fmtDate(lp.date)}` : ''}{lp.billing_type ? ` (${lp.billing_type === 'CREDIT_CARD' ? 'cartão' : lp.billing_type === 'PIX' ? 'Pix' : lp.billing_type})` : ''}.
          </p>
        ) : (
          <p className="text-[13px] text-slate-500">Nenhuma cobrança paga encontrada. Não há o que estornar.</p>
        )
      )}

      <label className={`flex items-start gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-[15px] ${lp ? 'cursor-pointer text-slate-200' : 'cursor-not-allowed text-slate-600'}`}>
        <input type="checkbox" checked={refund} disabled={!lp} onChange={(e) => setRefund(e.target.checked)} className="mt-0.5" />
        <span>Sim, realizar estorno integral{lp ? ` (${money(lp.value)})` : ''}</span>
      </label>

      {refund && info && !info.within_guarantee && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">
          Esta assinatura está fora do prazo de garantia. O estorno é uma decisão sua e fica registrado no log de auditoria.
        </p>
      )}
      <p className="text-[13px] text-slate-500">
        O cancelamento interrompe as próximas cobranças. O estorno é feito no Asaas e não pode ser desfeito por aqui.
      </p>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Voltar</button>
        <button type="button" disabled={loading} onClick={() => onConfirm(refund && !!lp)} className={`${BTN} bg-rose-600 text-white`}>
          {refund && lp ? 'Cancelar e estornar' : 'Cancelar assinatura'}
        </button>
      </div>
    </Modal>
  );
}

export function ChangePlanModal({ sub, plans, busy, onClose, onConfirm }: {
  sub: AdminSub; plans: PlanOption[]; busy: boolean; onClose: () => void; onConfirm: (planId: string) => void;
}) {
  const [sel, setSel] = useState('');
  const isCombo = !sub.module_key || sub.module_key === 'bundle';
  const options = plans.filter((p) => p.name !== sub.plan_name && (isCombo ? p.is_combo : !p.is_combo && p.module_key === sub.module_key));
  return (
    <Modal title="Alterar plano" onClose={onClose}>
      <p className="text-[13px] text-slate-400">
        Módulo: <b className="text-white">{isCombo ? 'Combo' : modLabel(sub.module_key as string)}</b> · plano atual: <b className="text-white">{sub.plan_name || '—'}</b>
      </p>
      <label className="block space-y-1">
        <span className={LBL}>Novo plano</span>
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={INPUT}>
          <option value="">Selecione…</option>
          {options.map((p) => <option key={p.id} value={p.id}>{planTxt(p)}</option>)}
        </select>
      </label>
      {sub.has_asaas && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">Há cobrança ativa no Asaas: a troca não altera o valor já cobrado lá.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Cancelar</button>
        <button type="button" disabled={!sel || busy} onClick={() => onConfirm(sel)} className={PRIMARY}><Spin on={busy} /> Confirmar troca</button>
      </div>
    </Modal>
  );
}

export function NewSubscriptionModal({ plans, busy, onClose, onCreate }: {
  plans: PlanOption[]; busy: boolean; onClose: () => void;
  onCreate: (moduleKey: string, planId: string, cycle: string, status: string) => void;
}) {
  const [module, setModule] = useState('');
  const [planId, setPlanId] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [status, setStatus] = useState('active');
  const mods = useMemo(() => Array.from(new Set(plans.filter((p) => !p.is_combo && p.module_key).map((p) => p.module_key as string))), [plans]);
  const hasCombo = plans.some((p) => p.is_combo);
  const options = plans.filter((p) => (module === 'bundle' ? p.is_combo : !p.is_combo && p.module_key === module));
  return (
    <Modal title="Nova assinatura / ativar módulo" onClose={onClose}>
      <label className="block space-y-1">
        <span className={LBL}>Módulo</span>
        <select value={module} onChange={(e) => { setModule(e.target.value); setPlanId(''); }} className={INPUT}>
          <option value="">Selecione…</option>
          {mods.map((m) => <option key={m} value={m}>{modLabel(m)}</option>)}
          {hasCombo && <option value="bundle">Combo (bundle)</option>}
        </select>
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Plano</span>
        <select value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={!module} className={INPUT}>
          <option value="">Selecione…</option>
          {options.map((p) => <option key={p.id} value={p.id}>{planTxt(p)}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={LBL}>Ciclo</span>
          <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={INPUT}>
            <option value="monthly">Mensal</option>
            <option value="semiannual">Semestral</option>
            <option value="yearly">Anual</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LBL}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
            <option value="active">Ativa</option>
            <option value="trialing">Trial</option>
            <option value="lifetime">Vitalícia</option>
          </select>
        </label>
      </div>
      <p className="text-[13px] text-slate-500">Cria a assinatura manualmente, sem cobrança no Asaas. Para um módulo que já existe, use Ações &gt; Alterar plano.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Cancelar</button>
        <button type="button" disabled={!module || !planId || busy} onClick={() => onCreate(module === 'bundle' ? '' : module, planId, cycle, status)} className={PRIMARY}><Spin on={busy} /> Criar assinatura</button>
      </div>
    </Modal>
  );
}