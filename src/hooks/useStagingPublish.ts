import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';

const sb: any = supabase;

export type StagingStatus = 'live' | 'modified';
type Busy = 'save' | 'publish' | 'discard' | null;
export type StagingOpts<T> = {
  /** Grava a config no destino real (ex.: hub_modules) antes de marcar como publicada */
  applyLive?: (config: T) => Promise<void>;
  /** Chamado apos salvar, publicar ou descartar com sucesso */
  onSettled?: (kind: 'save' | 'publish' | 'discard') => void;
};

/**
 * scope = tipo (ex.: 'module'), key = entidade (ex.: 'vidlytics').
 * fallbackLive = config atual em producao, usada para semear o "ao vivo" na primeira gravacao.
 */
export function useStagingPublish<T extends Record<string, any> = Record<string, any>>(
  scope: string,
  key: string,
  fallbackLive?: T,
  opts: StagingOpts<T> = {},
) {
  const [serverLive, setServerLive] = useState<T | null>(null);
  const [test, setTest] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    if (!scope || !key) return;
    setLoading(true);
    const { data, error } = await sb.rpc('admin_staging_get', { p_scope: scope, p_key: key });
    if (error) {
      showError(error.message);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setServerLive(row.live_config as T);
        setTest((row.test_config as T) ?? null);
        setHasDraft(!!row.has_draft);
        setSavedAt(row.test_saved_at ?? null);
        setPublishedAt(row.published_at ?? null);
      } else {
        setServerLive(null);
        setTest(null);
        setHasDraft(false);
      }
    }
    setLoading(false);
  }, [scope, key]);

  useEffect(() => { void load(); }, [load]);

  const live: T | null = serverLive ?? fallbackLive ?? null;

  const run = async (kind: 'save' | 'discard', fn: () => Promise<{ error: any }>, ok: string) => {
    setBusy(kind);
    const { error } = await fn();
    setBusy(null);
    if (error) { showError(error.message); return false; }
    showSuccess(ok);
    await load();
    opts.onSettled?.(kind);
    return true;
  };

  const saveToTest = (config: T) =>
    run(
      'save',
      () => sb.rpc('admin_staging_save_test', { p_scope: scope, p_key: key, p_config: config, p_seed_live: fallbackLive ?? serverLive ?? {} }),
      'Aplicado na Loja Teste.',
    );

  const discard = () =>
    run('discard', () => sb.rpc('admin_staging_discard', { p_scope: scope, p_key: key }), 'Rascunho descartado.');

  const requestPublish = () => setConfirmOpen(true);
  const cancelPublish = () => setConfirmOpen(false);

  const confirmPublish = async () => {
    setBusy('publish');
    try {
      if (opts.applyLive && test) await opts.applyLive(test);
      const { error } = await sb.rpc('admin_staging_publish', { p_scope: scope, p_key: key });
      if (error) throw error;
      showSuccess('Publicado ao vivo para todas as lojas.');
      setConfirmOpen(false);
      await load();
      opts.onSettled?.('publish');
      return true;
    } catch (e: any) {
      showError(e?.message === 'SEM_RASCUNHO' ? 'Não há alterações em teste para publicar.' : e?.message || 'Falha ao publicar.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const openSandbox = async () => {
    const { data, error } = await sb.rpc('admin_staging_sandbox');
    if (error) return showError(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return showError('Nenhuma Loja Teste definida. Escolha uma na aba Módulos do Master.');
    if (!row.url) return showError(`A loja "${row.name}" não tem URL cadastrada.`);
    const url = /^https?:\/\//i.test(row.url) ? row.url : `https://${row.url}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const status: StagingStatus = hasDraft ? 'modified' : 'live';

  return {
    live, test, draft: test ?? live, status, hasDraft, savedAt, publishedAt,
    loading, busy, confirmOpen,
    load, saveToTest, discard, requestPublish, cancelPublish, confirmPublish, openSandbox,
  };
}

export type StagingApi<T extends Record<string, any> = Record<string, any>> = ReturnType<typeof useStagingPublish<T>>;