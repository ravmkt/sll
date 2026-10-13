// Numero de suporte (DDI + DDD + numero, so digitos). Pode ser sobrescrito por VITE_SUPPORT_WHATSAPP.
export const SUPPORT_WHATSAPP: string =
  ((import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined) || '5545998370536').replace(/\D/g, '');

export function buildSupportUrl(storeName?: string | null, storeId?: string | null): string {
  const text =
    storeName && storeId
      ? `Olá! Sou da loja ${storeName} (ID: ${storeId}) e preciso de ajuda no SLL Hub.`
      : 'Olá! Preciso de ajuda no SLL Hub.';
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}