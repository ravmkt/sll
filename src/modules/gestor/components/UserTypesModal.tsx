import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { ConfirmDangerModal } from '@/components/common/AppModal';
import { showError, showSuccess } from '@/utils/toast';
import { deleteMemberType, saveMemberType } from '../services/equipe';
import type { MemberType, TeamScope, TypeRole } from '../services/equipe';
import { DEFAULT_PERMISSIONS, ROLE_LABEL, clonePerms } from '../services/teamConfig';
import PermissionMatrix from './PermissionMatrix';

const BASE_LABEL: Record<TypeRole, string> = {
  operador: 'Operacional (pode alterar cadastros)',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
  contador: 'Contador (somente consulta)',
};

type Draft = Omit<MemberType, 'store_id' | 'is_system' | 'sort_order'> & { id: string | null };

const NEW: Draft = {
  id: null, name: '', role: 'operador', scope: 'all', has_commission: false,
  permissions: clonePerms(DEFAULT_PERMISSIONS.operador), active: true,
};

type Props = { storeId: string; types: MemberType[]; onChanged: () => void; onClose: () => void };

export default function UserTypesModal({ storeId, types, onChanged, onClose }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<MemberType | null>(null);

  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  function changeRole(role: TypeRole) {
    setDraft((d) => {
      if (!d) return d;
      if (d.id) return { ...d, role };
      return {
        ...d, role,
        scope: role === 'vendedor' ? 'own' : 'all',
        has_commission: role === 'vendedor',
        permissions: clonePerms(DEFAULT_PERMISSIONS[role]),
      };
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { showError('Informe o nome do tipo.'); return; }
    setBusy(true);
    try {
      await saveMemberType(storeId, { ...draft, name: draft.name.trim() });
      showSuccess('Tipo salvo.');
      setDraft(null);
      onChanged();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteMemberType(storeId, removing.id);
      showSuccess('Tipo excluído.');
      setRemoving(null);
      onChanged();
    } catch (e) {
      showError((e as Error).message);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  const footer = draft ? (
    <>
      <button type="button" disabled={busy} onClick={() => setDraft(null)} className={sllBtnGhost}>Voltar</button>
      <button type="button" disabled={busy} onClick={() => void save()} className={sllBtnPrimary}>
        {busy && <Loader2 size={15} className="animate-spin" />}Salvar tipo
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} className={sllBtnGhost}>Fechar</button>
      <button type="button" onClick={() => setDraft({ ...NEW, permissions: clonePerms(NEW.permissions) })} className={sllBtnPrimary}>
        <Plus size={16} /> Novo tipo
      </button>
    </>
  );

  return (
    <>
      <SllModal
        open
        onOpenChange={(v) => { if (!v && !busy) onClose(); }}
        title={draft ? (draft.id ? 'Editar tipo' : 'Novo tipo') : 'Tipos de usuário'}
        size="lg"
        footer={footer}
      >
        {draft ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SllField label="Nome do tipo *" className="sm:col-span-2">
                <input className={sllFieldCls} value={draft.name} onChange={(e) => setD('name', e.target.value)} placeholder="Ex.: Atendimento" />
              </SllField>
              <SllField label="Perfil base">
                <select className={sllFieldCls + ' cursor-pointer'} value={draft.role} onChange={(e) => changeRole(e.target.value as TypeRole)}>
                  {(Object.keys(BASE_LABEL) as TypeRole[]).map((r) => <option key={r} value={r}>{BASE_LABEL[r]}</option>)}
                </select>
              </SllField>
              <SllField label="O que enxerga">
                <select className={sllFieldCls + ' cursor-pointer'} value={draft.scope} onChange={(e) => setD('scope', e.target.value as TeamScope)}>
                  <option value="all">Todos os registros da loja</option>
                  <option value="own">Apenas os próprios</option>
                </select>
              </SllField>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" checked={draft.has_commission} onChange={(e) => setD('has_commission', e.target.checked)} />
              Este tipo recebe comissão (mostra o campo Comissão no cadastro)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]" checked={draft.active} onChange={(e) => setD('active', e.target.checked)} />
              Tipo ativo (aparece na hora de cadastrar usuários)
            </label>
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Permissões padrão</p>
              <PermissionMatrix value={draft.permissions} onChange={(v) => setD('permissions', v)} />
              <p className="text-[11px] text-slate-400">Valem como ponto de partida para usuários novos deste tipo e podem ser ajustadas em cada usuário. Mudar aqui não altera quem já foi cadastrado.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {types.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${t.active ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'}`}>
                    {t.name}
                    {t.is_system && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700">padrão</span>}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {ROLE_LABEL[t.role]} · {t.scope === 'all' ? 'vê tudo' : 'só o que é dele'}{t.has_commission ? ' · com comissão' : ''}
                  </p>
                </div>
                <button type="button" title="Editar" onClick={() => setDraft({ id: t.id, name: t.name, role: t.role, scope: t.scope, has_commission: t.has_commission, permissions: clonePerms(t.permissions || {}), active: t.active })} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800"><Pencil size={15} /></button>
                {!t.is_system && (
                  <button type="button" title="Excluir" onClick={() => setRemoving(t)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button>
                )}
              </li>
            ))}
            {types.length === 0 && <li className="py-8 text-center text-sm text-slate-400">Nenhum tipo cadastrado.</li>}
          </ul>
        )}
      </SllModal>

      <ConfirmDangerModal
        open={!!removing}
        title="EXCLUIR TIPO"
        itemName={removing?.name ?? ''}
        message={'Esta ação é irreversível. O tipo "' + (removing?.name ?? '') + '" será removido permanentemente. Só é possível excluir tipos sem usuários.'}
        busy={busy}
        onClose={() => { if (!busy) setRemoving(null); }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}