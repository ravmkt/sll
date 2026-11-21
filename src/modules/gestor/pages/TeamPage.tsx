import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, Pencil, Plus, Wand2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import {
  MemberAccess, TeamMember, TeamPermissions, TeamRole, TeamScope,
  callMemberFn, getMyAccess, listTeam, saveMember,
} from '../services/equipe';
import { DEFAULT_PERMISSIONS, ROLE_LABEL, clonePerms, generatePassword } from '../services/teamConfig';
import PermissionMatrix from '../components/PermissionMatrix';

interface Form {
  name: string; email: string; phone: string; role: TeamRole; scope: TeamScope;
  commission: string; active: boolean; permissions: TeamPermissions; password: string;
}

const EMPTY: Form = {
  name: '', email: '', phone: '', role: 'operador', scope: 'all', commission: '',
  active: true, permissions: clonePerms(DEFAULT_PERMISSIONS.operador), password: '',
};

const selectCls = 'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900';

export default function TeamPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [access, setAccess] = useState<MemberAccess | null | undefined>(undefined);
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

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
      if (a && a.active && ['owner', 'admin'].includes(a.role)) setRows(await listTeam(storeId));
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function changeRole(role: TeamRole) {
    setForm((f) => ({
      ...f, role,
      scope: role === 'vendedor' ? 'own' : 'all',
      permissions: clonePerms(DEFAULT_PERMISSIONS[role]),
    }));
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, permissions: clonePerms(DEFAULT_PERMISSIONS.operador), password: generatePassword() });
    setOpen(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({
      name: m.display_name || '', email: m.email || '', phone: m.phone || '',
      role: m.role as TeamRole, scope: m.scope,
      commission: m.commission_pct == null ? '' : String(m.commission_pct),
      active: m.active, permissions: clonePerms(m.permissions || {}), password: '',
    });
    setOpen(true);
  }

  const canTouch = (m: TeamMember) => canManage && m.role !== 'owner' && (m.role !== 'admin' || isOwner);

  async function save() {
    if (!storeId) return;
    if (!form.name.trim()) { showError('Informe o nome.'); return; }
    const raw = form.commission.trim().replace(',', '.');
    const commission = raw === '' ? null : Number(raw);
    if (commission !== null && (!Number.isFinite(commission) || commission < 0 || commission > 100)) {
      showError('A comissão deve estar entre 0 e 100.'); return;
    }
    const perms = form.role === 'admin' ? {} : form.permissions;
    setSaving(true);
    try {
      if (!editing) {
        const email = form.email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showError('E-mail inválido.'); setSaving(false); return; }
        if (form.password.length < 8) { showError('A senha provisória precisa de ao menos 8 caracteres.'); setSaving(false); return; }
        await callMemberFn('create', {
          store_id: storeId, email, display_name: form.name.trim(), password: form.password,
          role: form.role, phone: form.phone.trim() || null, scope: form.scope,
          commission_pct: commission, permissions: perms,
        });
        setOpen(false);
        setCreds({ title: 'Usuário criado', email, password: form.password });
      } else {
        await saveMember(storeId, editing.user_id, {
          role: form.role, display_name: form.name.trim(), phone: form.phone.trim(),
          commission_pct: commission, scope: form.scope, permissions: perms, active: form.active,
        });
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

  const roleOptions: TeamRole[] = ['operador', 'financeiro', 'vendedor', 'contador', ...(isOwner ? (['admin'] as TeamRole[]) : [])];

  if (loading || lojaLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground">
        Só o dono e os administradores da loja gerenciam a equipe.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipe e permissões</h1>
          <p className="text-sm text-muted-foreground">O dono da loja tem acesso total e não aparece na lista.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo usuário</Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground">Nenhum usuário cadastrado ainda.</div>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.display_name || m.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[m.email, m.phone].filter(Boolean).join(' · ')}
                  {m.role === 'vendedor' && m.commission_pct != null ? ` · comissão ${m.commission_pct}%` : ''}
                </p>
              </div>
              <Badge variant="secondary">{ROLE_LABEL[m.role] || m.role}</Badge>
              <span className="text-xs text-muted-foreground">{m.scope === 'all' ? 'Vê tudo' : 'Só o que é dele'}</span>
              {m.must_change_password && <Badge variant="outline">Aguardando 1º acesso</Badge>}
              <Badge variant={m.active ? 'secondary' : 'outline'}>{m.active ? 'Ativo' : 'Inativo'}</Badge>
              {canTouch(m) && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button
                    size="icon" variant="ghost" aria-label="Redefinir senha"
                    onClick={() => { setResetFor(m); setResetPwd(generatePassword()); }}
                  ><KeyRound className="h-4 w-4" /></Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_label]:text-slate-700">
          <DialogHeader><DialogTitle>{editing ? 'Editar usuário' : 'Novo usuário'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium">E-mail *</label>
              <Input value={form.email} onChange={(e) => set('email', e.target.value)} disabled={!!editing} type="email" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium">Função *</label>
              <select
                className={selectCls}
                value={form.role}
                onChange={(e) => changeRole(e.target.value as TeamRole)}
                disabled={editing?.role === 'admin' && !isOwner}
              >
                {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium">O que enxerga</label>
              <select className={selectCls} value={form.scope} onChange={(e) => set('scope', e.target.value as TeamScope)} disabled={form.role === 'admin'}>
                <option value="all">Todos os registros da loja</option>
                <option value="own">Apenas os próprios</option>
              </select>
            </div>
            {form.role === 'vendedor' && (
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-sm font-medium">Comissão (%)</label>
                <Input value={form.commission} onChange={(e) => set('commission', e.target.value)} inputMode="decimal" placeholder="Ex.: 5" />
              </div>
            )}
            {!editing && (
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Senha provisória * (será trocada no 1º acesso)</label>
                <div className="flex gap-2">
                  <Input value={form.password} onChange={(e) => set('password', e.target.value)} />
                  <Button type="button" variant="outline" onClick={() => set('password', generatePassword())}>
                    <Wand2 className="mr-1 h-4 w-4" /> Gerar
                  </Button>
                </div>
              </div>
            )}
            {editing && (
              <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[color:var(--sll-b-brand)]" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                Usuário ativo (desmarque para bloquear o acesso)
              </label>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Permissões</p>
            {form.role === 'admin' ? (
              <p className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">O administrador tem acesso total ao Gestor.</p>
            ) : (
              <PermissionMatrix value={form.permissions} onChange={(v) => set('permissions', v)} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{editing ? 'Salvar' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(v) => { if (!v) setResetFor(null); }}>
        <DialogContent className="max-w-md bg-white text-slate-900 [&_input]:bg-white [&_input]:text-slate-900 [&_label]:text-slate-700">
          <DialogHeader><DialogTitle>Redefinir senha de {resetFor?.display_name || resetFor?.email}</DialogTitle></DialogHeader>
          <label className="block text-sm font-medium">Nova senha provisória</label>
          <div className="flex gap-2">
            <Input value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => setResetPwd(generatePassword())}><Wand2 className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">No próximo acesso, o usuário será obrigado a criar uma senha nova.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetFor(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={doReset} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Redefinir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creds} onOpenChange={(v) => { if (!v) setCreds(null); }}>
        <DialogContent className="max-w-md bg-white text-slate-900">
          <DialogHeader><DialogTitle>{creds?.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Envie estes dados ao usuário. A senha não será exibida novamente.</p>
          <div className="space-y-1 rounded-md border bg-slate-50 p-3 font-mono text-sm">
            <p>E-mail: {creds?.email}</p>
            <p>Senha: {creds?.password}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => copy(`E-mail: ${creds?.email}\nSenha provisória: ${creds?.password}`)}>
              <Copy className="mr-1 h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => setCreds(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}