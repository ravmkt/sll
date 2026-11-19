import { Hourglass } from 'lucide-react';

export default function PromocoesSoon() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <Hourglass size={22} />
      </div>
      <h2 className="text-base font-bold text-slate-800">Em breve</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">Esta área do módulo Promoções está em desenvolvimento.</p>
    </div>
  );
}