type S = Record<string, string>;

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const url = (u = '') => (/^https?:\/\//i.test(u.trim()) ? esc(u.trim()) : '');

export function seoHead(s: S, pageTitle: string): string {
  const title = esc((s.seoTitle || pageTitle || '').trim());
  const desc = esc((s.seoDesc || '').trim());
  const img = url(s.ogImage);
  const fav = url(s.favicon);
  const can = url(s.canonical);
  let h = '<title>' + title + '</title>';
  if (desc) h += '<meta name="description" content="' + desc + '">';
  if (s.noindex === '1') h += '<meta name="robots" content="noindex,nofollow">';
  if (can) h += '<link rel="canonical" href="' + can + '">';
  if (fav) h += '<link rel="icon" href="' + fav + '">';
  h += '<meta property="og:type" content="website"><meta property="og:title" content="' + title + '">';
  if (desc) h += '<meta property="og:description" content="' + desc + '">';
  if (img) h += '<meta property="og:image" content="' + img + '"><meta name="twitter:card" content="summary_large_image">';
  return h;
}