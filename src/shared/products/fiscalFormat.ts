export const onlyDigits = (v?: string | null): string => (v ?? '').replace(/\D/g, '');

export const isValidNcm = (v?: string | null): boolean => onlyDigits(v).length === 8;

// CEST e opcional: vazio vale; preenchido precisa de 7 digitos
export const isValidCest = (v?: string | null): boolean => {
  const d = onlyDigits(v);
  return d === '' || d.length === 7;
};

export const formatNcm = (v?: string | null): string => {
  const d = onlyDigits(v).slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join('.');
};

export const formatCest = (v?: string | null): string => {
  const d = onlyDigits(v).slice(0, 7);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7)].filter(Boolean).join('.');
};