import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import RulerPreview from '../../components/widgets/RulerPreview';
import RulerStyleEditorModal, { type EditorInitial } from '../../components/widgets/RulerStyleEditorModal';
import { widgetsService, type StyleInput } from '../../services/widgetsService';
import { infoCardsService } from '../../services/infoCardsService';
import { PRESETS, SAMPLE_CONTENT, buildConfig, mergeConfig, type RulerContent, type WidgetStyle, type WidgetsCtx } from '../../types/widgets';

export default function WidgetsAppearancePage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => widgetsService(ctx.supabase), [ctx.supabase]);
  const [styles, setStyles] = useState<WidgetStyle[]>([]);
  const [content, setContent] = useState<RulerContent>(SAMPLE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditorInitial | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, cs] = await Promise.all([svc.listStyles(ctx.storeId), infoCardsService(ctx.supabase).list(ctx.storeId)]);
      const r = cs.find((c) => c.tiers?.length);
      setStyles(s);
      if (r) setContent({ title: r.title, tiers: r.tiers, footer: r.footer });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally { setLoading(false); }
  }, [svc, ctx.storeId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(s: StyleInput) {
    await svc.saveStyle(ctx.storeId, s);
    setEditing(null);
    await load();
  }
  async function handleDelete(st: WidgetStyle) {
    if (!window.confirm(`Excluir o estilo "${st.name}"?`)) return;
    try { await svc.deleteStyle(ctx.storeId, st.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  }
  async function handleDefault(st: WidgetStyle) {
    try { await svc.setDefault(ctx.storeId, st.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Aparência</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Gerencie os estilos visuais dos seus widgets.</p>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Seus Estilos</h2>
          <p className="text-xs text-slate-500">Estilos criados e salvos por você.</p>
        </div>
        <button type="button"
          onClick={() => setEditing({ name: '', primary_color: '#0094EB', config: buildConfig('#0094EB'), is_default: false })}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-5 py-2.5 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> Criar Novo Estilo
        </button>
      </div>

      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_120px] bg-white px-6 py-3 text-[11px] font-bold uppercase text-slate-500">
          <span>Estilo</span><span>Cor principal</span><span className="text-center">Status</span><span className="text-right">Ações</span>
        </div>
        {loading && <div className="px-6 py-6 text-sm text-slate-400">Carregando...</div>}
        {!loading && styles.length === 0 && (
          <div className="px-6 py-6 text-sm text-slate-400">Nenhum estilo criado. Use um template abaixo ou clique em "Criar Novo Estilo".</div>
        )}
        {styles.map((st) => (
          <div key={st.id} className="grid grid-cols-[2fr_1.5fr_1.5fr_120px] items-center border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
            <span className="text-sm font-bold text-slate-900">{st.name}</span>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <i className="inline-block h-3 w-3 rounded-full" style={{ background: st.primary_color }} />{st.primary_color}
            </span>
            <span className="text-center">
              {st.is_default
                ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Padrão</span>
                : <button type="button" onClick={() => handleDefault(st)} className="text-xs font-semibold text-slate-400 hover:text-[color:var(--sll-b-brand)]">Definir Padrão</button>}
            </span>
            <span className="flex justify-end gap-3 text-slate-400">
              <button type="button" title="Editar"
                onClick={() => setEditing({ id: st.id, name: st.name, primary_color: st.primary_color, config: mergeConfig(st.config), is_default: st.is_default })}
                className="hover:text-[color:var(--sll-b-brand)]"><Pencil className="h-4 w-4" /></button>
              <button type="button" title="Excluir" onClick={() => handleDelete(st)} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-extrabold text-slate-900">Templates</h2>
      <p className="mb-3 mt-3 text-sm font-semibold text-slate-600">Card informativo</p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRESETS.map((p) => (
          <div key={p.name} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <RulerPreview a={p.config.desktop} content={SAMPLE_CONTENT} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">{p.name}</span>
              <button type="button"
                onClick={() => setEditing({ name: '', template: p.name, primary_color: p.color, config: p.config, is_default: false })}
                className="rounded-lg border border-[color:var(--sll-b-brand-border)] bg-[color:var(--sll-b-brand-soft)] px-3 py-1.5 text-xs font-bold text-[color:var(--sll-b-brand)]">
                Usar template
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <RulerStyleEditorModal initial={editing} content={content} existingNames={styles.map((s) => s.name)} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </div>
  );
}
