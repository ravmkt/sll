import { test, expect } from '@playwright/test';

test.describe('E2E: Fluxo de Autenticação (SLL Hub)', () => {
  test('deve redirecionar usuário não autenticado para /auth ao acessar a raiz', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/auth');
    expect(page.url()).toContain('/auth');
  });

  test('deve renderizar o formulário de login com campos de e-mail, senha e botão entrar', async ({ page }) => {
    await page.goto('/auth');

    // Valida os campos do formulário
    const emailInput = page.locator('input[placeholder="E-mail"]');
    const passwordInput = page.locator('input[placeholder="Senha"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('Entrar');
  });

  test('deve alternar entre modo de Login e Criar Conta', async ({ page }) => {
    await page.goto('/auth');

    // Clica para alternar para "Criar conta"
    const toggleButton = page.locator('button:has-text("Criar conta")').last();
    await toggleButton.click();

    // Valida se os campos adicionais de cadastro apareceram
    await expect(page.locator('input[placeholder="Nome completo"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Nome da loja"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirmar Senha"]')).toBeVisible();

    // O botão principal agora deve exibir "Criar conta"
    await expect(page.locator('button[type="submit"]')).toHaveText('Criar conta');
  });
});
