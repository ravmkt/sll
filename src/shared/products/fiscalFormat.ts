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

// CFOP: 4 digitos; o primeiro indica a operacao (1,2,3 entrada; 5,6,7 saida). Vazio vale (usa o padrao da loja).
export const isValidCfop = (v?: string | null): boolean => {
  const d = onlyDigits(v);
  return d === '' || (d.length === 4 && /^[123567]/.test(d));
};

export const formatCfop = (v?: string | null): string => onlyDigits(v).slice(0, 4);
