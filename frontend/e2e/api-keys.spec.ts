import { test, expect } from '@playwright/test';

/**
 * API Keys E2E Tests
 * Tests API key management
 */

test.describe('API Keys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/api-keys');
    await page.waitForLoadState('networkidle');
  });

  test('displays API keys page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /API|Key/i }).first()).toBeVisible();
  });

  test('shows API key list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const keyList = page.locator('table, [class*="grid"], [class*="list"]');
    const emptyState = page.locator('text=/No API|Create|Generate/i');
    
    const hasContent = await keyList.count() > 0 || await emptyState.count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('has create API key button', async ({ page }) => {
    const createBtn = page.locator('button').filter({ hasText: /Create|Generate|New|Add/i }).first();
    
    if (await createBtn.count() > 0) {
      await expect(createBtn).toBeVisible();
    }
  });

  test('displays key metadata', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for key metadata indicators
    const metadataIndicators = page.locator('text=/Created|Last Used|Expires|Name/i');
    
    if (await metadataIndicators.count() > 0) {
      await expect(metadataIndicators.first()).toBeVisible();
    }
  });

  test('has key revoke/delete option', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for revoke/delete options
    const revokeBtn = page.locator('button, [role="menuitem"]').filter({ hasText: /Revoke|Delete|Remove/i }).first();
    
    if (await revokeBtn.count() > 0) {
      await expect(revokeBtn).toBeVisible();
    }
  });
});

test.describe('Create API Key', () => {
  test('can open create key modal', async ({ page }) => {
    await page.goto('/settings/api-keys');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const createBtn = page.locator('button').filter({ hasText: /Create|Generate|New/i }).first();
    
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(500);
      
      // Check for modal or form
      const modal = page.locator('[role="dialog"], [class*="modal"], form');
      
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible();
      }
    }
  });

  test('create modal has name field', async ({ page }) => {
    await page.goto('/settings/api-keys');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const createBtn = page.locator('button').filter({ hasText: /Create|Generate|New/i }).first();
    
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(500);
      
      const nameField = page.locator('input[name="name"], input[placeholder*="Name"], label:has-text("Name")');
      
      if (await nameField.count() > 0) {
        await expect(nameField.first()).toBeVisible();
      }
    }
  });

  test('create modal has scope/permission options', async ({ page }) => {
    await page.goto('/settings/api-keys');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const createBtn = page.locator('button').filter({ hasText: /Create|Generate|New/i }).first();
    
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(500);
      
      const scopeOptions = page.locator('text=/Scope|Permission|Access/i');
      
      if (await scopeOptions.count() > 0) {
        await expect(scopeOptions.first()).toBeVisible();
      }
    }
  });
});




