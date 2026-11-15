import fs from 'node:fs';
const P = 'src/modules/pulse/components/widgets/ReviewWidgetModal.tsx';
let s = fs.readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
if (s.includes('pickUrl')) { console.log('Ja aplicado.'); process.exit(0); }
function edit(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('ancora encontrada ' + n + 'x: ' + a); process.exit(1); }
  s = s.replace(a, () => b);
}
edit("  const [error, setError] = useState('');",
     "  const [error, setError] = useState('');\n  const [pickUrl, setPickUrl] = useState('');");
edit(`              <WidgetPlacementPicker supabase={ctx.supabase} storeId={ctx.storeId} storeUrl={ctx.storeUrl}
                value={placement} onChange={setPlacement} />`,
`              {scope === 'product' && (
                <label className="mb-3 block">
                  <span className={lbl}>URL de um produto da loja (para escolher o elemento)</span>
                  <input className={inp} value={pickUrl} placeholder="https://sualoja.com.br/produto-x/p"
                    onChange={(e) => setPickUrl(e.target.value)} />
                </label>
              )}
              <WidgetPlacementPicker key={pickUrl.trim()} supabase={ctx.supabase} storeId={ctx.storeId}
                storeUrl={/^https?:\\/\\//.test(pickUrl.trim()) ? pickUrl.trim() : ctx.storeUrl}
                value={placement} onChange={setPlacement} />
              <label className="mt-3 block">
                <span className={lbl}>Seletor CSS (manual, opcional)</span>
                <input className={inp + ' font-mono'} value={placement.selector} placeholder="#product-description"
                  onChange={(e) => setPlacement({ ...placement, selector: e.target.value })} />
              </label>`);
fs.writeFileSync(P + '.bak', fs.readFileSync(P));
fs.writeFileSync(P, s);
console.log('OK: ' + P);
