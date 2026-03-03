import { test, expect } from '@playwright/test';

test.describe('ランディングページ', () => {
  test('トップページが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FinOps/i);
  });

  test('ログインページへ遷移できる', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /ログイン/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe('ログインページ', () => {
  test('ログインフォームが表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ログイン')).toBeVisible();
  });

  test('LINEログインボタンが表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('LINEでログイン')).toBeVisible();
  });

  test('メールログインモードに切り替えできる', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('メールアドレスでログイン').click();
    await expect(page.getByPlaceholder('your@company.co.jp')).toBeVisible();
  });

  test('新規登録リンクが表示される', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /新規登録/i });
    await expect(registerLink).toBeVisible();
  });
});

test.describe('ダッシュボード（デモモード）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByText('デモ環境にアクセス').click();
    await page.waitForURL(/\/dashboard/);
  });

  test('ダッシュボードが表示される', async ({ page }) => {
    await expect(page.getByText('FinOps')).toBeVisible();
  });

  const sidebarItems = [
    { label: 'ダッシュボード', url: '/dashboard' },
    { label: 'クラウドアカウント', url: '/dashboard/accounts' },
    { label: 'リソース管理', url: '/dashboard/resources' },
    { label: 'Night-Watch', url: '/dashboard/schedules' },
    { label: 'コスト分析', url: '/dashboard/costs' },
    { label: 'レポート', url: '/dashboard/reports' },
    { label: 'LINE通知', url: '/dashboard/notifications' },
    { label: '請求管理', url: '/dashboard/billing' },
    { label: '設定', url: '/dashboard/settings' },
  ];

  for (const item of sidebarItems) {
    test(`サイドバー: ${item.label} へナビゲーション`, async ({ page }) => {
      const link = page.locator('aside').getByText(item.label, { exact: false });
      if (await link.isVisible()) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(item.url));
      }
    });
  }
});
