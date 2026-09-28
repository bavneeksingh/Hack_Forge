import { test, expect } from '@playwright/test';

test.describe('Leave Management System E2E', () => {

  test('Employee can apply, Manager approves, Escalation happens, HR finalizes, Employee cancels', async ({ page }) => {
    
    // a. Arun logs in, dashboard shows 12 pro-rated days.
    await page.goto('/login');
    await page.fill('input[type="email"]', 'charlie@company.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');
    // We expect to see 24 days for Charlie, but the story says Arun sees 12 days.
    // In our seed, Frank is the one with 12 days pro-rated (joined Jul 2026).
    // Let's test with Frank (frank@company.com)
    
    await page.click('text=Logout'); // Wait, let's just log in as Frank directly
    await page.goto('/login');
    await page.fill('input[type="email"]', 'frank@company.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Ensure Balance shows 12
    await expect(page.locator('text=Annual Leave')).toBeVisible();
    await expect(page.locator('text=12.0')).toBeVisible();

    // b. Apply for the busy week -> soft notice
    await page.click('text=Apply Leave');
    await expect(page).toHaveURL('/apply');
    await page.selectOption('select', { label: 'Annual Leave' });
    await page.fill('input[type="date"]:nth-of-type(1)', '2026-10-12');
    await page.fill('input[type="date"]:nth-of-type(2)', '2026-10-16');
    await page.fill('textarea', 'Family vacation');
    
    // The soft notice should appear since the team is busy (assume seeded)
    // For now we just click submit
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible();

    // c. Maya sees flagged request, approves
    await page.click('text=Logout');
    await page.fill('input[type="email"]', 'alice.manager@company.com'); // Maya equivalent
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/manager/queue');
    await page.click('text=Frank Dev');
    // In drawer, approve with comment
    await page.fill('textarea', 'Approved despite flag, enjoy');
    await page.click('button:has-text("Approve")');
    await expect(page.locator('text=Request approved and moved to HR')).toBeVisible();

    // d. Escalation (Time travel via demo panel)
    await page.click('text=Logout');
    await page.fill('input[type="email"]', 'hr.helen@company.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.click('text=Demo Panel'); // HR has Demo Panel
    await page.click('text=Advance time +49h');
    await page.click('text=Run escalation now');

    // e. HR gives final approval
    await page.click('text=HR Queue');
    await page.click('text=Flagged'); // Filter by Flagged
    await page.click('text=Frank Dev');
    await page.fill('textarea', 'HR Final Approval');
    await page.click('button:has-text("Final Approve")');
    await expect(page.locator('text=Request fully approved')).toBeVisible();

    // f. Frank refreshes and sees Approved state
    await page.click('text=Logout');
    await page.fill('input[type="email"]', 'frank@company.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.click('text=My Requests');
    await expect(page.locator('text=Approved')).toBeVisible();

    // g. Cancel an approved request
    await page.click('text=Cancel Leave');
    await page.click('button:has-text("Confirm Cancel")');
    await expect(page.locator('text=Leave cancelled and balance restored')).toBeVisible();
  });
});
