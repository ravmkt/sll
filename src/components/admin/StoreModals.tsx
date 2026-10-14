import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Mail, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { sendMasterEmail, type AdminSub, type PlanOption } from '@/services/admin/storesService';
import { ICON, INPUT, digits, modLabel } from '@/components/admin/storeUi';

const LBL = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';
const BTN = 'rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40';
const PRIMARY = `${BTN} flex items-center gap-2 bg-[#fd8539] text-white`;
const GHOST = `${BTN} text-slate-300 hover:bg-white/10`;
const planTxt = (p: PlanOption) => `${p.name || 'Sem nome'}${p.is_active === false ? ' (inativo)' : ''}`;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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

function EmailModal({ to, storeName, busy, onClose, onSend }: {
  to: string; storeName: string; busy: boolean; onClose: () => void; onSend: (s: string, m: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const ok = subject.trim().length >= 3 && message.trim().length >= 10;
  return (
    <Modal title={`E-mail para ${storeName}`} onClose={onClose}>
      <label className="block space-y-1">
        <span className={LBL}>Destinatário</span>
        <input value={to} disabled readOnly className={`${INPUT} cursor-not-allowed opacity-60`} />
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Assunto</span>
        <input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} className={INPUT} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className={LBL}>Mensagem</span>
        <textarea value={message} maxLength={10000} rows={7} onChange={(e) => setMessage(e.target.value)} className={INPUT} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Cancelar</button>
        <button type="button" disabled={!ok || busy} onClick={() => onSend(subject.trim(), message.trim())} className={PRIMARY}><Spin on={busy} /> Enviar E-mail</button>
      </div>
    </Modal>
  );
}

export function ContactActions({ storeId, storeName, contactName, whatsapp, email }: {
  storeId: string; storeName?: string | null; contactName?: string | null; whatsapp?: string | null; email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = storeName || 'sua loja';

  const openWa = () => {
    let n = digits(whatsapp);
    if (!n) { toast.error('Nenhum WhatsApp cadastrado na aba Dados desta loja.'); return; }
    if (n.length <= 11 || !n.startsWith('55')) n = `55${n}`;
    const first = (contactName || '').trim().split(/\s+/)[0];
    const msg = `Olá${first ? ` ${first}` : ''}, aqui é da equipe do SLL Hub. Estou entrando em contato referente à sua loja ${name}.`;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const openMail = () => {
    if (!email) { toast.error('Nenhum e-mail de contato cadastrado na aba Dados desta loja.'); return; }
    setOpen(true);
  };

  const send = async (subject: string, message: string) => {
    setBusy(true);
    try {
      const r = await sendMasterEmail(storeId, subject, message);
      toast.success(`E-mail enviado para ${r?.to || email}.`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar o e-mail.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button type="button" onClick={openWa} title="WhatsApp (suporte)" className="rounded-lg p-1.5 hover:bg-white/10">
          <MessageCircle size={18} className={whatsapp ? ICON : 'text-slate-700'} />
        </button>
        <button type="button" onClick={openMail} title={email || 'Sem e-mail'} className="rounded-lg p-1.5 hover:bg-white/10">
          <Mail size={18} className={email ? ICON : 'text-slate-700'} />
        </button>
      </div>
      {open && email && <EmailModal to={email} storeName={name} busy={busy} onClose={() => setOpen(false)} onSend={send} />}
    </>
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
      <p className="text-xs text-slate-400">
        Módulo: <b className="text-white">{isCombo ? 'Combo' : modLabel(sub.module_key as string)}</b> · plano atual: <b className="text-white">{sub.plan_name || '—'}</b>
      </p>
      <label className="block space-y-1">
        <span className={LBL}>Novo plano</span>
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={INPUT}>
          <option value="">Selecione…</option>
          {options.map((p) => <option key={p.id} value={p.id}>{planTxt(p)}</option>)}
        </select>
      </label>
      {sub.has_asaas && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">Há cobrança ativa no Asaas: a troca não altera o valor já cobrado lá.</p>}
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
      <p className="text-[11px] text-slate-500">Cria a assinatura manualmente, sem cobrança no Asaas. Para um módulo que já existe, use Ações &gt; Alterar plano.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={GHOST}>Cancelar</button>
        <button type="button" disabled={!module || !planId || busy} onClick={() => onCreate(module === 'bundle' ? '' : module, planId, cycle, status)} className={PRIMARY}><Spin on={busy} /> Criar assinatura</button>
      </div>
    </Modal>
  );
}