type Mod = { slug: string; name: string; status: string };

// Ativo (contratado) > Disponivel > Em breve; desempate A-Z
export function sortModules<T extends Mod>(list: T[], owned: string[]): T[] {
  const rank = (m: T) => (owned.includes(m.slug) ? 0 : m.status === 'coming_soon' ? 2 : 1);
  return [...list].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );
}