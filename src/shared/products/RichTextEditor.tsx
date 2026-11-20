import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, IndentDecrease, IndentIncrease,
  Italic, List, ListOrdered, Maximize2, Minimize2, Omega, Redo2, Table as TableIcon, Underline, Undo2,
} from 'lucide-react';

const BLOCKED_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'base'];
const SPECIAL_CHARS = ['©', '®', '™', '°', '±', '×', '÷', '½', '¼', '¾', '€', '£', '¥', '•', '–', '—', '“', '”', '‘', '’', '…', '²', '³'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  BLOCKED_TAGS.forEach((tag) => doc.querySelectorAll(tag).forEach((el) => el.remove()));
  doc.body.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((a) => {
      const name = a.name.toLowerCase();
      const val = a.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(a.name);
      else if ((name === 'href' || name === 'src') && val.startsWith('javascript:')) el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}

export function htmlTextLength(html: string): number {
  if (!html) return 0;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\u00a0/g, ' ').trim().length;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
  minHeight?: number;
  placeholder?: string;
}

const btn =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-600 ' +
  'hover:bg-slate-100 hover:text-[#0094eb] disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

export default function RichTextEditor({ value, onChange, maxLength = 5000, minHeight = 160, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValid = useRef(value ?? '');
  const [source, setSource] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showChars, setShowChars] = useState(false);
  const [count, setCount] = useState(() => htmlTextLength(value ?? ''));

  useEffect(() => {
    if (source || !ref.current) return;
    if (ref.current.innerHTML !== (value ?? '')) ref.current.innerHTML = value ?? '';
    lastValid.current = value ?? '';
    setCount(htmlTextLength(value ?? ''));
  }, [value, source]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML === '<br>' ? '' : el.innerHTML;
    const len = htmlTextLength(html);
    if (len > maxLength) {
      el.innerHTML = lastValid.current;
      setCount(htmlTextLength(lastValid.current));
      return;
    }
    lastValid.current = html;
    setCount(len);
    onChange(html);
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const insertTable = () => {
    const cell = 'border:1px solid #cbd5e1;padding:6px;';
    const row = `<tr><td style="${cell}">&nbsp;</td><td style="${cell}">&nbsp;</td><td style="${cell}">&nbsp;</td></tr>`;
    exec('insertHTML', `<table style="border-collapse:collapse;width:100%;"><tbody>${row}${row}</tbody></table><p><br></p>`);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (!html) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, sanitizeHtml(html));
    emit();
  };

  const toggleSource = () => {
    if (!source) {
      setSourceText(ref.current?.innerHTML === '<br>' ? '' : ref.current?.innerHTML ?? '');
      setSource(true);
      return;
    }
    const clean = sanitizeHtml(sourceText);
    if (htmlTextLength(clean) > maxLength) return;
    lastValid.current = clean;
    setCount(htmlTextLength(clean));
    onChange(clean);
    setSource(false);
  };

  const tools: { key: string; title: string; icon: JSX.Element; run: () => void }[] = [
    { key: 'b', title: 'Negrito', icon: <Bold size={15} />, run: () => exec('bold') },
    { key: 'i', title: 'Itálico', icon: <Italic size={15} />, run: () => exec('italic') },
    { key: 'u', title: 'Sublinhado', icon: <Underline size={15} />, run: () => exec('underline') },
    { key: 'l', title: 'Alinhar à esquerda', icon: <AlignLeft size={15} />, run: () => exec('justifyLeft') },
    { key: 'c', title: 'Centralizar', icon: <AlignCenter size={15} />, run: () => exec('justifyCenter') },
    { key: 'r', title: 'Alinhar à direita', icon: <AlignRight size={15} />, run: () => exec('justifyRight') },
    { key: 'j', title: 'Justificar', icon: <AlignJustify size={15} />, run: () => exec('justifyFull') },
    { key: 'ul', title: 'Lista com marcadores', icon: <List size={15} />, run: () => exec('insertUnorderedList') },
    { key: 'ol', title: 'Lista numerada', icon: <ListOrdered size={15} />, run: () => exec('insertOrderedList') },
    { key: 'out', title: 'Diminuir recuo', icon: <IndentDecrease size={15} />, run: () => exec('outdent') },
    { key: 'in', title: 'Aumentar recuo', icon: <IndentIncrease size={15} />, run: () => exec('indent') },
    { key: 'un', title: 'Desfazer', icon: <Undo2 size={15} />, run: () => exec('undo') },
    { key: 're', title: 'Refazer', icon: <Redo2 size={15} />, run: () => exec('redo') },
    { key: 't', title: 'Inserir tabela', icon: <TableIcon size={15} />, run: insertTable },
  ];

  const over = count >= maxLength;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900">
        {tools.map((t) => (
          <button key={t.key} type="button" title={t.title} className={btn} disabled={source}
            onMouseDown={(e) => e.preventDefault()} onClick={t.run}>
            {t.icon}
          </button>
        ))}
        <div className="relative">
          <button type="button" title="Caracteres especiais" className={btn} disabled={source}
            onMouseDown={(e) => e.preventDefault()} onClick={() => setShowChars((v) => !v)}>
            <Omega size={15} />
          </button>
          {showChars && !source && (
            <div className="absolute left-0 top-9 z-20 grid w-48 grid-cols-6 gap-1 rounded-lg border bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-[#1a1f2c]">
              {SPECIAL_CHARS.map((c) => (
                <button key={c} type="button"
                  className="h-7 cursor-pointer rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec('insertText', c); setShowChars(false); }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex gap-1">
          <button type="button" title={source ? 'Voltar ao editor visual' : 'Editar HTML'}
            className={btn + (source ? ' border-[#0094eb] text-[#0094eb]' : '')} onClick={toggleSource}>
            <Code2 size={15} />
          </button>
          <button type="button" title={expanded ? 'Reduzir' : 'Expandir'} className={btn} onClick={() => setExpanded((v) => !v)}>
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div style={{ height: expanded ? '55vh' : undefined, minHeight }}>
        {source ? (
          <textarea
            className="h-full w-full resize-none bg-transparent p-3 font-mono text-xs outline-none"
            style={{ minHeight }}
            spellCheck={false}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
        ) : (
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder ?? 'Escreva a descrição do produto'}
            className="prose prose-sm h-full max-w-none overflow-y-auto p-3 text-sm outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_table]:w-full [&_td]:border [&_td]:p-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            style={{ minHeight }}
            onInput={emit}
            onBlur={emit}
            onPaste={onPaste}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-1.5 text-[11px] dark:border-slate-700">
        <span className="text-muted-foreground">
          {source ? 'Modo HTML: clique em &lt;/&gt; para aplicar. Scripts e eventos são removidos.' : 'Cole do Word ou de outro site: o HTML é limpo automaticamente.'}
        </span>
        <span className={over ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
          {count.toLocaleString('pt-BR')} / {maxLength.toLocaleString('pt-BR')} caracteres
        </span>
      </div>
    </div>
  );
}