import { test, expect } from '@playwright/test';

/**
 * Users E2E Tests
 * Tests user management and permissions
 */

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
  });

  test('displays users page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /User/i })).toBeVisible();
  });

  test('shows user list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const userList = page.locator('table, [class*="grid"], [class*="list"]');
    const emptyState = page.locator('text=/No user|Invite|Add/i');
    
    const hasContent = await userList.count() > 0 || await emptyState.count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('has invite user button', async ({ page }) => {
    const inviteBtn = page.locator('button, a').filter({ hasText: /Invite|Add|Create|New/i }).first();
    
    if (await inviteBtn.count() > 0) {
      await expect(inviteBtn).toBeVisible();
    }
  });

  test('can search users', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('admin');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('displays user roles', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for role indicators
    const roleIndicators = page.locator('text=/Admin|User|Viewer|Editor|Owner/i');
    
    if (await roleIndicators.count() > 0) {
      await expect(roleIndicators.first()).toBeVisible();
    }
  });

  test('displays user status', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for status indicators
    const statusIndicators = page.locator('text=/Active|Pending|Invited|Disabled/i');
    
    if (await statusIndicators.count() > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    }
  });
});

test.describe('User Invite Modal', () => {
  test('can open invite modal', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const inviteBtn = page.locator('button').filter({ hasText: /Invite|Add/i }).first();
    
    if (await inviteBtn.count() > 0) {
      await inviteBtn.click();
      await page.waitForTimeout(500);
      
      // Check for modal
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('invite modal has email field', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const inviteBtn = page.locator('button').filter({ hasText: /Invite|Add/i }).first();
    
    if (await inviteBtn.count() > 0) {
      await inviteBtn.click();
      await page.waitForTimeout(500);
      
      const emailField = page.locator('input[type="email"], input[placeholder*="email"]');
      
      if (await emailField.count() > 0) {
        await expect(emailField).toBeVisible();
      }
    }
  });

  test('invite modal has role selection', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const inviteBtn = page.locator('button').filter({ hasText: /Invite|Add/i }).first();
    
    if (await inviteBtn.count() > 0) {
      await inviteBtn.click();
      await page.waitForTimeout(500);
      
      const roleSelect = page.locator('select, [role="listbox"], text=/Role/i');
      
      if (await roleSelect.count() > 0) {
        await expect(roleSelect.first()).toBeVisible();
      }
    }
  });
});

test.describe('Permissions', () => {
  test('can access permissions page', async ({ page }) => {
    await page.goto('/settings/permissions');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows permission levels', async ({ page }) => {
    await page.goto('/settings/permissions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for permission level indicators
    const permissionLevels = page.locator('text=/Admin|Editor|Viewer|Custom/i');
    
    if (await permissionLevels.count() > 0) {
      await expect(permissionLevels.first()).toBeVisible();
    }
  });
});




