import fs from 'node:fs';

const p = 'src/modules/pulse/components/widgets/CarouselModal.tsx';
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const orig = s;

function once(a) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error('Ancora encontrada ' + n + 'x: ' + a.slice(0, 70)); process.exit(1); }
}

const helper = String.raw`const MAX_SRC = 15 * 1024 * 1024;
const MAX_W = 1200;
const WEBP_QUALITY = 0.82;

async function toWebp(file: File): Promise<{ body: Blob; type: string; ext: string }> {
  const orig = { body: file as Blob, type: file.type, ext: (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg' };
  if (file.type === 'image/gif') return orig;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_W / bmp.width);
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    if (!g) { bmp.close(); return orig; }
    g.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/webp', WEBP_QUALITY));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return orig;
    return { body: blob, type: 'image/webp', ext: 'webp' };
  } catch {
    return orig;
  }
}

`;

const upFn = String.raw`async function up(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Envie apenas imagens.');
    if (file.size > MAX_SRC) throw new Error('"' + file.name + '" tem mais de 15 MB.');
    const img = await toWebp(file);
    if (img.body.size > MAX_BYTES) throw new Error('"' + file.name + '" continua com mais de 3 MB após a compressão.');
    const path = ctx.storeId + '/' + crypto.randomUUID() + '.' + img.ext;
    const { error } = await ctx.supabase.storage.from(BUCKET).upload(path, img.body, { contentType: img.type, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    return ctx.supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }`;

const propsAnchor = 'interface Props { ctx: WidgetsCtx;';
once(propsAnchor);
s = s.replace(propsAnchor, () => helper + propsAnchor);

const start = 'async function up(file: File): Promise<string> {';
const endMark = 'return ctx.supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;\n  }';
once(start); once(endMark);
const i = s.indexOf(start);
const j = s.indexOf(endMark) + endMark.length;
if (j <= i) { console.error('Ordem invalida das ancoras'); process.exit(1); }
s = s.slice(0, i) + upFn + s.slice(j);

const hint = 'imagens de até 3 MB. Você pode selecionar várias de uma vez.';
once(hint);
s = s.replace(hint, () => 'imagens de até 15 MB. Elas são convertidas automaticamente para WebP.');

fs.writeFileSync(p + '.bak', orig);
fs.writeFileSync(p, s);
console.log('OK: ' + p);
