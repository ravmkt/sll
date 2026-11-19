import { Clock } from 'lucide-react';
import { SECOES } from '../config/secoes';

export default function GestorSecaoPage({ slug }: { slug: string }) {
  const s = SECOES[slug];
  if (!s) return <p className="p-6 text-sm text-slate-500">Seção não encontrada.</p>;
  const Icon = s.icon;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
          <Icon size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{s.title}</h1>
          <p className="text-sm text-slate-500">{s.description}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Clock size={13} /> Em construção
        </div>
        <p className="mb-3 text-sm font-semibold text-slate-700">O que vai aparecer aqui</p>
        <ul className="space-y-2">
          {s.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0094eb]" />
              {f}
            </li>
          ))}
        </ul>
        {s.note && <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{s.note}</p>}
      </div>
    </div>
  );
}
