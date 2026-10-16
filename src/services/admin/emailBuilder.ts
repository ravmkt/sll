export const EMAIL_SITE = 'https://sllhub.com.br';

export type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider';
export interface EmailBlock { id: string; type: BlockType; text: string; url: string; src: string; alt: string; color: string }

export const BLOCK_LABEL: Record<BlockType, string> = {
  heading: 'Título', text: 'Texto', button: 'Botão', image: 'Imagem', divider: 'Divisor',
};

export const newBlock = (type: BlockType): EmailBlock => ({
  id: Math.random().toString(36).slice(2),
  type,
  text: type === 'button' ? 'Saiba mais' : '',
  url: '', src: '', alt: '', color: '#f59e0b',
});

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = (u: string) => (/^(https?:\/\/|mailto:)/i.test(u.trim()) ? esc(u.trim()) : '');
const safeColor = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#f59e0b');
const textOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#0f172a' : '#ffffff';
};

function blockOk(b: EmailBlock): boolean {
  if (b.type === 'divider') return true;
  if (b.type === 'image') return !!safeUrl(b.src);
  if (b.type === 'button') return b.text.trim() !== '' && !!safeUrl(b.url);
  return b.text.trim() !== '';
}

export function hasContent(blocks: EmailBlock[]): boolean {
  return blocks.some((b) => b.type !== 'divider' && blockOk(b));
}

function blockHtml(b: EmailBlock): string {
  if (!blockOk(b)) return '';
  const t = esc(b.text.trim()).replace(/\n/g, '<br>');
  if (b.type === 'heading') return `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#0f172a">${t}</h1>`;
  if (b.type === 'text') return `<p style="margin:0 0 16px">${t}</p>`;
  if (b.type === 'divider') return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">';
  if (b.type === 'button') {
    const c = safeColor(b.color);
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td align="center" bgcolor="${c}" style="border-radius:8px"><a href="${safeUrl(b.url)}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:${textOn(c)};text-decoration:none">${t}</a></td></tr></table>`;
  }
  const img = `<img src="${safeUrl(b.src)}" alt="${esc(b.alt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px">`;
  const link = safeUrl(b.url);
  return `<div style="margin:0 0 16px">${link ? `<a href="${link}" target="_blank">${img}</a>` : img}</div>`;
}

export function buildEmailHtml(blocks: EmailBlock[]): string {
  const body = blocks.map(blockHtml).join('');
  return `<div style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px"><tr><td align="center" style="padding:24px 32px;border-bottom:1px solid #e2e8f0"><img src="${EMAIL_SITE}/email-logo.png" alt="SLL Hub" height="40" style="display:inline-block;height:40px;border:0"></td></tr><tr><td style="padding:24px 32px;color:#1e293b;font-size:15px;line-height:1.6">${body}</td></tr><tr><td style="padding:0 32px 28px;color:#475569;font-size:14px;line-height:1.5">Atenciosamente,<br><strong>Equipe SLL Hub</strong><br><a href="${EMAIL_SITE}" style="color:#475569">sllhub.com.br</a></td></tr></table><p style="max-width:600px;margin:12px auto 0;text-align:center;font-size:12px;color:#64748b">%%UNSUB%%</p></div>`;
}

export function previewHtml(html: string): string {
  return html.replace('%%UNSUB%%', 'Não quer mais receber nossas novidades? <u>Cancelar inscrição</u>');
}

export function buildEmailText(blocks: EmailBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (!blockOk(b)) continue;
    if (b.type === 'heading' || b.type === 'text') parts.push(b.text.trim());
    else if (b.type === 'button') parts.push(`${b.text.trim()}: ${b.url.trim()}`);
  }
  parts.push('Atenciosamente,\nEquipe SLL Hub\n' + EMAIL_SITE);
  return parts.join('\n\n');
}