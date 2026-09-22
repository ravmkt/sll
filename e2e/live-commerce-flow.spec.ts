import { test, expect } from '@playwright/test';

async function injectAuthenticatedSession(page: any) {
  const fakeSession = {
    access_token: 'fake-jwt-token-for-e2e',
    refresh_token: 'fake-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'lojista.teste@lojalucrativa.com',
      created_at: new Date().toISOString(),
      user_metadata: { name: 'Lojista Teste', store_name: 'Loja Conceito' },
    },
  };

  await page.addInitScript((sessionData: any) => {
    window.localStorage.setItem('sb-flivmllysdhaydhogmhg-auth-token', JSON.stringify(sessionData));
    window.localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
  }, fakeSession);
}

test.describe('E2E: Módulo Live Commerce no SLL Hub', () => {
  test('deve acessar o módulo Live Commerce com sessão autenticada', async ({ page }) => {
    await injectAuthenticatedSession(page);
    await page.goto('/dashboard/modules/live-commerce');

    await page.waitForLoadState('domcontentloaded');

    // Valida se está na rota correta
    await expect(page).toHaveURL(/.*\/dashboard\/modules\/live-commerce/);

    // Salva screenshot para validação visual
    await page.screenshot({ path: 'e2e/screenshots/live-commerce-module.png', fullPage: true });
    console.log('✅ Tela do módulo Live Commerce carregada com sucesso!');
  });

  test('deve acessar a tela de administração de uma live via ID de rota', async ({ page }) => {
    await injectAuthenticatedSession(page);
    const mockLiveId = '11111111-1111-1111-1111-111111111111';
    await page.goto('/dashboard/modules/live-commerce/admin/' + mockLiveId);

    await page.waitForLoadState('domcontentloaded');

    // Valida que a rota carregou sem redirecionar para auth
    await expect(page).not.toHaveURL(/.*\/auth/);
    await expect(page).toHaveURL(new RegExp('/dashboard/modules/live-commerce/admin/' + mockLiveId));
    console.log('✅ Painel administrativo da Live carregado com sucesso!');
  });
});
