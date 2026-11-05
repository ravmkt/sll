import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Card, ErrorBox, SectionTitle, Skeleton } from '@/components/radar/RadarUI';
import { useActiveStore } from '@/hooks/radar/useRadarStore';
import { useAsync } from '@/hooks/radar/useAsync';
import { getSettings, saveSettings } from '@/services/radar/settings';
import { addKeyword, listKeywords, removeKeyword } from '@/services/radar/keywords';

const categories = ['Moda & Acessórios', 'Eletrônicos', 'Beleza & Cosméticos', 'Saúde', 'Casa & Decoração', 'Alimentos & Bebidas', 'Outros'];
const BRASIL = 'Brasil todo';

function Chips({ items, onRemove }: { items: string[]; onRemove: (i: number) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((it, i) => (
        <span key={`${it}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs">
          {it}<button type="button" onClick={() => onRemove(i)} aria-label="Remover"><X className="h-3 w-3" /></button>
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const store = useActiveStore();
  const settings = useAsync(() => getSettings(store.id), [store.id]);
  const kws = useAsync(() => listKeywords(store.id), [store.id]);
  const [category, setCategory] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [comp, setComp] = useState('');
  const [term, setTerm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    setCategory(settings.data.category ?? '');
    setRegions(settings.data.regions);
    setCompetitors(settings.data.competitors);
  }, [settings.data]);

  const run = async (fn: () => Promise<void>, okText?: string) => {
    try { await fn(); setMsg(okText ? { ok: true, text: okText } : null); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao salvar' }); }
  };

  const save = () => run(() => saveSettings({ store_id: store.id, category: category || null, regions, competitors, onboarding_done: true }), 'Configurações salvas.');
  const addRegion = (v: string) => { const t = v.trim(); if (t && !regions.includes(t)) setRegions([...regions, t]); setRegion(''); };
  const addComp = () => { const t = comp.trim(); if (t && competitors.length < 5 && !competitors.includes(t)) setCompetitors([...competitors, t]); setComp(''); };
  const addTerm = () => {
    const t = term.trim();
    if (!t) return;
    void run(async () => { await addKeyword(store.id, t, regions[0] ?? null); setTerm(''); kws.reload(); });
  };

  const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';
  const label = 'mb-1 block text-xs font-medium uppercase text-slate-400';

  return (
    <>
      <SectionTitle>Configurações</SectionTitle>
      {settings.error && <ErrorBox message={settings.error} />}
      {settings.loading ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <div className="text-sm font-bold">Dados da sua loja</div>
            <p className="text-xs text-slate-400">Já temos estas informações do SLL Hub. Não é preciso digitar.</p>
            <dl className="space-y-2 text-sm">
              <div><dt className={label}>Loja</dt><dd>{store.name}</dd></div>
              <div><dt className={label}>URL</dt><dd>{store.url ?? '—'}</dd></div>
              <div><dt className={label}>Cidade</dt><dd>{store.city ?? '—'}</dd></div>
              <div><dt className={label}>WhatsApp</dt><dd>{store.whatsapp ?? '—'}</dd></div>
            </dl>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="text-sm font-bold">Confirme seu negócio</div>
            <div>
              <label className={label}>Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                <option value="">Selecione</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Regiões de atuação</label>
              <div className="flex gap-2">
                <input value={region} onChange={(e) => setRegion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRegion(region); }} placeholder="Cidade ou estado" className={input} />
                <button type="button" onClick={() => addRegion(region)} className="rounded-lg bg-slate-900 px-3 text-sm text-white">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {store.city && <button type="button" onClick={() => addRegion(store.city as string)} className="text-blue-600">+ {store.city}</button>}
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={regions.includes(BRASIL)} onChange={(e) => setRegions(e.target.checked ? [...regions, BRASIL] : regions.filter((r) => r !== BRASIL))} /> {BRASIL}
                </label>
              </div>
              <Chips items={regions} onRemove={(i) => setRegions(regions.filter((_, x) => x !== i))} />
            </div>
            <div>
              <label className={label}>Concorrentes (opcional, até 5)</label>
              <div className="flex gap-2">
                <input value={comp} onChange={(e) => setComp(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addComp(); }} placeholder="concorrente.com.br" className={input} />
                <button type="button" onClick={addComp} disabled={competitors.length >= 5} className="rounded-lg bg-slate-900 px-3 text-sm text-white disabled:opacity-40">Add</button>
              </div>
              <Chips items={competitors} onRemove={(i) => setCompetitors(competitors.filter((_, x) => x !== i))} />
            </div>
            <button type="button" onClick={save} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700">Salvar configurações</button>
            {msg && <div className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</div>}
          </Card>

          <Card className="space-y-3 p-5 lg:col-span-2">
            <div className="text-sm font-bold">Termos principais</div>
            <div className="flex gap-2">
              <input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTerm(); }} placeholder="Ex.: jaleco feminino com renda" className={input} />
              <button type="button" onClick={addTerm} className="rounded-lg bg-slate-900 px-4 text-sm text-white">Adicionar</button>
            </div>
            {kws.error && <ErrorBox message={kws.error} />}
            {kws.data && kws.data.length === 0 && <p className="text-xs text-slate-400">Nenhum termo cadastrado. A sugestão por IA virá em um próximo passo.</p>}
            <div className="flex flex-wrap gap-2">
              {kws.data?.map((k) => (
                <span key={k.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  {k.term}{k.region ? ` · ${k.region}` : ''}
                  <button type="button" aria-label="Remover" onClick={() => void run(async () => { await removeKeyword(store.id, k.id); kws.reload(); })}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}