# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-commerce-flow.spec.ts >> E2E: Módulo Stream Sell no SLL Hub >> deve acessar o módulo Stream Sell com sessão autenticada
- Location: e2e\live-commerce-flow.spec.ts:27:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/dashboard\/modules\/stream-sell/
Received string:  "http://localhost:5173/auth"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    4 × locator resolved to <html lang="pt-BR">…</html>
      - unexpected value "http://localhost:5173/dashboard/modules/live-commerce"
    10 × locator resolved to <html lang="pt-BR">…</html>
       - unexpected value "http://localhost:5173/auth"

```

```yaml
- img "SLL Hub"
- heading "Entrar" [level=2]
- textbox "E-mail"
- textbox "Senha"
- button "Entrar"
- text: ou
- button "Google Entrar com Google":
  - img "Google"
  - text: Entrar com Google
- button "Criar conta"
- contentinfo: "© 2026 SLL Hub. Todos os direitos reservados. DESENVOLVIDO POR: RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00"
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | async function injectAuthenticatedSession(page: any) {
  4  |   const fakeSession = {
  5  |     access_token: 'fake-jwt-token-for-e2e',
  6  |     refresh_token: 'fake-refresh-token',
  7  |     expires_at: Math.floor(Date.now() / 1000) + 3600,
  8  |     expires_in: 3600,
  9  |     token_type: 'bearer',
  10 |     user: {
  11 |       id: '00000000-0000-0000-0000-000000000001',
  12 |       aud: 'authenticated',
  13 |       role: 'authenticated',
  14 |       email: 'lojista.teste@lojalucrativa.com',
  15 |       created_at: new Date().toISOString(),
  16 |       user_metadata: { name: 'Lojista Teste', store_name: 'Loja Conceito' },
  17 |     },
  18 |   };
  19 | 
  20 |   await page.addInitScript((sessionData: any) => {
  21 |     window.localStorage.setItem('sb-flivmllysdhaydhogmhg-auth-token', JSON.stringify(sessionData));
  22 |     window.localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
  23 |   }, fakeSession);
  24 | }
  25 | 
  26 | test.describe('E2E: Módulo Stream Sell no SLL Hub', () => {
  27 |   test('deve acessar o módulo Stream Sell com sessão autenticada', async ({ page }) => {
  28 |     await injectAuthenticatedSession(page);
  29 |     await page.goto('/dashboard/modules/live-commerce');
  30 | 
  31 |     await page.waitForLoadState('domcontentloaded');
  32 | 
  33 |     // Valida se está na rota correta
> 34 |     await expect(page).toHaveURL(/.*\/dashboard\/modules\/stream-sell/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  35 | 
  36 |     // Salva screenshot para validação visual
  37 |     await page.screenshot({ path: 'e2e/screenshots/live-commerce-module.png', fullPage: true });
  38 |     console.log('✅ Tela do módulo Stream Sell carregada com sucesso!');
  39 |   });
  40 | 
  41 |   test('deve acessar a tela de administração de uma live via ID de rota', async ({ page }) => {
  42 |     await injectAuthenticatedSession(page);
  43 |     const mockLiveId = '11111111-1111-1111-1111-111111111111';
  44 |     await page.goto('/dashboard/modules/live-commerce/admin/' + mockLiveId);
  45 | 
  46 |     await page.waitForLoadState('domcontentloaded');
  47 | 
  48 |     // Valida que a rota carregou sem redirecionar para auth
  49 |     await expect(page).not.toHaveURL(/.*\/auth/);
  50 |     await expect(page).toHaveURL(new RegExp('/dashboard/modules/stream-sell/live/' + mockLiveId + '/admin'));
  51 |     console.log('✅ Painel administrativo da Live carregado com sucesso!');
  52 |   });
  53 | });
  54 | 
```