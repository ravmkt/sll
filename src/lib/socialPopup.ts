const KEY = 'sll_social_popup';

// Fecha a janela de login social (popup) depois que a conexao termina.
// So age se esta janela foi aberta pelo botao Conectar (marca no localStorage).
export function closeSocialPopup(delayMs = 800): boolean {
  try {
    const ts = Number(localStorage.getItem(KEY) || 0);
    if (!ts || Date.now() - ts > 10 * 60 * 1000) return false;
    localStorage.removeItem(KEY);
    window.setTimeout(() => { try { window.close(); } catch { /* ignora */ } }, delayMs);
    return true;
  } catch { return false; }
}