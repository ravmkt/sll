import { useEffect, useMemo, useRef, useState } from 'react';

type E = [string, string];

const CATS: Record<string, E[]> = {
  'Promo\u00e7\u00f5es': [
    ['1F525', 'fogo quente oferta'], ['1F3F7', 'etiqueta preco desconto'], ['1F4A5', 'explosao boom'], ['2728', 'brilho novo'],
    ['1F4B0', 'dinheiro saco'], ['1F389', 'festa comemoracao'], ['1F381', 'presente brinde'], ['1F4AF', 'cem 100'],
    ['1F195', 'novo new'], ['1F193', 'gratis free'], ['1F51D', 'top'], ['1F911', 'dinheiro cifrao'],
    ['1F4B8', 'dinheiro voando'], ['1F38A', 'confete'], ['26A1', 'raio rapido relampago'], ['1F4E3', 'megafone anuncio'],
    ['1F4E2', 'alto falante aviso'], ['1F514', 'sino aviso'], ['23F0', 'despertador hora'], ['231B', 'ampulheta tempo'],
    ['23F3', 'ampulheta contagem'], ['1F4C5', 'calendario data'], ['1F6A8', 'sirene alerta urgente'], ['203C', 'exclamacao'],
    ['2757', 'exclamacao atencao'], ['1F516', 'marcador'], ['1F3AF', 'alvo meta'], ['1F3C1', 'bandeira largada'],
  ],
  'Produtos': [
    ['1F6CD', 'sacolas compras'], ['1F6D2', 'carrinho compras'], ['1F457', 'vestido moda'], ['1F460', 'salto sapato'],
    ['1F45C', 'bolsa'], ['1F451', 'coroa vip'], ['1F48E', 'diamante joia'], ['1F48D', 'anel joia'],
    ['1F45F', 'tenis'], ['1F455', 'camiseta'], ['1F456', 'calca jeans'], ['1F459', 'biquini'],
    ['1F484', 'batom maquiagem beleza'], ['1F9F4', 'creme frasco cosmetico'], ['1F6CB', 'sofa casa'], ['231A', 'relogio'],
    ['1F4F1', 'celular'], ['1F4BB', 'notebook'], ['1F3A7', 'fone'], ['1F9F8', 'urso pelucia brinquedo'],
    ['1F33F', 'natural planta'], ['1F370', 'bolo doce'], ['2615', 'cafe'], ['1F37E', 'champagne'],
  ],
  'Pagamento e entrega': [
    ['1F4B3', 'cartao credito'], ['1F4B2', 'cifrao dinheiro'], ['1F9FE', 'recibo nota'], ['1F4E6', 'pacote caixa entrega'],
    ['1F69A', 'caminhao frete'], ['1F69B', 'caminhao carreta'], ['2708', 'aviao envio'], ['1F3E0', 'casa'],
    ['1F3EA', 'loja'], ['1F4CD', 'local pin endereco'], ['1F512', 'cadeado seguro fechado'], ['1F513', 'cadeado aberto'],
    ['1F6E1', 'escudo seguranca garantia'], ['2705', 'check ok verde'], ['2714', 'check'], ['274C', 'x erro'],
    ['26A0', 'atencao aviso'], ['1F501', 'repetir troca'], ['1F504', 'atualizar troca devolucao'], ['1F30E', 'mundo'],
    ['1F1E7 1F1F7', 'brasil bandeira'], ['1F4F2', 'celular seta pix'],
  ],
  'Destaques': [
    ['2B50', 'estrela'], ['1F31F', 'estrela brilhante'], ['1F3C6', 'trofeu campeao'], ['1F680', 'foguete'],
    ['2764', 'coracao vermelho amor'], ['1F49C', 'coracao roxo'], ['1F5A4', 'coracao preto black friday'], ['1F49B', 'coracao amarelo'],
    ['1F49A', 'coracao verde'], ['1F499', 'coracao azul'], ['1F9E1', 'coracao laranja'], ['1F90D', 'coracao branco'],
    ['1F496', 'coracao brilhante'], ['1F49D', 'coracao presente'], ['1F48C', 'carta amor'], ['1F534', 'bolinha vermelha'],
    ['1F7E1', 'bolinha amarela'], ['1F7E2', 'bolinha verde'], ['27A1', 'seta direita'], ['2B07', 'seta baixo'],
    ['25B6', 'play'], ['2795', 'mais'],
    ['1F538', 'losango laranja'], ['1F539', 'losango azul'], ['1F947', 'medalha ouro primeiro'], ['1F948', 'medalha prata'],
    ['1F949', 'medalha bronze'], ['1F308', 'arco iris'], ['2600', 'sol verao'], ['2744', 'neve inverno'],
    ['1F384', 'natal arvore'], ['1F385', 'papai noel natal'], ['1F383', 'abobora halloween'], ['1F490', 'buque flores dia das maes'],
  ],
  'Rostos e gestos': [
    ['1F60D', 'apaixonado amei'], ['1F60E', 'oculos legal'], ['1F929', 'uau estrelas'], ['1F973', 'festa'],
    ['1F60A', 'feliz sorriso'], ['1F609', 'piscada'], ['1F604', 'alegre'], ['1F917', 'abraco'],
    ['1F970', 'amor'], ['1F631', 'chocado'], ['1F92F', 'mente explodindo'], ['1F64C', 'maos para cima'],
    ['1F44F', 'palmas'], ['1F44D', 'joia positivo'], ['1F44C', 'ok perfeito'], ['1F64F', 'obrigado por favor'],
    ['1F4AA', 'forca'], ['1F91D', 'acordo parceria'], ['270C', 'paz vitoria'], ['1F440', 'olhos olha'],
    ['1F91E', 'dedos cruzados sorte'], ['1F448', 'dedo esquerda mao apontando'], ['1F449', 'dedo direita mao apontando'],
    ['1F446', 'dedo cima mao apontando'], ['1F447', 'dedo baixo mao apontando'], ['261D', 'dedo indicador cima'],
  ],
  'Contato': [
    ['1F4AC', 'conversa chat mensagem'], ['1F4DE', 'telefone'], ['1F4E7', 'email'], ['2709', 'envelope'],
    ['1F4F8', 'foto camera'], ['1F3A5', 'video'], ['1F517', 'link'], ['1F4DD', 'anotacao'],
    ['1F4A1', 'ideia dica'], ['1F50D', 'buscar lupa'], ['2139', 'informacao'], ['2753', 'pergunta'],
    ['1F552', 'relogio hora'], ['1F4CC', 'fixar alfinete'],
  ],
};

