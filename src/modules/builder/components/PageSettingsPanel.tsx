import { useState } from 'react';
import { useBuilder } from '../store';
import FieldInput from './FieldInput';
import { fieldValue } from '../styleKit';
import { bgFields } from '../bg';
import type { Field } from '../registry-extra';

const G_BG = 'Fundo da p\u00e1gina';
const G_SIZE = 'Tamanho';
const G_SEO = 'SEO';

const FIELDS: Field[] = [
  ...bgFields(G_BG),
  { key: 'maxW', label: 'Largura m\u00e1xima do conte\u00fado (px, vazio = total)', type: 'number', min: 320, max: 1920, group: G_SIZE },
  { key: 'minH', label: 'Altura m\u00ednima da p\u00e1gina (px)', type: 'number', min: 0, max: 5000, group: G_SIZE },
  { key: 'seoTitle', label: 'T\u00edtulo SEO (ideal at\u00e9 60 caracteres)', group: G_SEO },
  { key: 'seoDesc', label: 'Meta description (ideal at\u00e9 160 caracteres)', multiline: true, group: G_SEO },
  { key: 'ogImage', label: 'Imagem de compartilhamento (1200x630)', type: 'upload', accept: 'image', group: G_SEO },
  { key: 'favicon', label: 'Favicon', type: 'upload', accept: 'image', group: G_SEO },
  { key: 'canonical', label: 'URL can\u00f4nica (opcional)', group: G_SEO },
  {
    key: 'noindex', label: 'Aparecer no Google', type: 'select', group: G_SEO, def: '0',
    options: [{ value: '0', label: 'Sim, indexar' }, { value: '1', label: 'N\u00e3o indexar' }],
  },
];

export default function PageSettingsPanel() {
  const settings = useBuilder((s) => s.settings);
  const setSetting = useBuilder((s) => s.setSetting);
  const [open, setOpen] = useState<string | null>(G_BG);

  const groups = new Map<string, Field[]>();
  for (const f of FIELDS) {
    const g = f.group ?? 'Geral';
    groups.set(g, [...(groups.get(g) ?? []), f]);
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">{'Configura\u00e7\u00f5es da p\u00e1gina'}</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">{'Selecione um bloco para edit\u00e1-lo ou ajuste a p\u00e1gina abaixo.'}</p>
      </div>
      {[...groups.entries()].map(([title, list]) => {
        const isOpen = open === title;
        return (
          <div key={title} className="rounded-lg border border-slate-200 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : title)}
              className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              <span className="text-[10px]">{isOpen ? '\u25BC' : '\u25B6'}</span>
              {title}
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-slate-200 p-3">
                {list.filter((f) => !f.showIf || f.showIf(settings)).map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">{f.label}</span>
                    <FieldInput f={f} value={fieldValue(f, settings)} onChange={(v) => setSetting(f.key, v)} props={settings} />
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}