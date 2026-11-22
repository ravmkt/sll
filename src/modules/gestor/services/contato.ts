/** Link do WhatsApp (wa.me) com DDI 55. Retorna null se o telefone não for válido. */
export function whatsappLink(phone: string | null | undefined): string | null {
  let d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (d.length < 12 || d.length > 13) return null;
  return 'https://wa.me/' + d;
}

/** Link mailto. Retorna null se o e-mail não for válido. */
export function mailLink(email: string | null | undefined): string | null {
  const e = (email ?? '').trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? 'mailto:' + e : null;
}