const VS = new Set([0x1F3F7, 0x1F6CD, 0x1F6E1, 0x1F6CB]);
const toEmoji = (codes: string) => {
  const cps = codes.split(' ').map((h) => parseInt(h, 16));
  const s = String.fromCodePoint(...cps);
  return cps.length === 1 && (cps[0] < 0x10000 || VS.has(cps[0])) ? s + '\uFE0F' : s;
};
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const a = document.createElement('textarea');
      a.value = t;
      a.style.position = 'fixed';
      a.style.opacity = '0';
      document.body.appendChild(a);
      a.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(a);
      return ok;
    } catch {
      return false;
    }
  }
}

const KEY = 'sll-emoji-recent';
const RECENT = 'Recentes';

export default function EmojiPicker() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('Promo\u00e7\u00f5es');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const list = useMemo(() => {
    const term = norm(q.trim());
    if (term) {
      const out: string[] = [];
      for (const [name, items] of Object.entries(CATS)) {
        for (const [c, kw] of items) {
          if (norm(kw + ' ' + name).includes(term)) out.push(toEmoji(c));
        }
      }
      return out;
    }
    if (cat === RECENT) return recent;
    return (CATS[cat] || []).map(([c]) => toEmoji(c));
  }, [q, cat, recent]);

  const pick = async (e: string) => {
    const ok = await copyText(e);
    setMsg(ok ? e + ' copiado! Cole com Ctrl+V' : 'N\u00e3o foi poss\u00edvel copiar');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 2000);
    if (ok) {
      const next = [e, ...recent.filter((x) => x !== e)].slice(0, 16);
      setRecent(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  const tabs = recent.length ? [RECENT, ...Object.keys(CATS)] : Object.keys(CATS);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:text-[#0094eb]"
      >
        {'\u{1F600} Emojis'}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={'Buscar (ex.: fogo, frete, cora\u00e7\u00e3o)'}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#0094eb]"
          />
          {!q && (
            <div className="mb-2 flex flex-wrap gap-1">
              {tabs.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={'rounded px-2 py-0.5 text-[11px] font-semibold ' + (cat === c ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
            {list.map((e, i) => (
              <button key={e + i} type="button" onClick={() => pick(e)} className="rounded p-1 text-xl hover:bg-slate-100">
                {e}
              </button>
            ))}
            {list.length === 0 && <p className="col-span-8 py-4 text-center text-xs text-slate-400">Nenhum emoji encontrado.</p>}
          </div>
          <p className="mt-2 min-h-[16px] text-center text-xs font-semibold text-emerald-600">
            {msg || 'Clique no emoji para copiar e cole no campo.'}
          </p>
        </div>
      )}
    </div>
  );
}