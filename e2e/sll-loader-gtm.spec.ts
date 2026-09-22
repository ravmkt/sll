import { test, expect } from '@playwright/test';

test.describe('E2E: SLL Loader & GTM Module Injection', () => {
  const storeIdMock = '00000000-0000-0000-0000-000000000001';

  test('não deve injetar módulos caso nenhum store_id seja fornecido', async ({ page }) => {
    await page.goto('/test-gtm.html');

    // Injeta o script sem data-store-id
    await page.evaluate(() => {
      const s = document.createElement('script');
      s.src = '/sll-loader.js';
      document.head.appendChild(s);
    });

    await page.waitForTimeout(600);

    const vidlyticsScript = page.locator('#sll-script-vidlytics-widget');
    const liveCommerceScript = page.locator('#sll-script-livecommerce-widget');

    await expect(vidlyticsScript).toHaveCount(0);
    await expect(liveCommerceScript).toHaveCount(0);
  });

  test('deve injetar apenas vidlytics-widget.js quando a loja tiver assinatura de Vidlytics', async ({ page }) => {
    await page.route('**/rest/v1/subscriptions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sub-1',
            store_id: storeIdMock,
            status: 'active',
            plans: {
              id: 'plan-1',
              name: 'Vidlytics Pro',
              module_slug: 'vidlytics'
            }
          }
        ])
      });
    });

    await page.goto('/test-gtm.html');

    // Injeta a tag GTM do SLL Loader com o storeId
    await page.evaluate((id) => {
      const s = document.createElement('script');
      s.src = '/sll-loader.js';
      s.setAttribute('data-store-id', id);
      document.head.appendChild(s);
    }, storeIdMock);

    // Aguarda o script do Vidlytics ser injetado no DOM
    const vidlyticsScript = page.locator('#sll-script-vidlytics-widget');
    await expect(vidlyticsScript).toHaveCount(1, { timeout: 4000 });
    await expect(vidlyticsScript).toHaveAttribute('data-store-id', storeIdMock);

    // Live Commerce NÃO deve ser injetado
    const liveCommerceScript = page.locator('#sll-script-livecommerce-widget');
    await expect(liveCommerceScript).toHaveCount(0);
  });

  test('deve injetar apenas livecommerce-widget.js quando a loja tiver assinatura de Live Commerce', async ({ page }) => {
    await page.route('**/rest/v1/subscriptions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sub-2',
            store_id: storeIdMock,
            status: 'active',
            plans: {
              id: 'plan-2',
              name: 'Live Commerce Pro',
              module_slug: 'live_commerce'
            }
          }
        ])
      });
    });

    await page.goto('/test-gtm.html');

    await page.evaluate((id) => {
      const s = document.createElement('script');
      s.src = '/sll-loader.js';
      s.setAttribute('data-store-id', id);
      document.head.appendChild(s);
    }, storeIdMock);

    const liveCommerceScript = page.locator('#sll-script-livecommerce-widget');
    await expect(liveCommerceScript).toHaveCount(1, { timeout: 4000 });
    await expect(liveCommerceScript).toHaveAttribute('data-store-id', storeIdMock);

    const vidlyticsScript = page.locator('#sll-script-vidlytics-widget');
    await expect(vidlyticsScript).toHaveCount(0);
  });

  test('deve injetar ambos os módulos quando a loja possuir plano com ambos ativos', async ({ page }) => {
    await page.route('**/rest/v1/subscriptions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sub-all',
            store_id: storeIdMock,
            status: 'active',
            plans: {
              id: 'plan-all',
              name: 'SLL Combo Completo',
              module_slug: 'all'
            }
          }
        ])
      });
    });

    await page.goto('/test-gtm.html');

    await page.evaluate((id) => {
      const s = document.createElement('script');
      s.src = '/sll-loader.js';
      s.setAttribute('data-store-id', id);
      document.head.appendChild(s);
    }, storeIdMock);

    const vidlyticsScript = page.locator('#sll-script-vidlytics-widget');
    const liveCommerceScript = page.locator('#sll-script-livecommerce-widget');

    await expect(vidlyticsScript).toHaveCount(1, { timeout: 4000 });
    await expect(liveCommerceScript).toHaveCount(1, { timeout: 4000 });
  });
});
