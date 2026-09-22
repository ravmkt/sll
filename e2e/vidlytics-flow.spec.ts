import { test, expect } from '@playwright/test';

// Helper para injetar sessão autenticada no LocalStorage do Supabase
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
    // Grava tanto com a chave do projeto Supabase quanto no padrão genérico
    window.localStorage.setItem('sb-flivmllysdhaydhogmhg-auth-token', JSON.stringify(sessionData));
    window.localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
  }, fakeSession);
}

test.describe('E2E: Módulo Vidlytics no SLL Hub', () => {
  test('deve acessar o Dashboard com sessão autenticada', async ({ page }) => {
    await injectAuthenticatedSession(page);
    await page.goto('/dashboard');

    await page.waitForLoadState('domcontentloaded');

    // Valida se não foi redirecionado para /auth
    await expect(page).not.toHaveURL(/.*\/auth/);
    console.log('✅ Acesso ao Dashboard autenticado com sucesso!');
  });

  test('deve navegar diretamente para a rota do Vidlytics', async ({ page }) => {
    await injectAuthenticatedSession(page);
    await page.goto('/dashboard/modules/vidlytics');

    await page.waitForLoadState('domcontentloaded');

    // Valida que a URL atual é a do Vidlytics
    await expect(page).toHaveURL(/.*\/dashboard\/modules\/vidlytics/);

    // Tira screenshot da tela do Vidlytics carregada
    await page.screenshot({ path: 'e2e/screenshots/vidlytics-module.png', fullPage: true });
    console.log('✅ Tela do módulo Vidlytics carregada com sucesso!');
  });
});
