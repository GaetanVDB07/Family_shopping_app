import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || !/127\.0\.0\.1|localhost/.test(supabaseUrl)) {
  throw new Error('Release E2E tests require local Supabase and its service-role key.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test.describe.serial('mobile release flow', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `release-${runId}@example.invalid`;
  const password = 'Release-Test-2026!';
  const familyName = `Release Family ${runId}`;
  const itemName = `E2E Melk ${runId}`;
  let userId = '';

  test.beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Release Test' },
    });
    if (error) throw error;
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (!userId) return;
    await admin.from('families').delete().eq('created_by', userId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('login, family setup, list changes, settings, and logout', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Wachtwoord').fill(password);
    await page.getByRole('button', { name: 'Inloggen' }).click();

    await expect(page.getByRole('heading', { name: 'Familie Setup' })).toBeVisible();
    await page.getByLabel('Familie Naam').fill(familyName);
    await page.getByRole('button', { name: 'Familie Aanmaken' }).click();

    await expect(page).toHaveURL(/\/families$/, { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: 'Mijn Families' })).toBeVisible();
    await expect(page.getByText(familyName, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Boodschappenlijst' }).click();

    await expect(page.getByRole('heading', { name: familyName })).toBeVisible();
    await page.getByPlaceholder('Voeg een item toe...').fill(itemName);
    await page.getByRole('button', { name: `Voeg ${itemName} toe` }).click();
    await expect(page.getByText(itemName, { exact: true })).toBeVisible();

    const toggleResponse = page.waitForResponse((response) => (
      response.request().method() === 'PATCH'
      && /\/api\/grocery-items\/\d+$/.test(new URL(response.url()).pathname)
      && response.ok()
    ));
    await page.getByRole('button', { name: `${itemName} afvinken` }).dispatchEvent('click');
    await toggleResponse;
    await expect(page).toHaveURL(/\/grocery-list\//);
    await expect(page.getByRole('button', { name: `${itemName} opnieuw kopen` })).toBeVisible();

    await page.getByRole('button', { name: 'Menu openen' }).click();
    await page.getByRole('menuitem', { name: 'Instellingen' }).click();
    await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible();
    await page.getByRole('button', { name: 'Uitloggen' }).click();
    await expect(page.getByRole('button', { name: 'Inloggen' })).toBeVisible();

    expect(browserErrors).toEqual([]);
  });
});
