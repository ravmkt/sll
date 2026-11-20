import { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showError, showSuccess } from '@/utils/toast';
import { callMemberFn } from '../services/equipe';

type Access = { active?: boolean; must_change_password?: boolean } | null;

export default function ForcePasswordChange() {
  const { storeId } = useLoja();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const [needed, setNeeded] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    supabase.rpc('gestor_my_access', { p_store: storeId }).then(({ data, error }) => {
      if (!alive || error) return;
      const a = data as Access;
      setNeeded(!!a && a.active !== false && a.must_change_password === true);
    });
    return () => { alive = false; };
  }, [storeId]);

  async function submit() {
    if (pwd.length < 8) { showError('A senha deve ter ao menos 8 caracteres.'); return; }
    if (pwd !== pwd2) { showError('As senhas não conferem.'); return; }
    setSaving(true);
    try {
      await callMemberFn('change_own_password', { new_password: pwd });
      showSuccess('Senha alterada com sucesso.');
      setPwd('');
      setPwd2('');
      setNeeded(false);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={needed} onOpenChange={() => { /* não pode fechar */ }}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md bg-white text-slate-900 [&>button]:hidden [&_input]:bg-white [&_input]:text-slate-900 [&_label]:text-slate-700"
      >
        <DialogHeader>
          <DialogTitle>Crie sua nova senha</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Você entrou com uma senha provisória. Por segurança, defina agora uma senha pessoal para continuar.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nova senha</label>
            <Input type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirmar nova senha</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            />
          </div>
          <p className="text-xs text-slate-400">Mínimo de 8 caracteres.</p>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => void signOut()} disabled={saving}>
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Salvar senha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}