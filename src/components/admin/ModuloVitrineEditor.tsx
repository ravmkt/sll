import type { RefObject } from 'react';
import { ArrowRight, Check, ImagePlus, Loader2, Package, Trash2 } from 'lucide-react';
import { CARD, INPUT, STATUS_LABEL } from '@/components/admin/moduleUi';

const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

type Props = {
  slug: string;
  name: string; setName: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  pub: boolean; setPub: (v: boolean) => void;
  sort: string; setSort: (v: string) => void;
  logo: string | null; setLogo: (v: string | null) => void;
  description: string; setDescription: (v: string) => void;
  featuresText: string; setFeaturesText: (v: string) => void;
  fileRef: RefObject<HTMLInputElement>;
  onFile: (f: File | undefined) => void;
  uploading: boolean; saving: boolean; onSave: () => void;
};

export function parseFeatures(text: string): string[] {
  return text.split('\n').map((x) => x.trim()).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 6);
}

function Preview({ name, status, logo, description, features }: { name: string; status: string; logo: string | null; description: string; features: string[] }) {
  if (status === 'hidden') {
    return <p className="rounded-xl bg-slate-200 px-4 py-6 text-center text-xs font-semibold text-slate-600">Módulo oculto: não aparece para o lojista.</p>;
  }
  const soon = status === 'coming_soon';
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {logo ? (
          <img src={logo} alt={name} className="h-20 w-auto max-w-[65%] object-contain object-left" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0094eb]/15 to-[#0094eb]/5 ring-1 ring-[#0094eb]/15">
              <Package className="h-9 w-9 text-[#0094eb]" />
            </div>
            <h3 className="text-lg font-black text-slate-900">{name || 'Nome do módulo'}</h3>
          </div>
        )}
        {soon ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Em breve</span>
        ) : (
          <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0094eb]">Disponível</span>
        )}
      </div>
      {description.trim()
        ? <p className="text-sm font-medium leading-relaxed text-slate-700">{description}</p>
        : <p className="text-sm italic text-slate-400">A descrição aparece aqui.</p>}
      {features.length > 0 ? (
        <ul className="space-y-2">
          {features.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm font-medium text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0094eb]" /> {b}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-slate-400">Os benefícios aparecem aqui.</p>
      )}
      <div className="pt-1">
        {soon ? (
          <div className="flex w-full items-center justify-center rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white">Entrar na lista de espera</div>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white">Ativar módulo <ArrowRight className="h-3.5 w-3.5" /></div>
        )}
      </div>
    </div>
  );
}

export default function ModuloVitrineEditor(p: Props) {
  const feats = parseFeatures(p.featuresText);
  const rawCount = p.featuresText.split('\n').map((x) => x.trim()).filter(Boolean).length;
  return (
    <div className={`${CARD} space-y-5`}>
      <div>
        <p className="text-sm font-bold text-white">Dados do módulo e vitrine</p>
        <p className="text-[11px] text-slate-500">O que você digita aparece no preview ao lado, no mesmo formato do Dashboard do lojista.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-300">Cadastro</p>
          <div className="space-y-2">
            <span className={LABEL}>Logo</span>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                {p.logo ? <img src={p.logo} alt={p.name} className="h-full w-full object-contain" /> : <Package size={20} className="text-slate-600" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <input ref={p.fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => p.onFile(e.target.files?.[0])} />
                <button type="button" disabled={p.uploading} onClick={() => p.fileRef.current?.click()} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40">
                  {p.uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />} Enviar imagem
                </button>
                {p.logo && (
                  <button type="button" onClick={() => p.setLogo(null)} className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-300">
                    <Trash2 size={12} /> Remover logo
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-600">PNG, JPG, SVG ou WebP, até 2 MB. Fundo transparente fica melhor.</p>
          </div>
          <label className="block space-y-1">
            <span className={LABEL}>Nome</span>
            <input value={p.name} onChange={(e) => p.setName(e.target.value)} className={INPUT} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={LABEL}>Status</span>
              <select value={p.status} onChange={(e) => p.setStatus(e.target.value)} className={INPUT}>
                <option value="active">{STATUS_LABEL.active}</option>
                <option value="coming_soon">{STATUS_LABEL.coming_soon}</option>
                <option value="hidden">{STATUS_LABEL.hidden}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Posição</span>
              <input type="number" min={1} value={p.sort} onChange={(e) => p.setSort(e.target.value)} className={INPUT} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={p.status === 'active' && p.pub} disabled={p.status !== 'active'} onChange={(e) => p.setPub(e.target.checked)} />
            À venda para os lojistas {p.status !== 'active' && <span className="text-slate-500">(só módulos ativos)</span>}
          </label>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-300">Texto do card</p>
          <label className="block space-y-1">
            <span className={LABEL}>Descrição</span>
            <textarea value={p.description} maxLength={160} rows={3} onChange={(e) => p.setDescription(e.target.value)} className={INPUT} placeholder="Ex.: Transmissões ao vivo direto no seu e-commerce." />
            <span className="block text-[10px] text-slate-600">{p.description.length}/160 caracteres.</span>
          </label>
          <label className="block space-y-1">
            <span className={LABEL}>Benefícios (um por linha)</span>
            <textarea value={p.featuresText} rows={8} onChange={(e) => p.setFeaturesText(e.target.value)} className={INPUT} placeholder={'Lives com produtos vinculados\nChat em tempo real\nTudo na página da sua loja'} />
            <span className={`block text-[10px] ${rawCount > 6 ? 'text-amber-400' : 'text-slate-600'}`}>
              {feats.length}/6 benefícios{rawCount > feats.length ? ' (repetidos e excedentes são ignorados ao salvar)' : ''}. Aparecem com ✓ nos módulos que o lojista ainda não tem.
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-300">Preview no Dashboard do lojista</p>
          <div className="rounded-xl bg-slate-100 p-4">
            <Preview name={p.name} status={p.status} logo={p.logo} description={p.description} features={feats} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={p.saving || p.uploading || !p.name.trim()} onClick={p.onSave} className="cursor-pointer rounded-lg bg-[#fd8539] px-6 py-2 text-xs font-bold text-white disabled:opacity-40">
          {p.saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}