import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Loader2, Pencil, Plus, Settings2, Wand2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { showError, showSuccess } from '@/utils/toast';
import {
  callMemberFn, getMyAccess, listMemberTypes, listTeam, saveMember, setMemberType,
} from '../services/equipe';
import type { MemberAccess, MemberType, TeamMember, TeamPermissions, TeamRole, TeamScope } from '../services/equipe';
import { ROLE_LABEL, clonePerms, generatePassword } from '../services/teamConfig';
import PermissionMatrix from '../components/PermissionMatrix';
import UserTypesModal from '../components/UserTypesModal';

const ADMIN = '__admin';

type Form = {
  name: string; email: string; phone: string; typeId: string; scope: TeamScope;
  commission: string; active: boolean; permissions: TeamPermissions; password: string;
};

const EMPTY: Form = {
  name: '', email: '', phone: '', typeId: '', scope: 'all', commission: '',
  active: true, permissions: {}, password: '',
};

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

const actionBtn =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800';

export default function TeamPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [access, setAccess] = useState<MemberAccess | null | undefined>(undefined);
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [types, setTypes] = useState<MemberType[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);

  const [resetFor, setResetFor] = useState<TeamMember | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [creds, setCreds] = useState<{ title: string; email: string; password: string } | null>(null);

  const isOwner = access?.role === 'owner';
  const canManage = !!access && access.active && ['owner', 'admin'].includes(access.role);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const a = await getMyAccess(storeId);
      setAccess(a);
      if (a && a.active && ['owner', 'admin'].includes(a.role)) {
        const [list, ts] = await Promise.all([listTeam(storeId), listMemberTypes(storeId)]);
        setRows(list);
        setTypes(ts);
      }
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void reload(); }, [lojaLoading, reload]);

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const effTypeId = (m: TeamMember) =>
    m.role === 'admin' ? ADMIN : (m.type_id ?? types.find((t) => t.role === m.role)?.id ?? '');
  const effTypeName = (m: TeamMember) =>
    m.role === 'admin' ? ROLE_LABEL.admin : (typeById.get(effTypeId(m))?.name ?? ROLE_LABEL[m.role] ?? m.role);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    const list = rows.filter((m) => {
      if (fStatus === 'active' && !m.active) return false;
      if (fStatus === 'inactive' && m.active) return false;
      if (fType && effTypeId(m) !== fType) return false;
      if (!q) return true;
      return norm([m.display_name, m.email, m.phone, effTypeName(m)].filter(Boolean).join(' ')).includes(q);
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (m: TeamMember) =>
      sort.key === 'type' ? norm(effTypeName(m)) : sort.key === 'status' ? (m.active ? '1' : '0') : norm(m.display_name || m.email);
    return [...list].sort((a, b) => val(a).localeCompare(val(b), 'pt-BR') * dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, types, search, fType, fStatus, sort]);

  const onSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const activeTypes = types.filter((t) => t.active);
  const selType = typeById.get(form.typeId);
  const isAdminSel = form.typeId === ADMIN;
  const showCommission = !isAdminSel && !!selType?.has_commission;

  function changeType(id: string) {
    const t = typeById.get(id);
    setForm((f) => ({
      ...f, typeId: id,
      scope: t ? t.scope : 'all',
      permissions: t ? clonePerms(t.permissions || {}) : {},
    }));
  }

  function openNew() {
    const t = activeTypes[0];
    if (!t) { showError('Cadastre ao menos um tipo de usuário antes.'); return; }
    setEditing(null);
    setForm({ ...EMPTY, typeId: t.id, scope: t.scope, permissions: clonePerms(t.permissions || {}), password: generatePassword() });
    setOpen(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({
      name: m.display_name || '', email: m.email || '', phone: m.phone || '',
      typeId: effTypeId(m), scope: m.scope,
      commission: m.commission_pct == null ? '' : String(m.commission_pct),
      active: m.active, permissions: clonePerms(m.permissions || {}), password: '',
    });
    setOpen(true);
  }

  const canTouch = (m: TeamMember) => canManage && m.role !== 'owner' && (m.role !== 'admin' || isOwner);

  async function save() {
    if (!storeId) return;
    if (!form.name.trim()) { showError('Informe o nome.'); return; }
    if (!isAdminSel && !selType) { showError('Escolha o tipo de usuário.'); return; }
    const raw = form.commission.trim().replace(',', '.');
    const commission = showCommission && raw !== '' ? Number(raw) : null;
    if (commission !== null && (!Number.isFinite(commission) || commission < 0 || commission > 100)) {
      showError('A comissão deve estar entre 0 e 100.'); return;
    }
    const role: TeamRole = isAdminSel ? 'admin' : (selType!.role as TeamRole);
    const perms = isAdminSel ? {} : form.permissions;
    const typeId = isAdminSel ? null : form.typeId;
    setSaving(true);
    try {
      if (!editing) {
        const email = form.email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showError('E-mail inválido.'); return; }
        if (form.password.length < 8) { showError('A senha provisória precisa de ao menos 8 caracteres.'); return; }
        const res = await callMemberFn<{ user_id?: string }>('create', {
          store_id: storeId, email, display_name: form.name.trim(), password: form.password,
          role, phone: form.phone.trim() || null, scope: form.scope,
          commission_pct: commission, permissions: perms,
        });
        if (res?.user_id && typeId) {
          try { await setMemberType(storeId, res.user_id, typeId); }
          catch (e) { showError('Usuário criado, mas o tipo não foi gravado: ' + (e as Error).message); }
        }
        setOpen(false);
        setCreds({ title: 'Usuário criado', email, password: form.password });
      } else {
        await saveMember(storeId, editing.user_id, {
          role, display_name: form.name.trim(), phone: form.phone.trim(),
          commission_pct: commission, scope: form.scope, permissions: perms, active: form.active,
        });
        await setMemberType(storeId, editing.user_id, typeId);
        showSuccess('Usuário atualizado.');
        setOpen(false);
      }
      await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function doReset() {
    if (!storeId || !resetFor) return;
    if (resetPwd.length < 8) { showError('A senha provisória precisa de ao menos 8 caracteres.'); return; }
    setSaving(true);
    try {
      await callMemberFn('reset_password', { store_id: storeId, user_id: resetFor.user_id, password: resetPwd });
      setCreds({ title: 'Senha redefinida', email: resetFor.email || '', password: resetPwd });
      setResetFor(null);
      await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); showSuccess('Copiado.'); }
    catch { showError('Não foi possível copiar.'); }
  }

  const columns: SllColumn<TeamMember>[] = [
    {
      key: 'name', sortKey: 'name', header: 'Usuário',
      render: (m) => (
        <>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{m.display_name || m.email}</p>
          <p className="text-[11px] text-slate-400">{[m.email, m.phone].filter(Boolean).join(' · ') || '-'}</p>
        </>
      ),
    },
    {
      key: 'type', sortKey: 'type', header: 'Tipo',
      render: (m) => (
        <>
          <span className="rounded-full bg-[color:var(--sll-b-brand-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[color:var(--sll-b-brand)]">{effTypeName(m)}</span>
          {m.commission_pct != null && <span className="ml-2 text-[11px] text-slate-400">comissão {m.commission_pct}%</span>}
        </>
      ),
    },
    { key: 'scope', header: 'Acesso', render: (m) => <span className="text-slate-500">{m.role === 'admin' ? 'Total' : m.scope === 'all' ? 'Vê tudo' : 'Só o que é dele'}</span> },
    {
      key: 'status', sortKey: 'status', header: 'Status', align: 'center', className: 'w-40',
      render: (m) => (
        <>
          <span className={`text-[11px] font-bold uppercase ${m.active ? 'text-emerald-600' : 'text-rose-600'}`}>{m.active ? 'Ativo' : 'Inativo'}</span>
          {m.must_change_password && <p className="text-[10px] text-slate-400">Aguardando 1º acesso</p>}
        </>
      ),
    },
    {
      key: 'acoes', header: 'Ações', align: 'center', className: 'w-28',
      render: (m) => canTouch(m) ? (
        <div className="flex items-center justify-center gap-1">
          <button type="button" title="Editar" aria-label="Editar usuário" onClick={() => openEdit(m)} className={actionBtn}><Pencil size={15} /></button>
          <button type="button" title="Redefinir senha" aria-label="Redefinir senha" onClick={() => { setResetFor(m); setResetPwd(generatePassword()); }} className={actionBtn}><KeyRound size={15} /></button>
        </div>
      ) : null,
    },
  ];

  if (loading || lojaLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
        Só o dono e os administradores da loja gerenciam os usuários.
      </div>
    );
  }

  const formFooter = (
    <>
      <button type="button" disabled={saving} onClick={() => setOpen(false)} className={sllBtnGhost}>Cancelar</button>
      <button type="button" disabled={saving} onClick={() => void save()} className={sllBtnPrimary}>
        {saving && <Loader2 size={15} className="animate-spin" />}{editing ? 'Salvar' : 'Criar usuário'}
      </button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-slate-500">Quem acessa o Gestor, o tipo de cada um e o que pode fazer. O dono tem acesso total e não aparece na lista.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTypesOpen(true)} className={sllBtnGhost}><Settings2 size={16} /> Tipos de usuário</button>
          <button type="button" onClick={openNew} className={sllBtnPrimary}><Plus size={16} /> Novo usuário</button>
        </div>
      </div>

      <SllFilterBar>
        <SllSearch value={search} onChange={setSearch} placeholder="Nome, e-mail, telefone ou tipo..." />
        <SllField label="Tipo" className="w-56">
          <select value={fType} onChange={(e) => setFType(e.target.value)} className={sllFieldCls + ' cursor-pointer'}>
            <option value="">Todos os tipos</option>
            <option value={ADMIN}>{ROLE_LABEL.admin}</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.active ? '' : ' (inativo)'}</option>)}
          </select>
        </SllField>
        <SllField label="Status" className="w-44">
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value as 'all' | 'active' | 'inactive')} className={sllFieldCls + ' cursor-pointer'}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </SllField>
      </SllFilterBar>

      <SllTable
        columns={columns}
        rows={filtered}
        rowKey={(m) => m.id}
        sort={sort}
        onSort={onSort}
        onRowClick={(m) => { if (canTouch(m)) openEdit(m); }}
        empty={rows.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado.'}
        minWidth="48rem"
      />

      <SllModal open={open} onOpenChange={(v) => { if (!v && !saving) setOpen(false); }} title={editing ? 'Editar usuário' : 'Novo usuário'} size="lg" footer={formFooter}>
        <div className="space-y-4">
          <Card title="Dados">
            <div className="grid gap-3 sm:grid-cols-2">
              <SllField label="Nome *"><input className={sllFieldCls} value={form.name} onChange={(e) => set('name', e.target.value)} /></SllField>
              <SllField label="E-mail *"><input className={sllFieldCls} type="email" value={form.email} disabled={!!editing} onChange={(e) => set('email', e.target.value)} /></SllField>
              <SllField label="Telefone / WhatsApp"><input className={sllFieldCls} inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></SllField>
              {!editing && (
                <SllField label="Senha provisória * (trocada no 1º acesso)">
                  <div className="flex gap-2">
                    <input className={sllFieldCls} value={form.password} onChange={(e) => set('password', e.target.value)} />
                    <button type="button" title="Gerar senha" onClick={() => set('password', generatePassword())} className={sllBtnGhost + ' shrink-0 !px-3 !py-2'}><Wand2 size={15} /></button>
                  </div>
                </SllField>
              )}
            </div>
          </Card>

          <Card title="Tipo e acesso">
            <div className="grid gap-3 sm:grid-cols-2">
              <SllField label="Tipo de usuário *">
                <select
                  className={sllFieldCls + ' cursor-pointer'}
                  value={form.typeId}
                  disabled={editing?.role === 'admin' && !isOwner}
                  onChange={(e) => changeType(e.target.value)}
                >
                  {(isOwner || isAdminSel) && <option value={ADMIN}>{ROLE_LABEL.admin} (acesso total)</option>}
                  {types.filter((t) => t.active || t.id === form.typeId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {!form.typeId && <option value="">Selecione...</option>}
                </select>
              </SllField>
              <SllField label="O que enxerga">
                <select className={sllFieldCls + ' cursor-pointer'} value={form.scope} disabled={isAdminSel} onChange={(e) => set('scope', e.target.value as TeamScope)}>
                  <option value="all">Todos os registros da loja</option>
                  <option value="own">Apenas os próprios</option>
                </select>
              </SllField>
              {showCommission && (
                <SllField label="Comissão (%)">
                  <input className={sllFieldCls} inputMode="decimal" placeholder="Ex.: 5" value={form.commission} onChange={(e) => set('commission', e.target.value)} />
                </SllField>
              )}
              {editing && (
                <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                  Usuário ativo (desmarque para bloquear o acesso)
                </label>
              )}
            </div>
          </Card>

          <Card title="Permissões">
            {isAdminSel ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">O administrador tem acesso total ao Gestor.</p>
            ) : (
              <>
                <PermissionMatrix value={form.permissions} onChange={(v) => set('permissions', v)} />
                <p className="mt-2 text-[11px] text-slate-400">Começam pelo padrão do tipo escolhido e podem ser ajustadas só para este usuário.</p>
              </>
            )}
          </Card>
        </div>
      </SllModal>

      <SllModal
        open={!!resetFor}
        onOpenChange={(v) => { if (!v && !saving) setResetFor(null); }}
        title={`Redefinir senha de ${resetFor?.display_name || resetFor?.email || ''}`}
        size="md"
        footer={(
          <>
            <button type="button" disabled={saving} onClick={() => setResetFor(null)} className={sllBtnGhost}>Cancelar</button>
            <button type="button" disabled={saving} onClick={() => void doReset()} className={sllBtnPrimary}>
              {saving && <Loader2 size={15} className="animate-spin" />}Redefinir
            </button>
          </>
        )}
      >
        <SllField label="Nova senha provisória">
          <div className="flex gap-2">
            <input className={sllFieldCls} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
            <button type="button" title="Gerar senha" onClick={() => setResetPwd(generatePassword())} className={sllBtnGhost + ' shrink-0 !px-3 !py-2'}><Wand2 size={15} /></button>
          </div>
        </SllField>
        <p className="mt-2 text-xs text-slate-500">No próximo acesso, o usuário será obrigado a criar uma senha nova.</p>
      </SllModal>

      <SllModal
        open={!!creds}
        onOpenChange={(v) => { if (!v) setCreds(null); }}
        title={creds?.title ?? ''}
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => void copy(`E-mail: ${creds?.email}\nSenha provisória: ${creds?.password}`)} className={sllBtnGhost}><Copy size={15} /> Copiar</button>
            <button type="button" onClick={() => setCreds(null)} className={sllBtnPrimary}>Fechar</button>
          </>
        )}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">Envie estes dados ao usuário. A senha não será exibida novamente.</p>
        <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p>E-mail: {creds?.email}</p>
          <p>Senha: {creds?.password}</p>
        </div>
      </SllModal>

      {typesOpen && storeId && (
        <UserTypesModal storeId={storeId} types={types} onChanged={() => void reload()} onClose={() => setTypesOpen(false)} />
      )}
    </div>
  );
}